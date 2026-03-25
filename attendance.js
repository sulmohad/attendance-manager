let CK=null, manAbs=new Set(), excused=new Map(), sasData=[], timerInt=null, timerSecs=0;
let _attMode = 'manual'; // 'manual' | 'electronic' | 'latemanual'

function renderPicker() {
  const d       = load();
  const courses = getActiveCourses(d);
  const groupId = d.activeGroup;
  const grid    = document.getElementById('coursePickGrid');
  const empty   = document.getElementById('coursePickEmpty');
  const keys    = Object.keys(courses);

  if (!keys.length) { grid.style.display='none'; empty.style.display='block'; return; }
  grid.style.display='grid'; empty.style.display='none';

  // Count sessions per course — فقط جلسات المجموعة النشطة
  const sessionCounts = {};
  (d.sessions||[]).filter(s => !groupId || !s.groupId || s.groupId === groupId)
    .forEach(s => { sessionCounts[s.courseCode] = (sessionCounts[s.courseCode]||0) + 1; });

  // عنوان البطاقة: اسم المجموعة النشطة
  const groupLabel = groupId
    ? `<div style="font-size:0.7rem;color:var(--text3);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${getGroupColor(groupId,d)};display:inline-block;"></span>
        ${groupId}
       </div>`
    : '';

  grid.innerHTML = groupLabel + keys.map(k=>{
    const c = courses[k];
    const sessCount = sessionCounts[k] || 0;
    return `<div class="ci" style="cursor:pointer;border-right:3px solid ${c.color};position:relative;" onclick="showCourseHistory('${k}')">
      <div class="ci-dot" style="background:${c.color}"></div>
      <div style="flex:1;">
        <div class="ci-code" style="color:${c.color}">${c.code}</div>
        <div class="ci-name" style="font-size:0.82rem;margin-top:2px;">${c.name}</div>
        <div class="ci-cnt">${c.students.length} students · ${c.room}</div>
        <div style="font-size:0.65rem;color:var(--text3);margin-top:3px;">
          📋 ${sessCount} / ${getScheduledLectureCount(k)} lectures
        </div>
      </div>
    </div>`;
  }).join('');

  // Populate filter dropdown in prev sessions
  const sel = document.getElementById('prevSessionsCourseFilter');
  if (sel) {
    sel.innerHTML = '<option value="">All Courses</option>' +
      keys.map(k => `<option value="${k}">${courses[k].code}</option>`).join('');
  }
}

// ══════════════════════════════════════════════════════════
//  MODE SELECTOR HELPERS
// ══════════════════════════════════════════════════════════

function toggleElecOption(which) {
  const cbCovered = document.getElementById('elecCoveredByCheck');
  const cbOther   = document.getElementById('elecOtherCheck');
  const wCovered  = document.getElementById('elecCoveredByWrap');
  const wOther    = document.getElementById('elecOtherWrap');
  if (!cbCovered || !cbOther) return;
  // Uncheck the other one (mutually exclusive)
  if (which === 'coveredby') { cbOther.checked = false; if(wOther) wOther.style.display='none'; }
  if (which === 'other')     { cbCovered.checked = false; if(wCovered) wCovered.style.display='none'; }
  if (wCovered) wCovered.style.display = cbCovered.checked ? 'block' : 'none';
  if (wOther)   wOther.style.display   = cbOther.checked   ? 'block' : 'none';
}

function toggleManualOnlyOther() {
  const other  = document.getElementById('moOther');
  const wrap   = document.getElementById('manualOnlyOtherWrap');
  if (!other || !wrap) return;
  wrap.style.display = other.checked ? 'block' : 'none';
}

function populateCoveredByList() {
  const sel = document.getElementById('coveredBySelect');
  if (!sel) return;
  const shared = loadShared();
  const others = shared.users.filter(u => u.username !== CU.username && u.role !== 'admin' && u.enabled !== false);
  sel.innerHTML = '<option value="">— Select colleague —</option>' +
    others.map(u => `<option value="${u.username}">${u.username}</option>`).join('');
}

// Get the value of coveredBy from the new UI
function getCoveredByValue() {
  const cbCovered = document.getElementById('elecCoveredByCheck');
  if (cbCovered && cbCovered.checked) {
    return document.getElementById('coveredBySelect')?.value || '';
  }
  return '';
}

// Get the lateManualReason / manualOnly reason
function getManualOnlyReason() {
  const radios = document.querySelectorAll('input[name="manualOnlyReason"]');
  for (const r of radios) {
    if (r.checked) {
      if (r.value === 'other') return document.getElementById('lateManualReason')?.value || 'Other';
      if (r.value === 'late_reschedule') return 'Late / Reschedule notification';
      if (r.value === 'asked_by_dept')   return 'Asked by Dept.';
    }
  }
  return '';
}

// Get elec-only other reason
function getElecOtherReason() {
  const cb = document.getElementById('elecOtherCheck');
  if (cb && cb.checked) return document.getElementById('elecOtherReason')?.value || '';
  return '';
}

// Reset all mode-extra fields to default
function resetModeFields() {
  const els = ['manualReason','lateManualReason','elecOtherReason'];
  els.forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const checks = ['elecCoveredByCheck','elecOtherCheck'];
  checks.forEach(id => { const el=document.getElementById(id); if(el) el.checked=false; });
  const radios = document.querySelectorAll('input[name="manualOnlyReason"]');
  radios.forEach(r => r.checked=false);
  const wraps = ['elecCoveredByWrap','elecOtherWrap','manualOnlyOtherWrap'];
  wraps.forEach(id => { const el=document.getElementById(id); if(el) el.style.display='none'; });
  const sel = document.getElementById('coveredBySelect');
  if (sel) sel.value='';
  const cv = document.getElementById('coveredBy');
  if (cv) cv.value='';
}

