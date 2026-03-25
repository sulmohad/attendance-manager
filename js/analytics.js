function renderAnalytics() {
  if (!CU || CU.role!=='admin') return;

  // ── فلتر المجموعة في Analytics ─────────────────────────
  const d = load();
  const allGroups = {};
  loadShared().users.forEach(u => {
    const p = loadPersonal(u.username);
    Object.keys(p.groups || {}).forEach(gid => { allGroups[gid] = true; });
  });
  const groupKeys = Object.keys(allGroups);
  const anFilterEl = document.getElementById('anGroupFilter');
  if (anFilterEl && groupKeys.length > 1) {
    if (!anFilterEl._built) {
      anFilterEl.innerHTML = '<option value="">All Groups</option>' +
        groupKeys.map(g => `<option value="${g}">${g}</option>`).join('');
      anFilterEl._built = true;
      anFilterEl.style.display = 'inline-block';
    }
  } else if (anFilterEl) {
    anFilterEl.style.display = 'none';
  }
  const selectedGroup = anFilterEl ? anFilterEl.value : '';

  const allSessions = loadAllSessions();
  const sessions = selectedGroup
    ? allSessions.filter(s => s.groupId === selectedGroup)
    : allSessions;
  const N = sessions.length;

  // Core aggregates
  const totalEscaped = sessions.reduce((a,s)=>a+s.escaped,0);
  const totalExcused = sessions.reduce((a,s)=>a+s.excused,0);
  const avgAccuracy  = N ? Math.round(sessions.reduce((a,s)=>a+s.accuracy,0)/N) : 0;

  // Manual errors = Staff Error (removalNote) + non-medical excuses
  let manualErrors = 0;
  sessions.forEach(s=>{
    if (!s.studentDetails) return;
    s.studentDetails.forEach(sd=>{
      if (sd.removalNote) manualErrors++;
      else if (sd.status==='Excused' && !_isMedicalExcuse(sd.excuseReason||'')) manualErrors++;
    });
  });

  // Medical-only excuses (shown as "مأذون مشروع")
  let medicalExcused = 0;
  sessions.forEach(s=>{
    if (!s.studentDetails) return;
    s.studentDetails.forEach(sd=>{
      if (sd.status==='Excused' && _isMedicalExcuse(sd.excuseReason||'')) medicalExcused++;
    });
  });

  // Timer: only sessions that actually used it
  const timedSess = sessions.filter(s=>(s.timerSecs||0)>0);
  const totalMins = Math.round(timedSess.reduce((a,s)=>a+(s.timerSecs||0),0)/60);
  const hasTimer  = timedSess.length > 0;

  // Hero stats
  const accEl = document.getElementById('aAccuracy');
  if (accEl) {
    accEl.textContent = N ? avgAccuracy+'%' : '—';
    accEl.style.color = avgAccuracy>=90?'var(--green)':avgAccuracy>=85?'var(--yellow)':'var(--red)';
  }
  const _set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  _set('aSessions', N);
  _set('aEscaped', totalEscaped);
  _set('aManualErrors', manualErrors);
  _set('aExcused', medicalExcused || totalExcused);
  _set('adSessions', N);

  // ROI
  const hrs     = hasTimer ? (totalMins/60).toFixed(1) : null;
  const perHour = hrs && parseFloat(hrs)>0 ? (totalEscaped/parseFloat(hrs)).toFixed(1) : null;
  _set('roiTime',    hrs ? hrs+'h' : 'لم يُسجَّل');
  _set('roiPerHour', perHour || (hasTimer ? '0.0' : 'N/A'));
  _set('roiWasted',  manualErrors);

  // Verdict scorecard
  const verdictEl = document.getElementById('roiVerdict');
  if (verdictEl) {
    if (!N) {
      verdictEl.innerHTML='<div style="font-size:0.78rem;color:var(--text3);text-align:center;padding:14px;">لا توجد جلسات مسجلة بعد. ابدأ التسجيل لبناء التحليلات.</div>';
    } else {
      const isGood   = avgAccuracy >= 90;
      const catchRate= perHour ? parseFloat(perHour) : 0;
      // Core logic: does manual cause more harm (errors on students) than benefit (escaped)?
      // manualErrors = students wrongly marked absent (Staff Error + non-medical excuse)
      // totalEscaped  = students caught by manual that electronic missed
      const netBenefit = totalEscaped - manualErrors; // positive = manual helps, negative = manual hurts
      let cls, icon, decisionAr, decisionEn;
      if (manualErrors > totalEscaped) {
        // Manual harms more students than it catches — clear case for removal
        cls='vd-pass'; icon='✅';
        decisionAr=`التحضير اليدوي أضرّ بـ ${manualErrors} طالب مقابل اصطياد ${totalEscaped} فقط — الضرر أكبر من الفائدة. يُنصح بإلغاء التحضير اليدوي.`;
        decisionEn=`Manual process harmed ${manualErrors} students vs. catching ${totalEscaped} — net negative impact. Recommend removing manual attendance.`;
      } else if (manualErrors === 0 && totalEscaped === 0) {
        // No harm, no benefit — only cost is staff time
        cls='vd-pass'; icon='✅';
        decisionAr=`لا ضرر ولا فائدة يدوية مقاسة — التكلفة الوحيدة هي وقت الموظفين (${hrs ? hrs+'h' : 'غير مسجّل'}). النظام الإلكتروني كافٍ.`;
        decisionEn=`No measurable harm or benefit from manual — only cost is staff time. Electronic system is self-sufficient.`;
      } else if (totalEscaped > manualErrors) {
        // Manual catches more than it harms — but check if accuracy is already high
        if (isGood) {
          cls='vd-warn'; icon='⚠️';
          decisionAr=`اليدوي يصطاد ${totalEscaped} مهرّباً مقابل ${manualErrors} خطأ على الطلاب — فائدة بسيطة لكن بتكلفة بشرية. راجع قبل الإلغاء.`;
          decisionEn=`Manual catches ${totalEscaped} vs. ${manualErrors} errors — marginal benefit with human cost. Review before removing.`;
        } else {
          cls='vd-warn'; icon='⚠️';
          decisionAr=`اليدوي يصطاد ${totalEscaped} لكن دقة الإلكتروني (${avgAccuracy}%) أقل من المأمول. راجع جودة بيانات SAS أولاً.`;
          decisionEn=`Manual catches ${totalEscaped} but electronic accuracy (${avgAccuracy}%) needs improvement. Review SAS data quality first.`;
        }
      } else {
        // manualErrors == totalEscaped — break even, staff time is pure waste
        cls='vd-warn'; icon='⚠️';
        decisionAr=`اليدوي يصطاد ${totalEscaped} ويُخطئ بحق ${manualErrors} — نتيجة صفرية، لكن التكلفة الزمنية حقيقية.`;
        decisionEn=`Manual catches ${totalEscaped} and introduces ${manualErrors} errors — net zero, but staff time is real cost.`;
      }
      const timeStr = hrs ? `<strong>${hrs} ساعة</strong>` : '<strong>وقت غير مسجّل</strong>';
      const catchStr= perHour ? `<strong>${perHour}</strong> مهرّب/ساعة` : '<strong>التايمر لم يُستخدم</strong>';
      const netColor= netBenefit < 0 ? 'var(--green)' : netBenefit > 0 ? 'var(--red)' : 'var(--text3)';
      const netLabel= netBenefit < 0 ? `ضرر صافٍ: ${Math.abs(netBenefit)} طالب تضرّر بدون مبرر` :
                      netBenefit > 0 ? `فائدة صافية: ${netBenefit} مهرّب إضافي مقارنة بالأخطاء` :
                      'توازن: الاصطياد = الأخطاء';
      const errStr = `<strong>${manualErrors}</strong> خطأ (Staff Error + عذر غير طبي)`;
      verdictEl.innerHTML=`
        <div class="verdict-grid">
          <div class="verdict-item"><div class="verdict-icon">⏱</div>
            <div class="verdict-body"><strong>وقت الموظفين</strong>${timeStr} على الحضور اليدوي في ${N} جلسة.</div></div>
          <div class="verdict-item"><div class="verdict-icon">🏃</div>
            <div class="verdict-body"><strong>الاصطياد</strong>رُصد <strong>${totalEscaped}</strong> مهرّب بالشبكة اليدوية (${catchStr}).</div></div>
          <div class="verdict-item"><div class="verdict-icon">❌</div>
            <div class="verdict-body"><strong>الضرر على الطلاب</strong>${errStr} — طلاب تضرّروا من اليدوي.</div></div>
        </div>
        <div style="margin:10px 0 12px;padding:9px 13px;background:var(--surface2);border-radius:var(--r);font-size:0.78rem;display:flex;align-items:center;gap:8px;">
          <span>⚖️</span>
          <span>الحصيلة الصافية: اصطياد <strong>${totalEscaped}</strong> − ضرر <strong>${manualErrors}</strong> = <strong style="color:${netColor};">${netBenefit >= 0 ? '+' : ''}${netBenefit}</strong> &nbsp;·&nbsp; <span style="color:${netColor};">${netLabel}</span></span>
        </div>
        <div class="verdict-decision ${cls}">${icon} ${decisionAr}<span style="font-size:0.68rem;opacity:0.7;display:block;margin-top:3px;">${decisionEn}</span></div>`;
    }
  }

  // Charts & absentees
  if (N) {
    _renderAnalyticsCharts(sessions);
    _renderTopAbsentees(sessions);
    _populateSessionFilter(sessions);
  } else {
    ['chartAccCourse','chartTypes','chartTrend','chartEscaped'].forEach(id=>_dC(id));
    const abEl=document.getElementById('topAbsenteesList');
    if(abEl) abEl.innerHTML='<div style="font-size:0.75rem;color:var(--text3);text-align:center;padding:20px 0;">لا توجد بيانات بعد</div>';
  }

  renderSessionsTable();
}

