
// ══════════════════════════════════════════════════════════
//  REPORTS SIDEBAR — Groups > Courses tree
// ══════════════════════════════════════════════════════════
let _rptExpandedGroups = {}; // { "username::groupId": true/false }

function renderReports() {
  const list = document.getElementById('rptCourseList');

  // جمع بيانات المستخدمين المتاحين حسب الصلاحية
  const users = accessibleUsernames();
  let html = '';
  let hasAny = false;

  users.forEach(uname => {
    const p = loadPersonal(uname);
    const groups = p.groups || {};
    const gKeys = Object.keys(groups);
    if (!gKeys.length) return;
    hasAny = true;

    // عنوان المستخدم — يظهر فقط للأدمن عندما يرى أكثر من مستخدم
    if (users.length > 1) {
      const isMe = uname === CU.username;
      html += `<div style="font-size:0.65rem;font-weight:700;color:var(--text3);
        text-transform:uppercase;letter-spacing:0.5px;
        padding:6px 8px 3px;margin-top:6px;border-top:1px solid var(--border);">
        ${isMe ? '👤 Me' : '👤 ' + uname}
      </div>`;
    }

    // المجموعات
    gKeys.forEach(gid => {
      const g = groups[gid];
      const cKeys = Object.keys(g.courses || {});
      const expandKey = uname + '::' + gid;
      const isExpanded = _rptExpandedGroups[expandKey] !== false; // افتراضياً مفتوح
      const color = getGroupColorForUser(gid, uname);
      const isGroupSelected = rptCourse === (uname + '::group::' + gid);

      html += `<div class="rpt-group-row ${isGroupSelected?'active':''}"
        onclick="toggleRptGroup('${expandKey}','${uname}','${gid}')"
        style="display:flex;align-items:center;gap:7px;padding:7px 8px;
          border-radius:var(--r);cursor:pointer;margin-bottom:2px;
          background:${isGroupSelected?'var(--accent-glow)':'var(--surface2)'};
          border:1px solid ${isGroupSelected?'rgba(59,130,246,0.3)':'transparent'};
          transition:all 0.15s;">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <span style="flex:1;font-size:0.78rem;font-weight:600;">${gid}</span>
        <span style="font-size:0.63rem;color:var(--text3);">${cKeys.length}</span>
        <span style="font-size:0.65rem;color:var(--text3);transition:transform 0.2s;
          transform:rotate(${isExpanded?'0':'−90'}deg);">▾</span>
      </div>`;

      if (isExpanded) {
        cKeys.forEach(code => {
          const course = g.courses[code];
          const ck = uname === CU.username ? code + '::g::' + gid : uname + '::' + code;
          const isActive = rptCourse === ck;
          html += `<button class="rcb ${isActive?'active':''}"
            onclick="selRptCourse('${ck}')"
            style="padding-right:20px;">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="width:5px;height:5px;border-radius:50%;background:${course.color||color};flex-shrink:0;"></span>
              <span style="color:${course.color||color};font-family:var(--mono);font-size:0.68rem;font-weight:600;">${course.code}</span>
            </span>
            <span style="font-size:0.73rem;margin-top:2px;display:block;padding-right:11px;">${course.name}</span>
          </button>`;
        });
      }
    });
  });

  if (!hasAny) {
    list.innerHTML = '<div class="empty" style="padding:10px;font-size:0.77rem;">No groups yet — go to Setup</div>';
    return;
  }
  list.innerHTML = html;
}

function toggleRptGroup(expandKey, uname, gid) {
  // إذا كان هذا ضغط على مجموعة — نختارها للعرض الجماعي
  const ck = uname + '::group::' + gid;
  if (rptCourse === ck) {
    // إخفاء/إظهار فقط
    _rptExpandedGroups[expandKey] = !(_rptExpandedGroups[expandKey] !== false);
  } else {
    rptCourse = ck;
    _rptExpandedGroups[expandKey] = true;
  }
  renderReports();
  renderRptPreview();
}

function getGroupColorForUser(gid, uname) {
  const p = loadPersonal(uname);
  return getGroupColor(gid, { ...p, users: [] });
}

function selRptCourse(k) { rptCourse=k; renderReports(); renderRptPreview(); }

function selRptType(type,el) {
  rptType=type;
  document.querySelectorAll('.rtc').forEach(c=>c.classList.remove('active'));
  el.classList.add('active'); renderRptPreview();
}

// ── helpers لاسترجاع مواد المجموعة المختارة ──────────────
function _getGroupCourses(rptKey) {
  // صيغة: uname::group::gid
  const parts = rptKey.split('::group::');
  if (parts.length !== 2) return [];
  const [uname, gid] = parts;
  const p = loadPersonal(uname);
  const g = p.groups?.[gid];
  if (!g) return [];
  return Object.values(g.courses || {}).map(c => ({ ...c, _owner: uname, _gid: gid }));
}

function _isGroupKey(k) { return k && k.includes('::group::'); }