// ══════════════════════════════════════════════════════════
//  LECTURE COUNT CALCULATOR
// ══════════════════════════════════════════════════════════
function getScheduledLectureCount(courseCode) {
  const d = load();
  const totalWeeks = d.term?.weeks || 16;
  // Count how many times this course appears in the weekly schedule
  const lecturesPerWeek = getActiveSchedule(d).filter(s => s.courseCode === courseCode).length;
  return lecturesPerWeek * totalWeeks;
}

// ══════════════════════════════════════════════════════════
//  EDIT SESSION — opens a saved session for editing
// ══════════════════════════════════════════════════════════
let _editingSessionIdx = null;

function editSession(sessionIdx) {
  _editingSessionIdx = sessionIdx;
  const d = load();
  const s = (d.sessions||[])[sessionIdx];
  if (!s) return;

  // Restore state from session
  const c = getActiveCourses(d)[s.courseCode] || getCourse(s.courseCode);
  if (!c) { alert('Course not found.'); return; }

  CK = s.courseCode;
  manAbs.clear(); excused.clear(); sasData=[];

  // Restore absent/excused from studentDetails
  if (s.studentDetails) {
    s.studentDetails.forEach(sd => {
      if (sd.status === 'Absent')  manAbs.add(sd.campusId);
      if (sd.status === 'Excused') excused.set(sd.campusId, 'Excused');
    });
  }

  // Reset UI
  document.getElementById('sasZone').classList.remove('loaded');
  document.getElementById('sasLabel').textContent = 'Click or drag SAS Excel file here';
  document.getElementById('matchBtn').disabled = true;
  document.getElementById('resultsDiv').classList.remove('show');
  document.getElementById('sessionNote').value = s.note || '';
  document.getElementById('lecturerName').value = s.lecturer || '';
  resetModeFields();

  // Restore mode
  const mode = s.lateManual ? 'latemanual' : s.electronicOnly ? 'electronic' : 'manual';
  _attMode = mode;
  setAttMode(mode);

  // Restore mode-specific fields
  if (mode === 'manual' && s.manualReason) {
    const el = document.getElementById('manualReason');
    if (el) el.value = s.manualReason;
  }
  if (mode === 'latemanual' && s.lateManualReason) {
    const reason = s.lateManualReason;
    if (reason === 'Late / Reschedule notification') {
      const r = document.getElementById('moLateReschedule'); if(r) r.checked=true;
    } else if (reason === 'Asked by Dept.') {
      const r = document.getElementById('moAskedByDept'); if(r) r.checked=true;
    } else {
      const r = document.getElementById('moOther'); if(r) r.checked=true;
      const el = document.getElementById('lateManualReason'); if(el) el.value=reason;
      const w = document.getElementById('manualOnlyOtherWrap'); if(w) w.style.display='block';
    }
  }
  if (mode === 'electronic' && s.coveredBy) {
    populateCoveredByList();
    const cb = document.getElementById('elecCoveredByCheck'); if(cb) cb.checked=true;
    toggleElecOption('coveredby');
    setTimeout(()=>{ const sel=document.getElementById('coveredBySelect'); if(sel) sel.value=s.coveredBy; },100);
    const cv = document.getElementById('coveredBy'); if(cv) cv.value=s.coveredBy;
  }

  // Set header
  document.getElementById('attTitle').textContent = `✏️ ${c.code} — ${c.name}`;
  document.getElementById('attSub').textContent = `${c.students.length} students · Editing session ${s.date}`;
  document.getElementById('attRoom').textContent = `📍 ${c.room}`;

  // Show panels
  document.getElementById('courseSelector').style.display = 'none';
  document.getElementById('prevSessionsCard').style.display = 'none';
  document.getElementById('sessionViewPanel').style.display = 'none';
  document.getElementById('attPanel').style.display = 'block';

  // No timer when editing — preserve original timerSecs
  timerSecs = s.timerSecs || 0;
  stopTimer();
  // Show timer display as paused
  const m = Math.floor(timerSecs/60).toString().padStart(2,'0');
  const sc = (timerSecs%60).toString().padStart(2,'0');
  const disp = document.getElementById('timerDisp');
  if (disp) { disp.textContent = `${m}:${sc}`; disp.style.color='var(--text3)'; }
  renderAttGrid();
  showPage('attendance');
}


// ══════════════════════════════════════════════════════════
//  ROSTER SUMMARY TABLE
// ══════════════════════════════════════════════════════════
let _rosterCourseKey = null;

function showRosterSummary(key) {
  _rosterCourseKey = key;
  const d = load();
  const c = getActiveCourses(d)[key] || getCourse(key);
  if (!c) return;

  document.getElementById('rosterCourseLabel').textContent = `${c.code} — ${c.name}`;

  // Populate session filter — فقط جلسات المجموعة النشطة
  const groupId = d.activeGroup;
  const sessions = (d.sessions||[]).filter(s =>
    s.courseCode === key && (!groupId || !s.groupId || s.groupId === groupId)
  );
  const sel = document.getElementById('rosterSessionFilter');
  if (sel) {
    sel.innerHTML = '<option value="">All Sessions (aggregate)</option>' +
      sessions.map((s,i) => {
        const origIdx = (d.sessions||[]).indexOf(s);
        return `<option value="${origIdx}">${s.date} ${s.time||''}</option>`;
      }).join('');
  }

  document.getElementById('rosterSummaryCard').style.display = 'block';
  renderRosterTable();
}