function _renderAnalyticsCharts(sessions) {
  const C = {green:'#22c55e',yellow:'#eab308',red:'#ef4444',blue:'#3b82f6',cyan:'#06b6d4',purple:'#a855f7',orange:'#f97316'};

  // 1. Accuracy per course (vertical bar)
  const byCourse = {};
  sessions.forEach(s=>{ if(!byCourse[s.courseCode]){byCourse[s.courseCode]={sum:0,n:0};} byCourse[s.courseCode].sum+=s.accuracy; byCourse[s.courseCode].n++; });
  const cLabels = Object.keys(byCourse);
  const cVals   = cLabels.map(k=>Math.round(byCourse[k].sum/byCourse[k].n));
  const cColors = cVals.map(v=>v>=90?C.green:v>=85?C.yellow:C.red);
  _dC('chartAccCourse');
  const el1=document.getElementById('chartAccCourse');
  if(el1) _aC['chartAccCourse']=new Chart(el1,{type:'bar',
    data:{labels:cLabels,datasets:[{data:cVals,backgroundColor:cColors,borderRadius:4,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`الدقة: ${c.parsed.y}%`}}},
      scales:{y:{min:0,max:100,ticks:{color:'#64748b',callback:v=>v+'%',font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}},
              x:{ticks:{color:'#94a3b8',font:{size:10}},grid:{display:false}}}}});

  // 2. Session types donut
  const nManual=sessions.filter(s=>!s.electronicOnly&&!s.lateManual).length;
  const nElec  =sessions.filter(s=>s.electronicOnly).length;
  const nLate  =sessions.filter(s=>s.lateManual).length;
  _dC('chartTypes');
  const el2=document.getElementById('chartTypes');
  if(el2) _aC['chartTypes']=new Chart(el2,{type:'doughnut',
    data:{labels:['يدوي + إلكتروني','إلكتروني فقط','يدوي فقط'],
          datasets:[{data:[nManual,nElec,nLate],backgroundColor:[C.green,C.blue,C.purple],borderWidth:2,borderColor:'#0f1520',hoverOffset:4}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'63%',
      plugins:{legend:{display:true,position:'bottom',labels:{color:'#94a3b8',font:{size:10},padding:8,boxWidth:10}},
               tooltip:{callbacks:{label:c=>`${c.label}: ${c.parsed} جلسة`}}}}});

  // 3. Accuracy trend (line)
  const sorted=[...sessions].sort((a,b)=>a.date.localeCompare(b.date));
  const tLabels=sorted.map((s,i)=>`#${i+1} ${s.courseCode}`);
  const tVals  =sorted.map(s=>s.accuracy);
  const tPtColors=tVals.map(v=>v>=90?C.green:v>=85?C.yellow:C.red);
  _dC('chartTrend');
  const el3=document.getElementById('chartTrend');
  if(el3) _aC['chartTrend']=new Chart(el3,{type:'line',
    data:{labels:tLabels,datasets:[
      {label:'الدقة %',data:tVals,borderColor:C.blue,backgroundColor:'rgba(59,130,246,0.07)',pointBackgroundColor:tPtColors,pointRadius:5,pointHoverRadius:7,tension:0.35,fill:true},
      {label:'الهدف 90%',data:tLabels.map(()=>90),borderColor:'rgba(34,197,94,0.35)',borderDash:[5,4],borderWidth:1.5,pointRadius:0,fill:false}
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.dataset.label==='الهدف 90%'?'الهدف: 90%':`الدقة: ${c.parsed.y}%`}}},
      scales:{y:{min:Math.max(0,Math.min(...tVals)-10),max:100,ticks:{color:'#64748b',callback:v=>v+'%',font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}},
              x:{ticks:{color:'#94a3b8',font:{size:10},maxRotation:30},grid:{display:false}}}}});

  // 4. Escaped per course (horizontal bar)
  const escMap={};
  sessions.forEach(s=>{ escMap[s.courseCode]=(escMap[s.courseCode]||0)+s.escaped; });
  const eLabels=Object.keys(escMap).sort((a,b)=>escMap[b]-escMap[a]);
  const eVals  =eLabels.map(k=>escMap[k]);
  _dC('chartEscaped');
  const el4=document.getElementById('chartEscaped');
  if(el4) _aC['chartEscaped']=new Chart(el4,{type:'bar',
    data:{labels:eLabels,datasets:[{data:eVals,backgroundColor:C.yellow,borderRadius:4,borderSkipped:false}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`المهرّبون: ${c.parsed.x}`}}},
      scales:{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}},
              y:{ticks:{color:'#94a3b8',font:{size:10}},grid:{display:false}}}}});
}