function renderRptPreview() {
  if (!rptCourse) return;
  const labels = { attendance:'Attendance Sheet', monthly:'Monthly Exam Sheet', final:'Final Exam Sheet' };
  const wrap = document.getElementById('rptTableWrap');
  const ownerEl = document.getElementById('rptOwner');

  // ── وضع المجموعة كاملة ────────────────────────────────
  if (_isGroupKey(rptCourse)) {
    const courses = _getGroupCourses(rptCourse);
    const gid = rptCourse.split('::group::')[1];
    const totalStudents = courses.reduce((n,c)=>n+(c.students||[]).length,0);
    ownerEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span class="badge b-blue">📁 ${gid}</span>
      <span style="font-size:0.82rem;color:var(--text2);">${courses.length} courses · ${totalStudents} students</span>
      <span class="badge b-purple">${labels[rptType]}</span>
    </div>`;

    // عرض ملخص المواد
    wrap.innerHTML = courses.map(c => `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);
        padding:8px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
        <span style="font-family:var(--mono);font-size:0.72rem;font-weight:600;color:${c.color};">${c.code}</span>
        <span style="font-size:0.78rem;flex:1;">${c.name}</span>
        <span style="font-size:0.7rem;color:var(--text3);">${(c.students||[]).length} students · ${c.room}</span>
      </div>`).join('') || '<div class="empty">No courses in this group</div>';

    // أزرار تصدير المجموعة + NO SHOW + Biweekly
    document.querySelector('.export-row').innerHTML = `
      <button class="btn btn-primary" onclick="exportRptExcel()">📥 Export All Excel</button>
      <button class="btn btn-ghost" onclick="exportRptPDF()">🖨 Export All PDF</button>
      <button class="btn btn-ghost" onclick="showReportModal('noshow')" style="color:var(--red);border-color:rgba(239,68,68,0.3);">🚨 NO SHOW</button>
      <button class="btn btn-ghost" onclick="showReportModal('biweekly')" style="color:var(--yellow);border-color:rgba(234,179,8,0.3);">📊 Biweekly</button>`;
    return;
  }

  // ── وضع مادة واحدة ────────────────────────────────────
  const course = getCourse(rptCourse); if (!course) return;
  const { owner } = resolveCourseKey(rptCourse);
  const groupTag = rptCourse.includes('::g::')
    ? `<span class="badge b-accent" style="background:rgba(59,130,246,0.12);color:var(--accent);border:1px solid rgba(59,130,246,0.3);">${rptCourse.split('::g::')[1]}</span>`
    : '';
  ownerEl.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    <span class="badge b-blue">${course.code}</span>${groupTag}
    <span style="font-size:0.82rem;color:var(--text2);">${course.name}</span>
    <span class="badge b-purple">${labels[rptType]}</span>
    <span style="font-size:0.73rem;color:var(--text3);">${(course.students||[]).length} students · ${course.room}</span>
    ${owner !== CU.username ? `<span class="badge b-cyan" style="font-size:0.65rem;">👤 ${owner}</span>` : ''}
  </div>`;
  const rows = (course.students||[]).map(s=>`<tr>
    <td style="padding:7px 10px;border:1px solid var(--border);font-family:var(--mono);font-size:0.7rem;text-align:center;">${s.seat}</td>
    <td style="padding:7px 10px;border:1px solid var(--border);font-size:0.78rem;">${s.name}</td>
    <td style="padding:7px 10px;border:1px solid var(--border);font-family:var(--mono);font-size:0.68rem;">${s.campusId}</td>
    <td style="padding:7px 10px;border:1px solid var(--border);width:80px;"></td>
  </tr>`).join('');
  wrap.innerHTML = `<table style="width:100%;border-collapse:collapse;">
    <thead><tr>
      <th style="padding:8px 10px;border:1px solid var(--border);background:var(--surface2);font-size:0.68rem;color:var(--text3);text-align:center;">Seat</th>
      <th style="padding:8px 10px;border:1px solid var(--border);background:var(--surface2);font-size:0.68rem;color:var(--text3);">Name</th>
      <th style="padding:8px 10px;border:1px solid var(--border);background:var(--surface2);font-size:0.68rem;color:var(--text3);">Campus ID</th>
      <th style="padding:8px 10px;border:1px solid var(--border);background:var(--surface2);font-size:0.68rem;color:var(--text3);text-align:center;">Signature</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
  document.querySelector('.export-row').innerHTML = `
    <button class="btn btn-ghost" onclick="exportRptExcel()">📥 Export Excel</button>
    <button class="btn btn-ghost" onclick="exportRptPDF()">🖨 Export PDF</button>`;
}

function exportRptExcel() {
  if (!rptCourse) { alert('Select a course first.'); return; }
  const labels = { attendance:'Attendance Sheet', monthly:'Monthly Exam Sheet', final:'Final Exam Sheet' };
  const wb = XLSX.utils.book_new();

  if (_isGroupKey(rptCourse)) {
    // تصدير كل مواد المجموعة — كل مادة في شيت مستقل
    const courses = _getGroupCourses(rptCourse);
    const gid = rptCourse.split('::group::')[1];
    if (!courses.length) { alert('No courses in this group.'); return; }
    courses.forEach(c => {
      const rows = (c.students||[]).map(s=>({'Seat No':s.seat,'Name':s.name,'Campus ID':s.campusId,'Signature':''}));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{wch:8},{wch:32},{wch:18},{wch:14}];
      const fr = rows.length + 2;
      ws[XLSX.utils.encode_cell({r:fr,c:0})] = { v:'KSAU-HS | COSHP-RM | Student Affairs', t:'s' };
      XLSX.utils.book_append_sheet(wb, ws, c.code.substring(0,31));
    });
    XLSX.writeFile(wb, `${gid}-${rptType}-all.xlsx`);
    return;
  }

  const c = getCourse(rptCourse); if (!c) return;
  const rows = (c.students||[]).map(s=>({'Seat No':s.seat,'Name':s.name,'Campus ID':s.campusId,'Signature':''}));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:8},{wch:32},{wch:18},{wch:14}];
  const fr = rows.length + 2;
  ws[XLSX.utils.encode_cell({r:fr,c:0})] = { v:'KSAU-HS | COSHP-RM | Student Affairs', t:'s' };
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet');
  XLSX.writeFile(wb, `${c.code}-${rptType}.xlsx`);
}

function exportRptPDF() {
  if (!rptCourse) { alert('Select a course first.'); return; }
  const labels = { attendance:'Attendance Sheet', monthly:'Monthly Exam Sheet', final:'Final Exam Sheet' };

  const buildTable = (c) => (c.students||[]).map(s=>`<tr>
    <td style="padding:6px 10px;border:1px solid #ccc;text-align:center;font-size:11px;">${s.seat}</td>
    <td style="padding:6px 10px;border:1px solid #ccc;font-size:12px;">${s.name}</td>
    <td style="padding:6px 10px;border:1px solid #ccc;font-size:10px;font-family:monospace;">${s.campusId}</td>
    <td style="padding:6px 10px;border:1px solid #ccc;width:80px;"></td>
  </tr>`).join('');

  const styles = `body{font-family:Arial,sans-serif;padding:24px;}
    h2{font-size:14px;margin-bottom:4px;}p{font-size:11px;color:#666;margin-bottom:12px;}
    table{width:100%;border-collapse:collapse;margin-bottom:32px;}
    th{background:#f0f0f0;padding:7px 10px;border:1px solid #ccc;font-size:10px;text-align:left;}
    .footer{font-size:9px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:8px;margin-top:16px;}`;

  if (_isGroupKey(rptCourse)) {
    const courses = _getGroupCourses(rptCourse);
    const gid = rptCourse.split('::group::')[1];
    if (!courses.length) { alert('No courses in this group.'); return; }
    const w = window.open('','_blank');
    const body = courses.map(c=>`
      <h2>${labels[rptType]} — ${c.code}</h2>
      <p>${c.name} · Room: ${c.room} · ${(c.students||[]).length} students · Date: ${new Date().toLocaleDateString('en-GB')}</p>
      <table><thead><tr><th>Seat</th><th>Name</th><th>Campus ID</th><th>Signature</th></tr></thead>
      <tbody>${buildTable(c)}</tbody></table>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head>
      <body>${body}<div class="footer">KSAU-HS | COSHP-RM | Student Affairs · Designed and developed by: Ghamdisult · 2026</div></body></html>`);
    w.document.close(); setTimeout(()=>w.print(),500);
    return;
  }

  const c = getCourse(rptCourse); if (!c) return;
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
    <h2>${labels[rptType]} — ${c.code}</h2>
    <p>${c.name} · Room: ${c.room} · ${(c.students||[]).length} students · Date: ${new Date().toLocaleDateString('en-GB')}</p>
    <table><thead><tr><th>Seat</th><th>Name</th><th>Campus ID</th><th>Signature</th></tr></thead>
    <tbody>${buildTable(c)}</tbody></table>
    <div class="footer">KSAU-HS | COSHP-RM | Student Affairs · Designed and developed by: Ghamdisult · 2026</div>
  </body></html>`);
  w.document.close(); setTimeout(()=>w.print(),500);
}

// ══════════════════════════════════════════════════════════
//  ANALYTICS — Enhanced v2
// ══════════════════════════════════════════════════════════

// Helper: is an excuse reason medical? (not counted as manual error)
function _isMedicalExcuse(reason) {
  if (!reason) return false;
  const r = reason.toLowerCase();
  // [medical] prefix set explicitly by the new excuse dialog
  if (r.startsWith('[medical]')) return true;
  return /medical|sick|ill|hospital|clinic|doctor|طبي|مريض|مستشفى|عيادة|دكتور|صحة|health|injury|جرح|إصابة/.test(r);
}

// Chart registry — destroy before re-render
const _aC = {};
function _dC(id){ if(_aC[id]){_aC[id].destroy();delete _aC[id];} }

function renderAnalytics() {