function hideRosterSummary() {
  document.getElementById('rosterSummaryCard').style.display = 'none';
  _rosterCourseKey = null;
}

function renderRosterTable() {
  if (!_rosterCourseKey) return;
  const d = load();
  const c = getActiveCourses(d)[_rosterCourseKey] || getCourse(_rosterCourseKey);
  if (!c || !c.students) return;

  const sessFilter = document.getElementById('rosterSessionFilter')?.value;
  const groupId = d.activeGroup;
  const sessions = (d.sessions||[]).filter((s,i) =>
    s.courseCode === _rosterCourseKey
    && (!groupId || !s.groupId || s.groupId === groupId)
    && (sessFilter === '' || String((d.sessions||[]).indexOf(s)) === sessFilter)
  );

  const showAccuracy = isAdmin();
  const head = document.getElementById('rosterHead');
  const body = document.getElementById('rosterBody');

  if (sessFilter !== '') {
    // Single session view: columns = Seat | Name | Campus ID | Status | Manual Absent | Electronic Absent
    const sess = sessions[0];
    head.innerHTML = `<tr>
      <th style="text-align:center;">Seat</th>
      <th>Name</th>
      <th>Campus ID</th>
      <th style="text-align:center;">Status</th>
      <th style="text-align:center;">Manual Absent</th>
      <th style="text-align:center;">Electronic Absent</th>
      <th style="text-align:center;">Total Absent</th>
    </tr>`;
    if (!sess) { body.innerHTML='<tr><td colspan="6" class="empty">No session data</td></tr>'; return; }
    const STATUS_COLOR = {'Absent':'var(--red)','Escaped':'var(--yellow)','Excused':'var(--cyan)','Not Registered':'var(--green)','Present':'var(--text3)'};
    body.innerHTML = c.students.map(s => {
      const sd = sess.studentDetails?.find(x => x.campusId === s.campusId);
      const status = sd?.status || 'Present';
      // Manual Absent: الطالب علّمه الموظف يدوياً غائباً (Absent أو Escaped فقط)
      // Not Registered: غائب إلكترونياً فقط — لم يُسجَّل في التطبيق اليدوي
      const isManualAbsent = status === 'Absent' || status === 'Escaped';
      const isElecAbsent   = status === 'Absent' || status === 'Escaped' || status === 'Not Registered';
      const isTotalAbsent  = status === 'Absent' || status === 'Escaped' || status === 'Not Registered';
      const color = STATUS_COLOR[status] || 'var(--text3)';
      return `<tr>
        <td style="text-align:center;font-family:var(--mono);font-size:0.7rem;">${s.seat}</td>
        <td>${s.name}</td>
        <td style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);">${s.campusId}</td>
        <td style="text-align:center;"><span style="color:${color};font-weight:600;font-size:0.72rem;">${status}</span></td>
        <td style="text-align:center;">${isManualAbsent ? '<span style="color:var(--red);">●</span>' : '—'}</td>
        <td style="text-align:center;">${isElecAbsent   ? '<span style="color:var(--red);">●</span>' : '—'}</td>
        <td style="text-align:center;font-family:var(--mono);font-weight:700;color:${isTotalAbsent?'var(--red)':'var(--text3)'};">${isTotalAbsent ? '1' : '—'}</td>
      </tr>`;
    }).join('');
  } else {
    // Aggregate view: columns = Seat | Name | Campus ID | Total Sessions | Manual Absent | Electronic Absent
    head.innerHTML = `<tr>
      <th style="text-align:center;">Seat</th>
      <th>Name</th>
      <th>Campus ID</th>
      <th style="text-align:center;">Sessions</th>
      <th style="text-align:center;">Manual Absent</th>
      <th style="text-align:center;">Electronic Absent</th>
      <th style="text-align:center;">Total Absent</th>
    </tr>`;
    if (!sessions.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">No sessions recorded yet</td></tr>';
      return;
    }
    body.innerHTML = c.students.map(s => {
      let manAbs=0, elecAbs=0, sessTotal=sessions.length;
      let totalAbs = 0;
      sessions.forEach(sess => {
        const sd = sess.studentDetails?.find(x => x.campusId === s.campusId);
        if (!sd) return;
        // Manual Absent: علّمه الموظف غائباً يدوياً (Absent أو Escaped فقط)
        // Not Registered: غائب إلكترونياً فقط، لم يُسجَّل في الشبكة اليدوية
        const isM = sd.status === 'Absent' || sd.status === 'Escaped';
        const isE = sd.status === 'Absent' || sd.status === 'Escaped' || sd.status === 'Not Registered';
        // Total Absent: 1 per session if Absent/Escaped/Not Registered (Excused = 0)
        const isAbsent = sd.status === 'Absent' || sd.status === 'Escaped' || sd.status === 'Not Registered';
        if (isM) manAbs++;
        if (isE) elecAbs++;
        if (isAbsent) totalAbs++;
      });
      const pctColor = totalAbs >= sessTotal ? 'var(--red)' : totalAbs > 0 ? 'var(--yellow)' : 'var(--text2)';
      return `<tr>
        <td style="text-align:center;font-family:var(--mono);font-size:0.7rem;">${s.seat}</td>
        <td>${s.name}</td>
        <td style="font-family:var(--mono);font-size:0.68rem;color:var(--text3);">${s.campusId}</td>
        <td style="text-align:center;font-family:var(--mono);">${sessTotal}</td>
        <td style="text-align:center;font-family:var(--mono);color:${manAbs>0?'var(--yellow)':'var(--text2)'};">${manAbs||'—'}</td>
        <td style="text-align:center;font-family:var(--mono);color:${elecAbs>0?'var(--red)':'var(--text2)'};">${elecAbs||'—'}</td>
        <td style="text-align:center;font-family:var(--mono);font-weight:700;color:${pctColor};">${totalAbs||'—'}</td>
      </tr>`;
    }).join('');
  }
}