function _renderTopAbsentees(sessions) {
  const map={};
  sessions.forEach(s=>{
    if(!s.studentDetails) return;
    s.studentDetails.forEach(sd=>{
      if(sd.status==='Present') return;
      if(!map[sd.campusId]) map[sd.campusId]={count:0,courses:new Set(),name:sd.campusId};
      map[sd.campusId].count++;
      map[sd.campusId].courses.add(s.courseCode);
    });
  });
  const d=load();
  // البحث عن الأسماء في كل المجموعات
  const allCoursesForNames = {};
  if (d.groups) { Object.values(d.groups).forEach(g => Object.assign(allCoursesForNames, g.courses||{})); }
  else { Object.assign(allCoursesForNames, d.courses||{}); }
  Object.values(allCoursesForNames).forEach(c=>{ (c.students||[]).forEach(stu=>{ if(map[stu.campusId]) map[stu.campusId].name=stu.name; }); });
  const top=Object.entries(map).sort((a,b)=>b[1].count-a[1].count).slice(0,10);
  const max=top.length?top[0][1].count:1;
  const el=document.getElementById('topAbsenteesList'); if(!el) return;
  if(!top.length){ el.innerHTML='<div style="font-size:0.75rem;color:var(--text3);text-align:center;padding:20px 0;">لا توجد بيانات بعد</div>'; return; }
  const barColor=(i)=>i===0?'#ef4444':i<3?'#eab308':'#64748b';
  el.innerHTML='<div class="ab-list">'+top.map(([id,info],i)=>`
    <div class="ab-row" onclick="jumpToStudentAn('${id}')">
      <div class="ab-rank">${i+1}</div>
      <div style="flex:1;min-width:0;"><div class="ab-name">${info.name!==id?info.name:id}</div>
        <div class="ab-meta">${id} · ${[...info.courses].join(', ')}</div></div>
      <div class="ab-bar-wrap"><div class="ab-bar" style="width:${Math.round((info.count/max)*100)}%;background:${barColor(i)};"></div></div>
      <div class="ab-count">${info.count}</div>
    </div>`).join('')+'</div>';
}