// ══════════════════════════════════════════════════════════
//  COURSE HISTORY & SESSION VIEW
// ══════════════════════════════════════════════════════════
let _historyCourseKey = null;  // which course is showing history
let _viewingSessionIdx = null; // which session is being viewed

// Called when user clicks a course card — shows history panel
function showCourseHistory(key) {
  _historyCourseKey = key;
  const d = load();
  const c = getActiveCourses(d)[key] || getCourse(key);
  if (!c) return;
  const groupId = d.activeGroup;

  // Update header — يشمل اسم المجموعة
  const nameEl = document.getElementById('prevSessionsCourseName');
  if (nameEl) {
    const groupTag = groupId
      ? ` <span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:rgba(59,130,246,0.12);color:var(--accent);font-weight:600;">${groupId}</span>`
      : '';
    nameEl.innerHTML = c.code + ' — ' + c.name + groupTag;
  }

  // Set filter
  const sel = document.getElementById('prevSessionsCourseFilter');
  if (sel) sel.value = key;

  // Show history panel, hide session view
  document.getElementById('prevSessionsCard').style.display = 'block';
  document.getElementById('sessionViewPanel').style.display = 'none';

  renderPrevSessions();
  // Also show roster summary
  showRosterSummary(key);
}

function hidePrevSessions() {
  document.getElementById('prevSessionsCard').style.display = 'none';
  document.getElementById('rosterSummaryCard').style.display = 'none';
  _historyCourseKey = null;
  _rosterCourseKey = null;
}