function jumpToStudentAn(campusId) {
  showPage('students');
  setTimeout(()=>{ const si=document.getElementById('studentSearch'); if(si){si.value=campusId;si.dispatchEvent(new Event('input'));} },200);
}

function _populateSessionFilter(sessions) {
  const sel=document.getElementById('slFilterCourse'); if(!sel) return;
  const courses=[...new Set(sessions.map(s=>s.courseCode))].sort();
  const cur=sel.value;
  sel.innerHTML='<option value="">كل المواد</option>'+courses.map(c=>`<option value="${c}"${c===cur?' selected':''}>${c}</option>`).join('');
}

function renderSessionsTable() {
  const tbody=document.getElementById('sessionsBody'); if(!tbody) return;
  const allRows=loadAllSessions();
  const fCourse=(document.getElementById('slFilterCourse')?.value||'');
  const fType  =(document.getElementById('slFilterType')?.value||'');
  const fStaff =(document.getElementById('slFilterStaff')?.value||'').toLowerCase();
  const fGroup =(document.getElementById('anGroupFilter')?.value||'');
  // فلترة بالمجموعة أولاً
  const sessions = fGroup ? allRows.filter(s => s.groupId === fGroup) : allRows;
  let rows=[...sessions].sort((a,b)=>b.date.localeCompare(a.date));
  if(fCourse) rows=rows.filter(s=>s.courseCode===fCourse);
  if(fType==='manual') rows=rows.filter(s=>!s.electronicOnly&&!s.lateManual);
  if(fType==='elec')   rows=rows.filter(s=>s.electronicOnly);
  if(fType==='late')   rows=rows.filter(s=>s.lateManual);
  if(fStaff)           rows=rows.filter(s=>s.staff.toLowerCase().includes(fStaff));
  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="11" class="empty">${sessions.length?'لا توجد جلسات تطابق الفلتر':'لا توجد جلسات مسجلة بعد'}</td></tr>`;
    return;
  }
  const modeTag=s=>s.lateManual?`<span class="mode-pill mp-late">📋 يدوي فقط</span>`:s.electronicOnly?`<span class="mode-pill mp-elec">⚡ إلكتروني</span>`:`<span class="mode-pill mp-manual">✅ يدوي+إلكتروني</span>`;
  const errCount=s=>s.studentDetails?s.studentDetails.filter(sd=>sd.removalNote||(sd.status==='Excused'&&!_isMedicalExcuse(sd.excuseReason||''))).length:0;
  const accColor=v=>v>=90?'var(--green)':v>=85?'var(--yellow)':'var(--red)';
  const tip=s=>s.manualReason||s.lateManualReason||s.elecOtherReason||'';
  tbody.innerHTML=rows.map(s=>{
    const err=errCount(s);
    return `<tr>
      <td style="font-family:var(--mono);font-size:0.72rem;">${s.date}</td>
      <td><span class="badge b-blue" style="font-size:0.68rem;">${s.courseCode}</span></td>
      <td style="font-size:0.75rem;">${s.staff}</td>
      <td style="text-align:center;">${s.total}</td>
      <td style="text-align:center;color:var(--text3);">${s.electronicAbsent}</td>
      <td style="text-align:center;">${s.manualAbsent}</td>
      <td style="text-align:center;color:var(--yellow);">${s.escaped}</td>
      <td style="text-align:center;color:var(--cyan);">${s.excused}</td>
      <td style="text-align:center;color:var(--green);">${s.notRegistered}</td>
      <td style="text-align:center;font-weight:600;color:${accColor(s.accuracy)};">${s.accuracy}%${err?`<div style="font-size:0.6rem;color:var(--red);font-weight:400;">${err} خطأ</div>`:''}</td>
      <td title="${tip(s)}">${modeTag(s)}${tip(s)?`<div style="font-size:0.62rem;color:var(--text3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">${tip(s)}</div>`:''}</td>
    </tr>`;}).join('');
}

// ── Export Dialog ─────────────────────────────────────────
function openExportDialog() {
  const sessions = loadAllSessions();
  if (!sessions.length) { alert('لا توجد جلسات للتصدير.'); return; }
  document.getElementById('exportDialog').classList.add('show');
}
function closeExportDialog() {
  document.getElementById('exportDialog').classList.remove('show');
}

function runExport() {
  const sessions = loadAllSessions();
  if (!sessions.length) { closeExportDialog(); return; }

  const inclSessions  = document.getElementById('expSheetSessions').checked;
  const inclROI       = document.getElementById('expSheetROI').checked;
  const inclAbsentees = document.getElementById('expSheetAbsentees').checked;
  const fields = {};
  document.querySelectorAll('.expField').forEach(cb => { fields[cb.value] = cb.checked; });

  if (!inclSessions && !inclROI && !inclAbsentees) { alert('اختر شيتاً واحداً على الأقل.'); return; }

  const wb = XLSX.utils.book_new();

  if (inclSessions) {
    const rows = sessions.map(s => {
      const staffErrors   = s.studentDetails ? s.studentDetails.filter(sd=>sd.removalNote).length : 0;
      const nonMedExcused = s.studentDetails ? s.studentDetails.filter(sd=>sd.status==='Excused'&&!_isMedicalExcuse(sd.excuseReason||'')).length : 0;
      const medExcused    = s.studentDetails ? s.studentDetails.filter(sd=>sd.status==='Excused'&&_isMedicalExcuse(sd.excuseReason||'')).length : 0;
      const modeStr       = s.lateManual?'Manual Only':s.electronicOnly?'Electronic Only':'Manual + Electronic';
      const row = { 'التاريخ / Date': s.date, 'الوقت / Time': s.time, 'المادة / Course': s.courseCode };
      if (fields.staff)       row['الموظف / Staff']                  = s.staff;
      row['إجمالي الطلاب / Total']                                    = s.total;
      row['غياب إلكتروني / Elec Absent']                              = s.electronicAbsent;
      row['غياب يدوي / Manual Absent']                                = s.manualAbsent;
      if (fields.escaped)     row['مهرّب / Escaped']                  = s.escaped;
      if (fields.excused) {
        row['مأذون (طبي) / Excused Medical']                          = medExcused;
        row['مأذون (غير طبي) / Excused Other']                        = nonMedExcused;
      }
      row['غير مسجّل / Not Registered']                               = s.notRegistered;
      if (fields.accuracy)    row['دقة إلكتروني % / Accuracy %']     = s.accuracy;
      if (fields.stafferrors) row['أخطاء يدوي / Staff Errors']        = staffErrors;
      if (fields.duration)    row['مدة الجلسة (د) / Duration (min)'] = Math.round((s.timerSecs||0)/60);
      if (fields.mode)        row['نوع الجلسة / Mode']                = modeStr;
      if (fields.reason)      row['السبب / Reason']                   = s.manualReason||s.lateManualReason||s.elecOtherReason||s.note||'';
      return row;
    });
    const ws1 = XLSX.utils.json_to_sheet(rows);
    ws1['!cols'] = Object.keys(rows[0]||{}).map(()=>({wch:16}));
    XLSX.utils.book_append_sheet(wb, ws1, 'Session Details');
  }

  if (inclROI) {
    const N = sessions.length;
    const avgAcc   = N ? Math.round(sessions.reduce((a,s)=>a+s.accuracy,0)/N) : 0;
    const totalEsc = sessions.reduce((a,s)=>a+s.escaped,0);
    let totalManualErrors = 0;
    sessions.forEach(s=>{ if(!s.studentDetails)return;
      s.studentDetails.forEach(sd=>{
        if(sd.removalNote) totalManualErrors++;
        else if(sd.status==='Excused'&&!_isMedicalExcuse(sd.excuseReason||'')) totalManualErrors++;
      });
    });
    const timedSess = sessions.filter(s=>(s.timerSecs||0)>0);
    const totalMins = Math.round(timedSess.reduce((a,s)=>a+(s.timerSecs||0),0)/60);
    const hrs      = timedSess.length ? (totalMins/60).toFixed(1) : 'Not recorded';
    const perHour  = timedSess.length && parseFloat(hrs)>0 ? (totalEsc/parseFloat(hrs)).toFixed(1) : 'N/A';
    const netBen   = totalEsc - totalManualErrors;
    const nManual  = sessions.filter(s=>!s.electronicOnly&&!s.lateManual).length;
    const nElec    = sessions.filter(s=>s.electronicOnly).length;
    const nLate    = sessions.filter(s=>s.lateManual).length;
    const decision = netBen < 0
      ? `يضر أكثر مما ينفع (${Math.abs(netBen)} ضرر صافٍ) / NET NEGATIVE — Recommend removal`
      : netBen===0 && totalEsc===0
      ? `لا فائدة ولا ضرر — وقت الموظفين يُهدر / NO NET VALUE — Staff time wasted`
      : netBen===0
      ? `نتيجة صفرية / BREAK EVEN — No net gain`
      : `فائدة بسيطة — راجع قبل الإلغاء / MARGINAL BENEFIT — Review before removing`;

    const summaryRows = [
      {'المؤشر / Indicator':'── إحصاءات عامة ──────────────────────','القيمة / Value':''},
      {'المؤشر / Indicator':'إجمالي الجلسات / Total Sessions','القيمة / Value':N},
      {'المؤشر / Indicator':'يدوي+إلكتروني / Manual+Electronic','القيمة / Value':nManual},
      {'المؤشر / Indicator':'إلكتروني فقط / Electronic Only','القيمة / Value':nElec},
      {'المؤشر / Indicator':'يدوي فقط / Manual Only','القيمة / Value':nLate},
      {'المؤشر / Indicator':'','القيمة / Value':''},
      {'المؤشر / Indicator':'── كفاءة الإلكتروني ────────────────────','القيمة / Value':''},
      {'المؤشر / Indicator':'متوسط دقة الإلكتروني / Avg Electronic Accuracy %','القيمة / Value':avgAcc+'%'},
      {'المؤشر / Indicator':'','القيمة / Value':''},
      {'المؤشر / Indicator':'── تكلفة التحضير اليدوي ────────────────','القيمة / Value':''},
      {'المؤشر / Indicator':'إجمالي ساعات الموظفين / Total Staff Hours on Manual','القيمة / Value':hrs+(timedSess.length?'h':'')},
      {'المؤشر / Indicator':'مهرّبون مكتشفون (الفائدة) / Escaped Detected (benefit)','القيمة / Value':totalEsc},
      {'المؤشر / Indicator':'معدل الاصطياد / Catch Rate (per hour)','القيمة / Value':perHour},
      {'المؤشر / Indicator':'أخطاء أضرّت بالطلاب (الضرر) / Errors Harming Students (harm)','القيمة / Value':totalManualErrors},
      {'المؤشر / Indicator':'','القيمة / Value':''},
      {'المؤشر / Indicator':'── الحصيلة الصافية ─────────────────────','القيمة / Value':''},
      {'المؤشر / Indicator':'فائدة − ضرر / Net (escaped − errors)','القيمة / Value':(netBen>=0?'+':'')+netBen},
      {'المؤشر / Indicator':'توصية النظام / System Recommendation','القيمة / Value':decision},
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    ws2['!cols'] = [{wch:52},{wch:40}];
    XLSX.utils.book_append_sheet(wb, ws2, 'ROI Summary');
  }

  if (inclAbsentees) {
    const abMap = {};
    sessions.forEach(s=>{
      if(!s.studentDetails) return;
      s.studentDetails.forEach(sd=>{
        if(sd.status==='Present') return;
        if(!abMap[sd.campusId]) abMap[sd.campusId]={name:sd.campusId,count:0,courses:new Set()};
        abMap[sd.campusId].count++;
        abMap[sd.campusId].courses.add(s.courseCode);
      });
    });
    const d=load();
    // جمع أسماء الطلاب من كل المجموعات
    getAllCoursesForUser(CU.username).forEach(c=>{ (c.students||[]).forEach(stu=>{ if(abMap[stu.campusId]) abMap[stu.campusId].name=stu.name; }); });
    const abRows = Object.entries(abMap).sort((a,b)=>b[1].count-a[1].count).map(([id,info])=>({
      'Campus ID': id,
      'اسم الطالب / Name': info.name!==id?info.name:'—',
      'عدد الغيابات / Absence Count': info.count,
      'المواد / Courses': [...info.courses].join(', ')
    }));
    if(abRows.length){
      const ws3=XLSX.utils.json_to_sheet(abRows);
      ws3['!cols']=[{wch:14},{wch:30},{wch:16},{wch:30}];
      XLSX.utils.book_append_sheet(wb, ws3, 'Top Absentees');
    }
  }

  if (!wb.SheetNames.length) { alert('لا توجد بيانات للشيتات المختارة.'); return; }
  XLSX.writeFile(wb, 'attendance-analytics-report.xlsx');
  closeExportDialog();
}

// Keep old name as alias
function exportAnalyticsReport() { openExportDialog(); }

// Archive
function checkArchive() {
  const d=load(); if (!d.term.start) return;
  const start=new Date(d.term.start);
  const oneYearAgo=new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear()-1);
  if (start<=oneYearAgo && d.sessions.length>0) {
    document.getElementById('archiveNotice').style.display='flex';
    document.getElementById('archiveText').textContent=
      `You have ${d.sessions.length} sessions from ${start.getFullYear()} ready to archive. Download and clear to keep the system fast.`;
  }
}

function downloadArchive() {
  exportAnalyticsReport();
}

function clearArchive() {
  if (!confirm('Clear all session data after archiving?')) return;
  const d=load(); d.sessions=[]; save(d);
  document.getElementById('archiveNotice').style.display='none';
  renderAnalytics(); alert('✅ Archive cleared.');
}

// ══════════════════════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
//  ADMIN PANEL — Full user management
// ══════════════════════════════════════════════════════════
let _editingUserIdx = null;

function openAdmin() {