function renderPrevSessions() {
  const d = load();
  const filterKey = document.getElementById('prevSessionsCourseFilter')?.value || _historyCourseKey || '';
  const list = document.getElementById('prevSessionsList');
  if (!list) return;

  const groupId = d.activeGroup;
  let sessions = d.sessions || [];
  const indexed = sessions.map((s, i) => ({...s, _idx: i}));
  // فلترة بالمجموعة النشطة أولاً، ثم بالمادة
  let filtered = indexed.filter(s => !groupId || !s.groupId || s.groupId === groupId);
  if (filterKey) filtered = filtered.filter(s => s.courseCode === filterKey);
  filtered = [...filtered].sort((a,b) => b.date.localeCompare(a.date) || (b.time||'').localeCompare(a.time||''));

  const TYPE_ICON = { manual:'✅', electronic:'⚡', latemanual:'📋' };
  const TYPE_LABEL = { manual:'Manual+Electronic', electronic:'Electronic Only', latemanual:'Manual Only' };

  const getType = s => s.lateManual ? 'latemanual' : s.electronicOnly ? 'electronic' : 'manual';
  const TYPE_COLOR = { manual:'var(--green)', electronic:'var(--cyan)', latemanual:'var(--yellow)' };

  if (!filtered.length) {
    list.innerHTML = `<div class="empty" style="padding:20px;">لا توجد جلسات مسجلة · No sessions recorded yet</div>
      <div style="padding:8px 4px;">
        <button class="btn btn-primary btn-full" onclick="startNewSession('${filterKey||_historyCourseKey||''}')">
          ➕ Start New Session · تحضير جديد
        </button>
      </div>`;
    return;
  }

  let html = `<div style="padding:4px 0 10px;">
    <button class="btn btn-primary btn-full" onclick="startNewSession('${filterKey||_historyCourseKey||''}')">
      ➕ New Session · تحضير جديد
    </button>
  </div>`;

  html += filtered.map(s => {
    const t = getType(s);
    const duration = s.timerSecs ? Math.ceil(s.timerSecs/60) + ' min' : '—';
    const accuracy = s.accuracy != null ? s.accuracy + '%' : '—';
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
      background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:6px;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-family:var(--mono);font-size:0.72rem;font-weight:600;color:var(--text2);">${s.date}</span>
          <span style="font-family:var(--mono);font-size:0.67rem;color:var(--text3);">${s.time||''}</span>
          <span style="font-size:0.65rem;color:${TYPE_COLOR[t]};">${TYPE_ICON[t]} ${TYPE_LABEL[t]}</span>
          ${s.manualReason ? `<span style="font-size:0.62rem;color:var(--text3);font-style:italic;">${s.manualReason}</span>` : ''}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <span style="font-size:0.68rem;color:var(--text3);">👥 ${s.total||0}</span>
          <span style="font-size:0.68rem;color:var(--red);">⚫ ${s.electronicAbsent||0} absent</span>
          <span style="font-size:0.68rem;color:var(--yellow);">🏃 ${s.escaped||0} escaped</span>
          ${isAdmin() ? `<span style="font-size:0.68rem;color:${(s.accuracy||0)>=90?'var(--green)':'var(--yellow)'};">🎯 ${accuracy}</span>` : ''}
          <span style="font-size:0.68rem;color:var(--text3);">⏱ ${duration}</span>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:0.72rem;white-space:nowrap;"
          onclick="openSessionView(${s._idx})">
          👁 View
        </button>
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:0.72rem;white-space:nowrap;color:var(--yellow);border-color:rgba(234,179,8,0.3);"
          onclick="editSession(${s._idx})">
          ✏️ Edit
        </button>
      </div>
    </div>`;
  }).join('');

  list.innerHTML = html;
}

// Start a brand new session for a course — timer starts now
function startNewSession(key) {
  if (!key) { alert('Select a course first.'); return; }
  openCourseAtt(key); // This calls startTimer() inside
}

// View a past session — NO timer
function openSessionView(sessionIdx) {
  _viewingSessionIdx = sessionIdx;
  const d = load();
  const s = (d.sessions||[])[sessionIdx];
  if (!s) return;

  const TYPE_ICON = { manual:'✅', electronic:'⚡', latemanual:'📋' };
  const getType = s => s.lateManual ? 'latemanual' : s.electronicOnly ? 'electronic' : 'manual';
  const t = getType(s);
  const duration = s.timerSecs ? Math.ceil(s.timerSecs/60) + ' min' : '—';

  document.getElementById('svTitle').textContent = `${s.courseCode} — ${s.courseName||''}`;
  document.getElementById('svMeta').textContent = `📅 ${s.date}  ·  🕐 ${s.time||''}  ·  ${TYPE_ICON[t]}  ·  ⏱ ${duration}`;

  // Stats cards
  const showAccuracy = isAdmin();
  const statItems = [
    ['Total','👥',s.total||0,'var(--text2)'],
    ['Absent','🔴',s.electronicAbsent||0,'var(--red)'],
    ['Escaped','🏃',s.escaped||0,'var(--yellow)'],
    ['Excused','✅',s.excused||0,'var(--cyan)'],
    ['Not Reg','📵',s.notRegistered||0,'var(--green)'],
  ];
  if (showAccuracy) statItems.push(['Accuracy','🎯',(s.accuracy||0)+'%',s.accuracy>=90?'var(--green)':'var(--yellow)']);
  let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-bottom:16px;">
    ${statItems.map(([lbl,icon,val,col])=>`<div style="background:var(--surface);border:1px solid var(--border);
      border-radius:var(--r);padding:10px;text-align:center;">
      <div style="font-size:0.85rem;margin-bottom:3px;">${icon}</div>
      <div style="font-size:1rem;font-weight:700;font-family:var(--mono);color:${col};">${val}</div>
      <div style="font-size:0.6rem;color:var(--text3);margin-top:2px;">${lbl}</div>
    </div>`).join('')}
  </div>`;

  // Extra details
  const details = [
    s.manualReason     ? ['📝 سبب التحضير اليدوي', s.manualReason]   : null,
    s.coveredBy        ? ['👤 Covered By',           s.coveredBy]      : null,
    s.lateManualReason ? ['📋 Manual Only Reason',   s.lateManualReason]: null,
    s.lecturer         ? ['🎓 Lecturer',              s.lecturer]       : null,
    s.note             ? ['📌 Note',                  s.note]           : null,
  ].filter(Boolean);

  if (details.length) {
    html += `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);
      padding:12px 14px;margin-bottom:12px;">
      ${details.map(([lbl,val])=>`<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.78rem;">
        <span style="color:var(--text3);min-width:160px;flex-shrink:0;">${lbl}</span>
        <span style="color:var(--text);">${val}</span>
      </div>`).join('')}
    </div>`;
  }

  // Non-present students (Admin only)
  if (s.studentDetails && s.studentDetails.length && isAdmin()) {
    const nonPresent = s.studentDetails.filter(sd => sd.status !== 'Present');
    if (nonPresent.length) {
      const STATUS_BADGE = {'Absent':'b-red','Escaped':'b-yellow','Not Registered':'b-green','Excused':'b-cyan'};
      html += `<div style="font-size:0.78rem;font-weight:600;margin-bottom:8px;color:var(--text2);">
        👤 Non-Present Students (${nonPresent.length})
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;">
        ${nonPresent.map(sd=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 10px;
          background:var(--surface2);border-radius:6px;font-size:0.73rem;">
          <span class="badge ${STATUS_BADGE[sd.status]||'b-blue'}" style="font-size:0.6rem;">${sd.status}</span>
          <span style="color:var(--text3);font-family:var(--mono);">${sd.campusId}</span>
        </div>`).join('')}
      </div>`;
    }
  }

  document.getElementById('svContent').innerHTML = html;

  // Show session view, hide history list
  document.getElementById('prevSessionsCard').style.display = 'none';
  document.getElementById('sessionViewPanel').style.display = 'block';
}

function closeSessionView() {
  document.getElementById('sessionViewPanel').style.display = 'none';
  _viewingSessionIdx = null;
  // Go back to history panel
  if (_historyCourseKey) {
    document.getElementById('prevSessionsCard').style.display = 'block';
    document.getElementById('rosterSummaryCard').style.display = 'block';
    renderPrevSessions();
  } else {
    document.getElementById('prevSessionsCard').style.display = 'none';
    document.getElementById('rosterSummaryCard').style.display = 'none';
  }
}



function openCourseAtt(key) {
  const d=load();
  const c=getActiveCourses(d)[key] || getCourse(key);
  if (!c) return;
  const groupId = d.activeGroup;
  CK=key; manAbs.clear(); excused.clear(); sasData=[];
  document.getElementById('sasZone').classList.remove('loaded');
  document.getElementById('sasLabel').textContent='Click or drag SAS Excel file here';
  document.getElementById('matchBtn').disabled=true;
  document.getElementById('matchBtn').textContent='⚡ Match & Show Results';
  document.getElementById('resultsDiv').classList.remove('show');
  document.getElementById('sessionNote').value='';
  document.getElementById('lecturerName').value='';
  document.getElementById('coveredBy').value='';
  resetModeFields();
  _attMode = 'manual';
  _editingSessionIdx = null;
  setAttMode('manual');
  _electronicOnlyMode = false;
  // الهيدر: اسم المادة — اسم المجموعة
  const groupSuffix = groupId ? ` — ${groupId}` : '';
  document.getElementById('attTitle').textContent=`${c.code} — ${c.name}${groupSuffix}`;
  document.getElementById('attSub').textContent=`${c.students.length} students`;
  document.getElementById('attRoom').textContent=`📍 ${c.room}`;
  document.getElementById('courseSelector').style.display='none';
  document.getElementById('prevSessionsCard').style.display='none';
  document.getElementById('sessionViewPanel').style.display='none';
  document.getElementById('attPanel').style.display='block';
  startTimer(); renderAttGrid(); showPage('attendance');
}

function closeAtt() {
  document.getElementById('courseSelector').style.display='block';
  document.getElementById('attPanel').style.display='none';
  _electronicOnlyMode = false;
  document.getElementById('extraElectronic').style.display = 'none';
  document.getElementById('coveredBy').value = '';
  document.getElementById('lecturerName').value = '';
  document.getElementById('matchBtn').textContent = '⚡ Match & Show Results';
  stopTimer();
  // Return to history view of the course we came from
  const backKey = CK;
  CK = null;
  if (backKey && _historyCourseKey === backKey) {
    renderPrevSessions();
    document.getElementById('prevSessionsCard').style.display = 'block';
    showRosterSummary(backKey);
  } else if (backKey) {
    _historyCourseKey = backKey;
    const d = load();
    const c = getActiveCourses(d)[backKey] || getCourse(backKey);
    const nameEl = document.getElementById('prevSessionsCourseName');
    if (nameEl && c) nameEl.textContent = c.code + ' — ' + c.name;
    const sel = document.getElementById('prevSessionsCourseFilter');
    if (sel) sel.value = backKey;
    renderPrevSessions();
    document.getElementById('prevSessionsCard').style.display = 'block';
    showRosterSummary(backKey);
  }
}

function startTimer(addToExisting=false) {
  stopTimer();
  if (!addToExisting) timerSecs=0;
  const disp = document.getElementById('timerDisp');
  timerInt=setInterval(()=>{
    timerSecs++;
    const m=Math.floor(timerSecs/60).toString().padStart(2,'0');
    const s=(timerSecs%60).toString().padStart(2,'0');
    if (disp) disp.textContent=`${m}:${s}`;
  },1000);
  if (disp) disp.style.color = 'var(--yellow)';
}

function pauseTimer() {
  clearInterval(timerInt); timerInt=null;
  const disp = document.getElementById('timerDisp');
  if (disp) disp.style.color = 'var(--text3)';
}

function stopTimer() { clearInterval(timerInt); timerInt=null; }

function renderAttGrid(filter='') {
  const d=load(); const c=getActiveCourses(d)[CK]||getCourse(CK); if (!c) return;
  const q=filter.trim().toLowerCase();
  const list=c.students.filter(s=>!q||s.name.toLowerCase().includes(q)||String(s.seat).includes(q));
  const editMode = _editingSessionIdx !== null;

  document.getElementById('attGrid').innerHTML=list.map(s=>{
    const abs=manAbs.has(s.campusId);
    const exc=excused.has(s.campusId);
    const editActions = (editMode && abs) ? `
      <div style="display:flex;gap:4px;margin-top:6px;" onclick="event.stopPropagation()">
        <button style="flex:1;font-size:0.58rem;padding:3px 4px;border-radius:4px;
          background:rgba(34,197,94,0.12);color:var(--green);border:1px solid rgba(34,197,94,0.3);
          cursor:pointer;white-space:nowrap;" title="Staff error — student was present" onclick="removeAbsence('${s.campusId}')">
          ↩ Staff Error
        </button>
        <button style="flex:1;font-size:0.58rem;padding:3px 4px;border-radius:4px;
          background:rgba(6,182,212,0.1);color:var(--cyan);border:1px solid rgba(6,182,212,0.3);
          cursor:pointer;white-space:nowrap;" onclick="openExcuseFromEdit('${s.campusId}','${s.name.replace(/'/g,"\'")}')">
          ✅ Excused
        </button>
      </div>` : '';
    return `<div class="sc ${abs?'absent':''} ${exc?'excused':''}" onclick="toggleAbs('${s.campusId}')">
      ${abs?'<div class="s-tag absent">ABSENT</div>':''}
      ${exc?'<div class="s-tag excused">EXCUSED</div>':''}
      <div class="s-seat">SEAT ${s.seat}</div>
      <div class="s-name">${s.name}</div>
      <div class="s-campus">${s.campusId}</div>
      ${editActions}
    </div>`;
  }).join('');
  document.getElementById('absBadge').textContent=`Absent: ${manAbs.size}`;
}

function filterAtt() { renderAttGrid(document.getElementById('attSearch').value); }
function toggleAbs(id) { manAbs.has(id)?manAbs.delete(id):manAbs.add(id); renderAttGrid(document.getElementById('attSearch').value); }
function markAll(present) {
  const d=load(); const c=getActiveCourses(d)[CK]||getCourse(CK); if (!c) return;
  if (present) manAbs.clear(); else c.students.forEach(s=>manAbs.add(s.campusId));
  renderAttGrid(document.getElementById('attSearch').value);
}
// ══════════════════════════════════════════════════════════
//  EDIT MODE — Remove Absence / Excuse from grid
// ══════════════════════════════════════════════════════════
function removeAbsence(campusId) {
  const d = load();
  const c = getActiveCourses(d)[CK]||getCourse(CK);
  const stu = c?.students?.find(s => s.campusId === campusId);
  const name = stu?.name || campusId;

  // Staff error: student was actually present
  const reason = prompt('Remove absence for: ' + name + '\n(Staff error — student was present)\n\nNote (optional):');
  if (reason === null) return; // cancelled

  manAbs.delete(campusId);
  excused.delete(campusId);

  if (!window._removedAbsences) window._removedAbsences = {};
  window._removedAbsences[campusId] = reason || 'Staff error';

  renderAttGrid(document.getElementById('attSearch')?.value || '');
}

function openExcuseFromEdit(campusId, name) {
  // Reuse existing excuse overlay
  document.getElementById('excuseStudentName').textContent = name;
  window.excuseTarget = campusId;
  document.getElementById('excuseReason').value = '';
  const etOther=document.getElementById('etOther'); if(etOther) etOther.checked=true;
  document.getElementById('excuseOverlay').classList.add('show');
}



// SAS
document.getElementById('sasFile').addEventListener('change',e=>{ if(e.target.files[0]) loadSAS(e.target.files[0]); });
const sz=document.getElementById('sasZone');
sz.addEventListener('dragover',e=>{e.preventDefault();sz.style.borderColor='var(--accent)';});
sz.addEventListener('dragleave',()=>sz.style.borderColor='');
sz.addEventListener('drop',e=>{e.preventDefault();sz.style.borderColor='';if(e.dataTransfer.files[0])loadSAS(e.dataTransfer.files[0]);});

function loadSAS(file) {
  const reader=new FileReader();
  reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'array'});
    const sn=wb.SheetNames.includes('All')?'All':wb.SheetNames[0];
    const data=XLSX.utils.sheet_to_json(wb.Sheets[sn]);
    sasData=data.map(r=>({campusId:String(r['CAMPUS ID']||''),status:String(r['ATTENDED STATUS']||'Absent')}));
    sz.classList.add('loaded');
    document.getElementById('sasLabel').textContent=`✅ ${file.name} — ${sasData.length} records`;
    document.getElementById('matchBtn').disabled=false;
  };
  reader.readAsArrayBuffer(file);
}

function runMatch() {
  const d=load(); const c=getActiveCourses(d)[CK]||getCourse(CK);
  const sasMap={};
  sasData.forEach(r=>sasMap[r.campusId]=r.status.toLowerCase().includes('absent'));
  const absents=[],escapers=[],noApp=[],excusedList=[];

  c.students.forEach(s=>{
    if (excused.has(s.campusId)) { excusedList.push(s); return; }
    const eA = sasMap.hasOwnProperty(s.campusId) ? sasMap[s.campusId] : true;

    if (_attMode === 'electronic') {
      // Electronic only — no manual comparison
      if (eA) absents.push(s);
    } else {
      const mA = manAbs.has(s.campusId);
      if      (mA &&  eA) absents.push(s);
      else if (mA && !eA) escapers.push(s);
      else if (!mA && eA) noApp.push(s);
    }
  });

  fillSec('secAbs',   absents,   'b-red',    'Absent');
  fillSec('secEsc',   escapers,  'b-yellow', 'Escaped', _attMode !== 'electronic');
  fillSec('secNoApp', noApp,     'b-green',  'Not Registered');
  fillSec('secExc',   excusedList,'b-cyan',  'Excused');

  document.getElementById('cntAbs').textContent   = absents.length;
  document.getElementById('cntEsc').textContent   = escapers.length;
  document.getElementById('cntNoApp').textContent = noApp.length;
  document.getElementById('cntExc').textContent   = excusedList.length;

  // Show electronic only badge if applicable
  if (_attMode === 'electronic') {
    const badge = document.createElement('div');
    badge.className = 'badge b-cyan';
    badge.style.marginBottom = '12px';
    badge.textContent = '⚡ Electronic Only Session';
    const resultsDiv = document.getElementById('resultsDiv');
    const existing = resultsDiv.querySelector('.electronic-badge');
    if (!existing) { badge.classList.add('electronic-badge'); resultsDiv.prepend(badge); }
  }

  document.getElementById('resultsDiv').classList.add('show');
  window._exp = {absents,escapers,noApp,excusedList,courseKey:CK};

  // Auto-save with coveredBy field
  const coveredBy = document.getElementById('coveredBy')?.value || '';
  saveSessionData(absents,escapers,noApp,excusedList,c,coveredBy);
  document.getElementById('resultsDiv').scrollIntoView({behavior:'smooth'});
}

function fillSec(id,students,badge,label,canExcuse=false) {
  const el=document.getElementById(id); el.classList.remove('hidden');
  if (!students.length) { el.innerHTML='<div class="empty">None</div>'; return; }
  el.innerHTML=students.map(s=>`
    <div class="rr">
      <div class="r-num">${s.seat}</div>
      <div class="r-name">${s.name}</div>
      <div class="r-campus">${s.campusId}</div>
      <span class="badge ${badge}">${label}</span>
      ${canExcuse?`<span class="r-excuse-btn" onclick="openExcuse('${s.campusId}','${s.name.replace(/'/g,"\\'")}')">Mark as Excused</span>`:''}
    </div>`).join('');
}

function toggleSec(id,hdr) { document.getElementById(id).classList.toggle('hidden'); hdr.classList.toggle('collapsed'); }

// Excused modal
let excuseTarget=null;
function openExcuse(id,name) {
  excuseTarget=id;
  document.getElementById('excuseStudentName').textContent=name;
  document.getElementById('excuseReason').value='';
  // reset to "other" by default
  const etOther=document.getElementById('etOther'); if(etOther) etOther.checked=true;
  document.getElementById('excuseOverlay').classList.add('show');
}
function closeExcuse() { document.getElementById('excuseOverlay').classList.remove('show'); excuseTarget=null; }
function confirmExcuse() {
  if (!excuseTarget) return;
  const rawReason = document.getElementById('excuseReason').value.trim();
  const isMedical = document.getElementById('etMedical')?.checked;
  // Prefix reason with [medical] so _isMedicalExcuse() detects it reliably
  const reason = isMedical ? '[medical] '+(rawReason||'Medical excuse') : (rawReason||'Permitted');
  excused.set(excuseTarget,reason);
  manAbs.delete(excuseTarget);
  closeExcuse(); runMatch();
}

function saveSession() { if (window._exp) { alert('✅ Session already auto-saved after matching.'); } }

function saveSessionData(absents,escapers,noApp,excusedList,c,coveredBy='') {
  const d=load();
  const totalEle = sasData.filter(r=>r.status.toLowerCase().includes('absent')).length;
  const totalManual = manAbs.size + excusedList.length;
  const total = c.students.length;
  const accuracy = total>0 ? Math.round(((total-Math.abs(totalEle-totalManual))/total)*100) : 100;
  const lectNote = document.getElementById('sessionNote').value;
  const lectName = document.getElementById('lecturerName') ? document.getElementById('lecturerName').value : '';

  // Build per-student details for Student Reports
  const studentDetails = [];
  const removals = window._removedAbsences || {};
  c.students.forEach(s => {
    let status = 'Present';
    if (excusedList.find(x=>x.campusId===s.campusId)) status='Excused';
    else if (absents.find(x=>x.campusId===s.campusId))   status='Absent';
    else if (escapers.find(x=>x.campusId===s.campusId))  status='Escaped';
    else if (noApp.find(x=>x.campusId===s.campusId))     status='Not Registered';
    const entry = { campusId:s.campusId, status };
    if (removals[s.campusId]) entry.removalNote = removals[s.campusId];
    // Store excuse reason so Analytics can classify medical vs non-medical
    if (status==='Excused' && excused.has(s.campusId)) entry.excuseReason = excused.get(s.campusId)||'';
    studentDetails.push(entry);
  });
  window._removedAbsences = {}; // reset after save

  // When editing, preserve original timerSecs; only update on new sessions
  const isEditing = _editingSessionIdx !== null && _editingSessionIdx >= 0;
  const origSession = isEditing ? (load().sessions||[])[_editingSessionIdx] : null;
  const sessionObj = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0,5),
    groupId: d.activeGroup || null,
    courseCode: CK,
    courseName: c.name,
    staff: CU.username,
    lecturer: lectName,
    total,
    electronicAbsent: totalEle,
    manualAbsent: totalManual,
    escaped: escapers.length,
    excused: excusedList.length,
    notRegistered: noApp.length,
    accuracy,
    note: lectNote,
    timerSecs: isEditing ? (origSession?.timerSecs || timerSecs) : timerSecs,
    electronicOnly: _attMode === 'electronic',
    lateManual: _attMode === 'latemanual',
    lateManualReason: _attMode === 'latemanual' ? getManualOnlyReason() : '',
    manualReason: _attMode === 'manual' ? (document.getElementById('manualReason')?.value||'') : '',
    elecOtherReason: _attMode === 'electronic' ? getElecOtherReason() : '',
    coveredBy: _attMode === 'electronic' ? getCoveredByValue() : (coveredBy||''),
    editedFrom: _editingSessionIdx !== null ? _editingSessionIdx : undefined,
    studentDetails
  };
  if (_editingSessionIdx !== null && _editingSessionIdx >= 0 && _editingSessionIdx < d.sessions.length) {
    // Overwrite existing session (preserve original date/time)
    const orig = d.sessions[_editingSessionIdx];
    sessionObj.date = orig.date;
    sessionObj.time = orig.time;
    d.sessions[_editingSessionIdx] = sessionObj;
  } else {
    d.sessions.push(sessionObj);
  }
  _editingSessionIdx = null;
  save(d);
}

function getAttRows() {
  const {absents,escapers,noApp,excusedList}=window._exp;
  const rows=[];
  const add=(list,status)=>list.forEach(s=>rows.push({'Seat No':s.seat,'Name':s.name,'Campus ID':s.campusId,'Status':status}));
  add(absents,'Absent'); add(escapers,'Escaped'); add(noApp,'Not Registered in App'); add(excusedList,'Excused');
  return rows;
}

function exportAttExcel() {
  const ws=XLSX.utils.json_to_sheet(getAttRows());
  const wb=XLSX.utils.book_new();
  try { const _fr=XLSX.utils.decode_range(ws['!ref']).e.r+3; ws[XLSX.utils.encode_cell({r:_fr,c:0})]={v:'KSAU-HS | COSHP-RM | Student Affairs',t:'s'}; } catch(e){}
  XLSX.utils.book_append_sheet(wb,ws,'Results');
  XLSX.writeFile(wb,`attendance-${CK}.xlsx`);
}
function exportAttCSV() {
  const rows=getAttRows();
  const hdr=Object.keys(rows[0]).join(',')+'\n';
  const body=rows.map(r=>Object.values(r).map(v=>`"${v}"`).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+hdr+body],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`attendance-${CK}.csv`; a.click();
}

// ══════════════════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════════════════
let rptCourse=null, rptType='attendance';
