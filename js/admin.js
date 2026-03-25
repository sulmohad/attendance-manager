  const shared = loadShared();
  const personal = loadPersonal();
  // Count sessions across all users
  const allSessions = loadAllSessions();
  document.getElementById('adUsers').textContent    = shared.users.length;
  const allAdminCourses = getAllCoursesForUser(CU.username);
  document.getElementById('adCourses').textContent  = allAdminCourses.length;
  document.getElementById('adSessions').textfunction openAdmin() {
  const shared = loadShared();
  const personal = loadPersonal();
  // Count sessions across all users
  const allSessions = loadAllSessions();
  document.getElementById('adUsers').textContent    = shared.users.length;
  const allAdminCourses = getAllCoursesForUser(CU.username);
  document.getElementById('adCourses').textContent  = allAdminCourses.length;
  document.getElementById('adSessions').textContent = allSessions.length;
  renderUsersTable();
  document.getElementById('adminOverlay').classList.add('show');
}

function closeAdmin() { document.getElementById('adminOverlay').classList.remove('show'); _editingUserIdx=null; }

function renderUsersTable() {
  const shared = loadShared();
  const tbody = document.getElementById('usersBody');
  const d = { users: shared.users };
  const ROLE_BADGE = { admin:'b-purple', teamlead:'b-cyan', user:'b-blue' };
  const ROLE_LABEL = { admin:'Admin', teamlead:'Team Lead', user:'User' };

  tbody.innerHTML = d.users.map((u, i) => {
    const isMe = u.username === CU.username;
    const teamStr = (u.team||[]).join(', ') || '—';
    return `<tr style="${u.enabled===false?'opacity:0.5':''}">
      <td>
        <div style="font-weight:500;">${u.username}</div>
        ${u.role==='teamlead'?`<div style="font-size:0.65rem;color:var(--text3);">Team: ${teamStr}</div>`:''}
      </td>
      <td><span class="badge ${ROLE_BADGE[u.role]||'b-blue'}">${ROLE_LABEL[u.role]||u.role}</span></td>
      <td style="font-size:0.7rem;color:var(--text3);font-family:var(--mono);">${u.lastLogin?new Date(u.lastLogin).toLocaleDateString('en-GB'):'—'}</td>
      <td style="font-size:0.7rem;color:${u.enabled===false?'var(--red)':'var(--green)'};">${u.enabled===false?'Disabled':'Active'}</td>
      <td>
        ${!isMe ? `
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="btn btn-ghost" style="padding:2px 7px;font-size:0.68rem;" onclick="editUser(${i})">✏️ Edit</button>
            <button class="btn btn-ghost" style="padding:2px 7px;font-size:0.68rem;" onclick="toggleUserEnabled(${i})">${u.enabled===false?'Enable':'Disable'}</button>
            <button class="btn btn-danger" style="padding:2px 7px;font-size:0.68rem;" onclick="delUser(${i})">Remove</button>
          </div>` : '<span style="font-size:0.72rem;color:var(--text3);">You</span>'}
      </td>
    </tr>`;
  }).join('');
}

function editUser(idx) {
  _editingUserIdx = idx;
  const d = loadShared();
  const u = d.users[idx];
  document.getElementById('nuName').value = u.username;
  document.getElementById('nuPass').value = '';
  document.getElementById('nuRole').value = u.role || 'user';
  renderTeamSelector(u);
  document.getElementById('editUserPanel').style.display = 'block';
  document.getElementById('saveEditBtn').style.display = 'inline-flex';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
  document.getElementById('nuName').disabled = true; // cant change username
}

function renderTeamSelector(u) {
  const shared = loadShared();
  const wrap = document.getElementById('teamSelectorWrap');
  if ((document.getElementById('nuRole').value || u.role) !== 'teamlead') {
    wrap.style.display = 'none'; return;
  }
  wrap.style.display = 'block';
  const otherUsers = shared.users.filter(x => x.username !== u.username && x.role !== 'admin');
  const currentTeam = u.team || [];
  document.getElementById('teamMembersList').innerHTML = otherUsers.map(x => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface2);border-radius:6px;cursor:pointer;font-size:0.8rem;">
      <input type="checkbox" value="${x.username}" ${currentTeam.includes(x.username)?'checked':''} />
      ${x.username} <span class="badge b-blue" style="font-size:0.62rem;">${x.role}</span>
    </label>`).join('');
}

function saveEditUser() {
  const shared = loadShared();
  const idx = _editingUserIdx;
  if (idx === null) return;
  const u = shared.users[idx];
  const newPass = document.getElementById('nuPass').value;
  const newRole = document.getElementById('nuRole').value;
  if (newPass) u.password = newPass;
  u.role = newRole;
  if (newRole === 'teamlead') {
    const checks = document.querySelectorAll('#teamMembersList input[type=checkbox]');
    u.team = Array.from(checks).filter(c=>c.checked).map(c=>c.value);
  } else {
    u.team = [];
  }
  saveShared(shared); _editingUserIdx = null;
  document.getElementById('editUserPanel').style.display = 'none';
  document.getElementById('saveEditBtn').style.display = 'none';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('nuName').disabled = false;
  document.getElementById('nuName').value = '';
  document.getElementById('nuPass').value = '';
  renderUsersTable();
  alert('✅ User updated!');
}

function cancelEdit() {
  _editingUserIdx = null;
  document.getElementById('editUserPanel').style.display = 'none';
  document.getElementById('saveEditBtn').style.display = 'none';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('nuName').disabled = false;
  document.getElementById('nuName').value = '';
  document.getElementById('nuPass').value = '';
}

function toggleUserEnabled(idx) {
  const shared = loadShared();
  shared.users[idx].enabled = shared.users[idx].enabled === false ? true : false;
  saveShared(shared); renderUsersTable();
}

function addUser() {
  if (_editingUserIdx !== null) { saveEditUser(); return; }
  const n = document.getElementById('nuName').value.trim();
  const p = document.getElementById('nuPass').value;
  const r = document.getElementById('nuRole').value || 'user';
  if (!n||!p) { alert('Fill username and password.'); return; }
  const shared = loadShared();
  if (shared.users.find(u=>u.username===n)) { alert('Username already exists.'); return; }
  const newUser = {username:n,password:p,role:r,lastLogin:null,enabled:true,team:[]};
  if (r === 'teamlead') {
    const checks = document.querySelectorAll('#teamMembersList input[type=checkbox]');
    newUser.team = Array.from(checks).filter(c=>c.checked).map(c=>c.value);
  }
  shared.users.push(newUser);
  saveShared(shared);
  document.getElementById('nuName').value='';
  document.getElementById('nuPass').value='';
  document.getElementById('nuRole').value='user';
  document.getElementById('teamSelectorWrap').style.display='none';
  renderUsersTable();
  alert(`✅ User "${n}" created as ${r}`);
}

function delUser(i) {
  const shared=loadShared();
  if (!confirm(`Remove "${shared.users[i].username}"?`)) return;
  const removed = shared.users[i].username;
  shared.users.splice(i,1);
  saveShared(shared);
  // Clear their personal data
  localStorage.removeItem(SK_USER(removed));
  renderUsersTable();
}

function extendAll() {
  const shared = loadShared();
  shared.users.forEach(u => {
    const p = loadPersonal(u.username);
    p.term.weeks = (p.term.weeks||16)+1;
    savePersonal(p, u.username);
  });
  // Also extend current user's view
  const p = loadPersonal();
  alert(`✅ Term extended to ${p.term.weeks} weeks for all users.`);
  renderSched();
}

function clearAll() {
  if (!confirm('⚠️ Clear ALL personal data for ALL users? (courses, schedule, sessions, term)')) return;
  if (!confirm('This cannot be undone. Confirm?')) return;
  const shared = loadShared();
  shared.users.forEach(u => {
    savePersonal(initPersonal(), u.username);
  });
  closeAdmin(); initApp(); alert('✅ All personal data cleared for all users.');
}

// ══════════════════════════════════════════════════════════
//  STUDENTS PAGE
// ══════════════════════════════════════════════════════════
let _currentStudent = null;

function renderStudentsPage() {
  const allCourses = loadAccessibleCourses();
  const sel = document.getElementById('studentCourseFilter');
  sel.innerHTML = '<option value="">All Courses</option>';
  Object.entries(allCourses).forEach(([k, c]) => {
    sel.innerHTML += `<option value="${k}">${c.code}${k.includes('::')?` (${k.split('::')[0]})`:''}`;
  });
  // Show NO SHOW banner
  renderNoShowBanner();
  // Reset detail
  document.getElementById('studentDetailPanel').style.display = 'none';
  document.getElementById('studentSearchResults').innerHTML = '<div class="empty">Start typing to search...</div>';
}

function searchStudents() {
  const q = document.getElementById('studentSearch').value.trim().toLowerCase();
  const courseFilter = document.getElementById('studentCourseFilter').value;
  const d = load();
  const results = document.getElementById('studentSearchResults');

  if (!q && !courseFilter) {
    results.innerHTML = '<div class="empty">Start typing to search...</div>'; return;
  }

  // Build student index from accessible courses
  const allCourses = loadAccessibleCourses();
  const studentMap = {}; // campusId -> {name, courses[]}

  Object.entries(allCourses).forEach(([k, c]) => {
    if (courseFilter && k !== courseFilter) return;
    (c.students||[]).forEach(s => {
      if (!studentMap[s.campusId]) studentMap[s.campusId] = { name:s.name, campusId:s.campusId, courses:[] };
      const label = c.code + (k.includes('::')?` (${k.split('::')[0]})`:'');
      if (!studentMap[s.campusId].courses.includes(label)) studentMap[s.campusId].courses.push(label);
    });
  });

  const matches = Object.values(studentMap).filter(s =>
    !q || s.campusId.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  ).slice(0, 20);

  if (!matches.length) { results.innerHTML='<div class="empty">No students found</div>'; return; }

  // Check NO SHOW status
  const noShows = getNoShowStudents();

  results.innerHTML = matches.map(s => {
    const isNoShow = noShows.some(ns => ns.campusId === s.campusId);
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface2);border:1px solid ${isNoShow?'rgba(239,68,68,0.4)':'var(--border)'};border-radius:var(--r);cursor:pointer;transition:border-color 0.15s;"
      onclick="openStudentDetail('${s.campusId}')">
      <div style="flex:1;">
        <div style="font-size:0.82rem;font-weight:500;">${s.name}</div>
        <div style="font-size:0.68rem;color:var(--text3);font-family:var(--mono);">${s.campusId}</div>
      </div>
      <div style="font-size:0.7rem;color:var(--text3);">${s.courses.join(', ')}</div>
      ${isNoShow?'<span class="badge b-red" style="font-size:0.62rem;">NO SHOW</span>':''}
    </div>`;
  }).join('');
}

function getNoShowStudents() {
  const d = load();
  const groupId = d.activeGroup;
  // جمع الطلاب — فقط من المجموعة النشطة إن وجدت
  const courses = groupId && d.groups?.[groupId]
    ? d.groups[groupId].courses
    : loadAccessibleCourses();
  const studentMap = {};
  Object.values(courses).forEach(c => {
    (c.students||[]).forEach(s => {
      if (!studentMap[s.campusId]) studentMap[s.campusId] = { name:s.name, campusId:s.campusId, seenElectronic:false };
    });
  });
  // Mark as seen — فقط جلسات المجموعة النشطة
  const allSessions = loadAllSessions();
  allSessions
    .filter(s => !groupId || !s.groupId || s.groupId === groupId)
    .forEach(sess => {
      if (sess.studentDetails) {
        sess.studentDetails.forEach(sd => {
          if (sd.status !== 'Absent' && studentMap[sd.campusId]) {
            studentMap[sd.campusId].seenElectronic = true;
          }
        });
      }
    });
  return Object.values(studentMap).filter(s => !s.seenElectronic);
}

function renderNoShowBanner() {
  const noShows = getNoShowStudents();
  const banner = document.getElementById('noShowBanner');
  if (!noShows.length) { banner.style.display='none'; return; }
  banner.style.display = 'block';
  document.getElementById('noShowList').innerHTML = noShows.slice(0,10).map(s => `
    <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--surface2);border-radius:6px;font-size:0.78rem;cursor:pointer;"
      onclick="openStudentDetail('${s.campusId}')">
      <span class="badge b-red" style="font-size:0.6rem;">NO SHOW</span>
      <span style="font-weight:500;">${s.name}</span>
      <span style="color:var(--text3);font-family:var(--mono);font-size:0.68rem;">${s.campusId}</span>
    </div>`).join('') +
    (noShows.length>10?`<div style="font-size:0.72rem;color:var(--text3);padding:6px 10px;">+ ${noShows.length-10} more...</div>`:'');
}

function openStudentDetail(campusId) {
  const d = load();
  // Find student info across all accessible courses
  let studentInfo = null;
  const allCourses2 = loadAccessibleCourses();
  Object.values(allCourses2).forEach(c => {
    const s = (c.students||[]).find(s=>s.campusId===campusId);
    if (s && !studentInfo) studentInfo = s;
  });
  if (!studentInfo) return;
  _currentStudent = campusId;

  document.getElementById('studentDetailName').textContent = studentInfo.name;
  document.getElementById('studentDetailId').textContent = campusId;

  // NO SHOW badge
  const noShows = getNoShowStudents();
  const nsEl = document.getElementById('studentNoShowBadge');
  nsEl.style.display = noShows.some(s=>s.campusId===campusId) ? 'inline-flex' : 'none';

  // Populate course filter
  const sel = document.getElementById('studentDetailCourse');
  sel.innerHTML = '<option value="">All Courses</option>';
  const allCoursesForStudent = {};
  if (d.groups) { Object.values(d.groups).forEach(g => Object.assign(allCoursesForStudent, g.courses||{})); }
  else { Object.assign(allCoursesForStudent, d.courses||{}); }
  Object.keys(allCoursesForStudent).forEach(k => {
    const inCourse = (allCoursesForStudent[k].students||[]).some(s=>s.campusId===campusId);
    if (inCourse) sel.innerHTML += `<option value="${k}">${allCoursesForStudent[k].code}</option>`;
  });

  document.getElementById('studentDetailPanel').style.display = 'block';
  document.getElementById('studentSearchResults').style.display = 'none';
  document.querySelector('.card:has(#studentSearch)') && (document.querySelector('.card:has(#studentSearch)').style.display='none');
  renderStudentSummary(campusId);
  renderStudentHistory();
}

function closeStudentDetail() {
  _currentStudent = null;
  document.getElementById('studentDetailPanel').style.display = 'none';
  const searchCard = document.getElementById('studentSearch')?.closest('.card');
  if (searchCard) searchCard.style.display = 'block';
  document.getElementById('studentSearchResults').style.display = 'flex';
}

function renderStudentSummary(campusId) {
  const cards = document.getElementById('studentSummaryCards');
  const courseSummary = {};
  const allCourses3 = loadAccessibleCourses();

  Object.entries(allCourses3).forEach(([k, c]) => {
    const inCourse = (c.students||[]).some(s=>s.campusId===campusId);
    if (inCourse) courseSummary[k] = { total:0, absent:0, escaped:0, excused:0, code:c.code };
  });

  const allSessions2 = loadAllSessions();
  allSessions2.forEach(sess => {
    if (!sess.studentDetails) return;
    const sd = sess.studentDetails.find(s=>s.campusId===campusId);
    if (!sd) return;
    // Match session course to summary key (handle prefixed keys)
    const matchKey = Object.keys(courseSummary).find(k => {
      const {key} = resolveCourseKey(k);
      return key === sess.courseCode && (k.includes('::')?k.split('::')[0]===sess._owner:sess._owner===CU.username);
    }) || sess.courseCode;
    if (!courseSummary[matchKey]) return;
    courseSummary[matchKey].total++;
    if (sd.status==='Absent')   courseSummary[matchKey].absent++;
    if (sd.status==='Escaped')  courseSummary[matchKey].escaped++;
    if (sd.status==='Excused')  courseSummary[matchKey].excused++;
  });

  cards.innerHTML = Object.entries(courseSummary).map(([k, s]) => {
    const c = allCourses3[k] || {code:s.code||k};
    const absPct = s.total ? Math.round((s.absent+s.escaped)/s.total*100) : 0;
    const color = absPct>=33?'var(--red)':absPct>=20?'var(--yellow)':'var(--green)';
    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px;text-align:center;">
      <div style="font-size:0.7rem;color:var(--text3);font-family:var(--mono);margin-bottom:4px;">${k}</div>
      <div style="font-size:1.5rem;font-weight:700;font-family:var(--mono);color:${color};">${absPct}%</div>
      <div style="font-size:0.68rem;color:var(--text3);">absent · ${s.absent+s.escaped} of ${s.total}</div>
    </div>`;
  }).join('') || '<div class="empty">No sessions recorded</div>';
}

function renderStudentHistory() {
  const d = load();
  const campusId = _currentStudent;
  const courseFilter = document.getElementById('studentDetailCourse').value;
  const showStaff = isAdmin() || isTeamLead();

  // Show/hide staff column
  document.getElementById('staffColHeader').style.display = showStaff ? '' : 'none';

  const rows = [];
  const allSess = loadAllSessions();
  allSess.forEach(sess => {
    if (courseFilter && sess.courseCode !== courseFilter) return;
    if (!sess.studentDetails) return;
    const sd = sess.studentDetails.find(s=>s.campusId===campusId);
    if (!sd || sd.status==='Present') return;
    rows.push({date:sess.date, course:sess.courseCode, status:sd.status, staff:sess.staff});
  });

  rows.sort((a,b) => b.date.localeCompare(a.date));

  const STATUS_BADGE = {
    'Absent':        'b-red',
    'Escaped':       'b-yellow',
    'Not Registered':'b-green',
    'Excused':       'b-cyan'
  };

  const tbody = document.getElementById('studentHistoryBody');
  if (!rows.length) { tbody.innerHTML='<tr><td colspan="4" class="empty">No absences recorded</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => `<tr>
    <td style="padding:7px 10px;border:1px solid var(--border);font-family:var(--mono);font-size:0.72rem;">${r.date}</td>
    <td style="padding:7px 10px;border:1px solid var(--border);"><span class="badge b-blue" style="font-size:0.65rem;">${r.course}</span></td>
    <td style="padding:7px 10px;border:1px solid var(--border);"><span class="badge ${STATUS_BADGE[r.status]||'b-blue'}" style="font-size:0.65rem;">${r.status}</span></td>
    ${showStaff?`<td style="padding:7px 10px;border:1px solid var(--border);font-size:0.72rem;color:var(--text3);">${r.staff||'—'}</td>`:''}
  </tr>`).join('');
}

function exportStudentReport() {
  if (!_currentStudent) return;
  let studentName = '';
  getAllCoursesForUser(CU.username).forEach(c => {
    const s = (c.students||[]).find(s=>s.campusId===_currentStudent);
    if (s && !studentName) studentName = s.name;
  });
  const rows = [];
  const allSess = loadAllSessions();
  allSess.forEach(sess => {
    if (!sess.studentDetails) return;
    const sd = sess.studentDetails.find(s=>s.campusId===_currentStudent);
    if (!sd) return;
    const row = {'Date':sess.date,'Course':sess.courseCode,'Status':sd.status};
    if (isAdmin() || isTeamLead()) row['Staff'] = sess.staff||'';
    rows.push(row);
  });
  if (!rows.length) { alert('No data to export.'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Report');
  XLSX.writeFile(wb,`student-${_currentStudent}.xlsx`);
}

function exportNoShowReport() {
  const noShows = getNoShowStudents();
  if (!noShows.length) { alert('No NO SHOW students.'); return; }
  const d = load();
  const wn = getWeekNum() || '—';
  const rows = noShows.map(s => ({
    'Week': wn,
    'Name': s.name,
    'Campus ID': s.campusId,
    'Group': 'COSHP-MAB/MHB'
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'NO SHOW');
  XLSX.writeFile(wb,`no-show-week${wn}.xlsx`);
}


// ══════════════════════════════════════════════════════════
//  ELECTRONIC ONLY MODE
// ══════════════════════════════════════════════════════════
function showElectronicOnly() { setAttMode('electronic'); }

function setAttMode(mode) {
  _attMode = mode;
  const MODES = {
    manual:      { el:'modeManual',      color:'var(--green)',  bg:'var(--green-dim)',  border:'var(--green)' },
    electronic:  { el:'modeElectronic',  color:'var(--cyan)',   bg:'rgba(6,182,212,0.1)', border:'var(--cyan)' },
    latemanual:  { el:'modeLateManual',  color:'var(--yellow)', bg:'var(--yellow-dim)', border:'var(--yellow)' },
  };

  // Reset all mode buttons
  Object.entries(MODES).forEach(([m, cfg]) => {
    const el = document.getElementById(cfg.el);
    if (!el) return;
    if (m === mode) {
      el.style.background = cfg.bg;
      el.style.borderColor = cfg.border;
      el.querySelector('div:nth-child(2)').style.color = cfg.color;
    } else {
      el.style.background = 'var(--surface2)';
      el.style.borderColor = 'var(--border)';
      el.querySelector('div:nth-child(2)').style.color = 'var(--text2)';
    }
  });

  // Show/hide extra fields
  const extra = document.getElementById('modeExtraFields');
  const extraM = document.getElementById('extraManual');
  const extraE = document.getElementById('extraElectronic');
  const extraL = document.getElementById('extraLateManual');
  if (extra) {
    if (extraM) extraM.style.display = mode === 'manual' ? 'block' : 'none';
    if (extraE) extraE.style.display = mode === 'electronic' ? 'block' : 'none';
    if (extraL) extraL.style.display = mode === 'latemanual' ? 'block' : 'none';
    extra.style.display = 'block';
    // Populate coveredBy dropdown when switching to electronic
    if (mode === 'electronic') populateCoveredByList();
  }

  // Show/hide manual attendance grid
  const manualCard = document.getElementById('attGrid')?.closest('.card');
  if (manualCard) {
    manualCard.style.opacity = mode === 'electronic' ? '0.4' : '1';
    manualCard.style.pointerEvents = mode === 'electronic' ? 'none' : '';
  }

  // Update match button
  const btn = document.getElementById('matchBtn');
  if (btn) {
    if (mode === 'electronic') btn.textContent = '⚡ Process Electronic Attendance';
    else if (mode === 'latemanual') btn.textContent = '📋 Save Manual Only Attendance';
    else btn.textContent = '⚡ Match & Show Results';
  }
}

// ══════════════════════════════════════════════════════════
//  REPORTS — ADDITIONAL TYPES
// ══════════════════════════════════════════════════════════

// NO SHOW Weekly Report
function exportNoShowReportFull(scope) {
  // scope: 'own' | 'team' | 'all'
  const noShows = getNoShowStudents();
  const d = load();
  const wn = getWeekNum() || '—';

  let filtered = noShows;
  if (scope === 'own') {
    // Only students in courses this user manages
    const ownCourses = new Set(Object.keys(d.courses));
    filtered = noShows.filter(s => {
      const allC = Object.assign({}, d.courses||{});
      if (d.groups) Object.values(d.groups).forEach(g => Object.assign(allC, g.courses||{}));
      return Object.keys(allC).some(k => (allC[k].students||[]).some(st=>st.campusId===s.campusId));
    });
  }

  if (!filtered.length) { alert('No NO SHOW students found.'); return; }

  const rows = filtered.map(s => ({
    'Week Number': `Week ${wn}`,
    'Name': s.name,
    'Campus ID': s.campusId,
    'Group': 'COSHP-MAB/MHB',
    'Status': 'NO SHOW — Never appeared in any session'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // Style header
  const range = XLSX.utils.decode_range(ws['!ref']);
  ws['!cols'] = [{wch:12},{wch:30},{wch:18},{wch:18},{wch:45}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `NO SHOW W${wn}`);
  XLSX.writeFile(wb, `no-show-week${wn}-${scope}.xlsx`);
}

// Biweekly Report
function exportBiweeklyReport(scope) {
  // scope: 'own' | 'user:username' | 'all'
  const d = load();
  const wn = getWeekNum();
  const week1 = wn ? wn-1 : 1;
  const week2 = wn || 2;

  // Get sessions for last 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const cutoff = twoWeeksAgo.toISOString().split('T')[0];

  const getSessionsForUser = (username) => {
    return d.sessions.filter(s => s.staff === username && s.date >= cutoff);
  };

  const buildUserSheet = (username) => {
    const sessions = getSessionsForUser(username);
    const rows = [];

    // Get all expected lectures for this user (from schedule)
    // Group by week
    const sessMap = {};
    sessions.forEach(s => {
      const key = `${s.courseCode}|${s.date}`;
      sessMap[key] = s;
    });

    // Add recorded sessions
    sessions.forEach(s => {
      rows.push({
        'Week': getSessionWeekNum(s.date) || '—',
        'Date': s.date,
        'Group': s.groupId || '—',
        'Course': s.courseCode,
        'Staff': username,
        'Type': s.electronicOnly ? '⚡ Electronic Only' : '✅ Manual + Electronic',
        'Covered By': s.coveredBy || '',
        'Total Students': s.total || 0,
        'Absent': (s.electronicAbsent||0),
        'Escaped': s.escaped || 0,
        'Excused': s.excused || 0,
        'Accuracy %': s.accuracy || 0,
        'Note': s.note || ''
      });
    });

    if (!rows.length) {
      rows.push({'Week':'—','Date':'—','Course':'No sessions recorded','Staff':username,'Type':'❌ Not recorded','Covered By':'','Total Students':0,'Absent':0,'Escaped':0,'Excused':0,'Accuracy %':0,'Note':''});
    }
    return rows;
  };

  const wb = XLSX.utils.book_new();

  if (scope === 'own') {
    const rows = buildUserSheet(CU.username);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:8},{wch:12},{wch:10},{wch:14},{wch:12},{wch:22},{wch:14},{wch:8},{wch:8},{wch:8},{wch:8},{wch:10},{wch:30}];
    XLSX.utils.book_append_sheet(wb, ws, CU.username);
    XLSX.writeFile(wb, `biweekly-${CU.username}-w${week1}-${week2}.xlsx`);
    return;
  }

  if (scope === 'all' && isAdmin()) {
    // All users - one sheet each + summary
    const summaryRows = [];
    d.users.forEach(u => {
      const rows = buildUserSheet(u.username);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{wch:8},{wch:12},{wch:10},{wch:14},{wch:12},{wch:22},{wch:14},{wch:8},{wch:8},{wch:8},{wch:8},{wch:10},{wch:30}];
      XLSX.utils.book_append_sheet(wb, ws, u.username.substring(0,31));

      // Summary row
      const recorded = d.sessions.filter(s=>s.staff===u.username && s.date>=cutoff).length;
      const compliance = recorded > 0 ? Math.round((d.sessions.filter(s=>s.staff===u.username&&s.date>=cutoff&&!s.electronicOnly).length/recorded)*100) : 0;
      summaryRows.push({
        'Staff': u.username,
        'Role': u.role,
        'Sessions Recorded': recorded,
        'Manual+Electronic': d.sessions.filter(s=>s.staff===u.username&&s.date>=cutoff&&!s.electronicOnly).length,
        'Electronic Only': d.sessions.filter(s=>s.staff===u.username&&s.date>=cutoff&&s.electronicOnly).length,
        'Not Recorded': '—',
        'Manual Compliance %': compliance
      });
    });

    // Summary sheet first
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summaryWs, '📊 Summary');
    // Move summary to first position
    wb.SheetNames = ['📊 Summary', ...wb.SheetNames.filter(s=>s!=='📊 Summary')];

    XLSX.writeFile(wb, `biweekly-ALL-w${week1}-${week2}.xlsx`);
    return;
  }

  // Single user (admin viewing another user)
  const target = scope.replace('user:','');
  const rows = buildUserSheet(target);
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, target);
  XLSX.writeFile(wb, `biweekly-${target}-w${week1}-${week2}.xlsx`);
}

function getSessionWeekNum(dateStr) {
  const d = load();
  if (!d.term.start) return null;
  const start = new Date(d.term.start);
  const sess = new Date(dateStr);
  const diff = Math.floor((sess-start)/(7*24*3600*1000));
  return diff>=0 ? diff+1 : null;
}

// ══════════════════════════════════════════════════════════
//  NO SHOW — Versioned export (Simple / Detailed)
// ══════════════════════════════════════════════════════════
function exportNoShowVersioned(version, scope) {
  // version: 'simple' | 'detailed'
  // scope: 'own' | 'all'
  const wn = getWeekNum() || '—';
  const shared = loadShared();
  const allSessions = loadAllSessions();

  // Collect all students across accessible users
  const accessUsers = scope === 'own' ? [CU.username] : accessibleUsernames();

  // Build a map: campusId -> {name, courseCode, courseName, staffUsername, lastSeen}
  const studentMap = {}; // campusId -> info

  for (const uname of accessUsers) {
    if (!uname) continue;
    getAllCoursesForUser(uname).forEach(course => {
      (course.students || []).forEach(st => {
        if (!studentMap[st.campusId]) {
          studentMap[st.campusId] = {
            name: st.name,
            campusId: st.campusId,
            courseCode: course.code,
            courseName: course.name,
            staff: uname,
            lastSeen: null
          };
        }
      });
    });
  }

  // Check if student ever appeared (not absent) in any session
  const appearedIds = new Set();
  const lastSeenMap = {};

  allSessions.forEach(sess => {
    if (!accessUsers.includes(sess._owner)) return;
    (sess.studentDetails || []).forEach(sd => {
      if (sd.status !== 'Absent') {
        appearedIds.add(sd.campusId);
        // Track last seen date
        if (!lastSeenMap[sd.campusId] || sess.date > lastSeenMap[sd.campusId]) {
          lastSeenMap[sd.campusId] = sess.date;
        }
      }
    });
  });

  // Filter NO SHOWs
  const noShows = Object.values(studentMap).filter(s => !appearedIds.has(s.campusId));

  if (!noShows.length) { alert('No NO SHOW students found.'); return; }

  let rows;
  if (version === 'simple') {
    rows = noShows.map(s => ({
      'Week': `Week ${wn}`,
      'Name': s.name,
      'Campus ID': s.campusId,
      'Group': 'COSHP-MAB/MHB'
    }));
  } else {
    rows = noShows.map(s => ({
      'Week': `Week ${wn}`,
      'Name': s.name,
      'Campus ID': s.campusId,
      'Group': 'COSHP-MAB/MHB',
      'Course': s.courseCode,
      'Last Seen': lastSeenMap[s.campusId] || 'Never',
      'Responsible Staff': s.staff
    }));
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = version === 'simple'
    ? [{wch:10},{wch:30},{wch:16},{wch:18}]
    : [{wch:10},{wch:30},{wch:16},{wch:18},{wch:14},{wch:14},{wch:18}];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `NO SHOW W${wn}`);

  // Footer row
  const footerRowIdx = rows.length + 2;
  const footerCell = XLSX.utils.encode_cell({r: footerRowIdx, c: 0});
  ws[footerCell] = { v: 'KSAU-HS | COSHP-RM | Student Affairs', t: 's' };

  XLSX.writeFile(wb, `no-show-w${wn}-${version}-${scope}.xlsx`);
}

// ══════════════════════════════════════════════════════════
//  BIWEEKLY — Versioned export (Personal / Unified)
// ══════════════════════════════════════════════════════════
function exportBiweeklyVersioned(version) {
  // version: 'personal' | 'unified'
  const wn = getWeekNum();
  const week2 = wn || 2;
  const week1 = Math.max(1, week2 - 1);

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const cutoff = twoWeeksAgo.toISOString().split('T')[0];

  const typeLabel = (s) => {
    if (s.lateManual) return 'Manual Only';
    if (s.electronicOnly) return 'Electronic Only';
    return 'Manual + Electronic';
  };

  if (version === 'personal') {
    const d = load();
    const sessions = (d.sessions || []).filter(s => s.date >= cutoff);
    const rows = sessions.map(s => ({
      'Week': getSessionWeekNum(s.date) || '—',
      'Date': s.date,
      'Course': s.courseCode,
      'Course Name': s.courseName || '',
      'Type': typeLabel(s),
      'Covered By': s.coveredBy || '',
      'Total Students': s.total || 0,
      'Absent': s.electronicAbsent || 0,
      'Escaped': s.escaped || 0,
      'Excused': s.excused || 0,
      'Accuracy %': s.accuracy || 0,
      'Note': s.note || ''
    }));

    if (!rows.length) { alert('No sessions recorded in the last 2 weeks.'); return; }

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:8},{wch:12},{wch:12},{wch:24},{wch:20},{wch:16},{wch:8},{wch:8},{wch:8},{wch:8},{wch:12},{wch:30}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, CU.username);

    // Footer
    const fr = rows.length + 2;
    ws[XLSX.utils.encode_cell({r:fr,c:0})] = { v: 'KSAU-HS | COSHP-RM | Student Affairs', t:'s' };

    XLSX.writeFile(wb, `biweekly-personal-${CU.username}-w${week1}-${week2}.xlsx`);
    return;
  }

  if (version === 'unified' && isAdmin()) {
    const shared = loadShared();
    const allSessions = loadAllSessions();
    const wb = XLSX.utils.book_new();
    const summaryRows = [];

    shared.users.forEach(u => {
      const userSess = allSessions.filter(s => s._owner === u.username && s.date >= cutoff);
      const manual = userSess.filter(s => !s.electronicOnly && !s.lateManual).length;
      const elec   = userSess.filter(s => s.electronicOnly).length;
      const late   = userSess.filter(s => s.lateManual).length;
      const total  = userSess.length;
      const compliance = total > 0 ? Math.round((manual / total) * 100) : 0;

      summaryRows.push({
        'Staff': u.username,
        'Role': u.role,
        'Total Sessions': total,
        'Manual + Electronic': manual,
        'Electronic Only': elec,
        'Manual Only': late,
        'Compliance %': compliance + '%'
      });

      // Individual sheet per user
      const rows = userSess.map(s => ({
        'Week': getSessionWeekNum(s.date) || '—',
        'Date': s.date,
        'Course': s.courseCode,
        'Type': typeLabel(s),
        'Students': s.total || 0,
        'Absent': s.electronicAbsent || 0,
        'Accuracy %': s.accuracy || 0
      }));
      if (rows.length) {
        const ws2 = XLSX.utils.json_to_sheet(rows);
        ws2['!cols'] = [{wch:8},{wch:12},{wch:14},{wch:20},{wch:10},{wch:8},{wch:12}];
        XLSX.utils.book_append_sheet(wb, ws2, u.username.substring(0,31));
      }
    });

    // Summary sheet first
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs['!cols'] = [{wch:18},{wch:12},{wch:16},{wch:20},{wch:16},{wch:14},{wch:14}];

    // Footer in summary
    const fr = summaryRows.length + 2;
    summaryWs[XLSX.utils.encode_cell({r:fr,c:0})] = { v: 'KSAU-HS | COSHP-RM | Student Affairs', t:'s' };

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    wb.SheetNames = ['Summary', ...wb.SheetNames.filter(s => s !== 'Summary')];

    XLSX.writeFile(wb, `biweekly-unified-w${week1}-${week2}.xlsx`);
  }
}

// ══════════════════════════════════════════════════════════
//  REPORTS PAGE — UPDATE WITH NEW TYPES
// ══════════════════════════════════════════════════════════
function showReportModal(type) {
  const overlay = document.getElementById('reportModalOverlay');
  const body = document.getElementById('reportModalBody');
  const wn = getWeekNum() || '—';
  const canDetailed = isAdmin() || isTeamLead();

  if (type === 'noshow') {
    body.innerHTML = `
      <div style="font-size:0.88rem;font-weight:700;margin-bottom:4px;">🚨 NO SHOW Weekly Report</div>
      <div style="font-size:0.73rem;color:var(--text3);margin-bottom:16px;">Week ${wn} · Students absent from all sessions</div>

      <div style="display:flex;flex-direction:column;gap:10px;">

        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;">
          <div style="font-size:0.78rem;font-weight:600;margin-bottom:4px;">📋 Simple Report</div>
          <div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">
            Name · Campus ID · Group · Week — available to all staff
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="btn btn-primary btn-full" onclick="exportNoShowVersioned('simple','own');closeReportModal()">
              📥 My Courses
            </button>
            ${canDetailed?`<button class="btn btn-ghost btn-full" onclick="exportNoShowVersioned('simple','all');closeReportModal()">
              📥 ${isTeamLead()?'My Team':'All Staff'}
            </button>`:''}
          </div>
        </div>

        ${canDetailed ? `<div style="background:var(--surface2);border:1px solid rgba(168,85,247,0.3);border-radius:var(--r);padding:12px 14px;">
          <div style="font-size:0.78rem;font-weight:600;margin-bottom:4px;color:var(--purple);">🔍 Detailed Report <span class="badge b-purple" style="font-size:0.6rem;vertical-align:middle;">${isTeamLead()?'Team Lead':'Admin'}</span></div>
          <div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">
            Adds: Last Seen · Responsible Staff
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="btn btn-ghost btn-full" style="border-color:rgba(168,85,247,0.4);color:var(--purple);"
              onclick="exportNoShowVersioned('detailed','own');closeReportModal()">
              📥 My Courses (Detailed)
            </button>
            <button class="btn btn-ghost btn-full" style="border-color:rgba(168,85,247,0.4);color:var(--purple);"
              onclick="exportNoShowVersioned('detailed','all');closeReportModal()">
              📥 ${isTeamLead()?'My Team':'All Staff'} (Detailed)
            </button>
          </div>
        </div>` : ''}

      </div>`;
  }

  if (type === 'biweekly') {
    const wn2 = typeof wn === 'number' ? wn : 2;
    body.innerHTML = `
      <div style="font-size:0.88rem;font-weight:700;margin-bottom:4px;">📊 Biweekly Staff Report</div>
      <div style="font-size:0.73rem;color:var(--text3);margin-bottom:16px;">Weeks ${Math.max(1,wn2-1)}–${wn2}</div>

      <div style="display:flex;flex-direction:column;gap:10px;">

        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;">
          <div style="font-size:0.78rem;font-weight:600;margin-bottom:4px;">👤 Personal Report</div>
          <div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">
            Your sessions · Course · Date · Type (Manual / Electronic / Manual Only) · Students · Absent
          </div>
          <button class="btn btn-primary btn-full" onclick="exportBiweeklyVersioned('personal');closeReportModal()">
            📥 Export My Report
          </button>
        </div>

        ${isAdmin() ? `<div style="background:var(--surface2);border:1px solid rgba(168,85,247,0.3);border-radius:var(--r);padding:12px 14px;">
          <div style="font-size:0.78rem;font-weight:600;margin-bottom:4px;color:var(--purple);">📊 Unified Report <span class="badge b-purple" style="font-size:0.6rem;vertical-align:middle;">Admin</span></div>
          <div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">
            All staff summary · Sessions · Manual / Electronic / Manual Only breakdown · Compliance %
          </div>
          <button class="btn btn-ghost btn-full" style="border-color:rgba(168,85,247,0.4);color:var(--purple);"
            onclick="exportBiweeklyVersioned('unified');closeReportModal()">
            📥 Export Unified Report (All Staff)
          </button>
        </div>` : ''}

      </div>`;
  }

  overlay.classList.add('show');
}

function closeReportModal() {
  document.getElementById('reportModalOverlay').classList.remove('show');
}


function exportStaffNoShow(username, courseCode) {
  const noShows = getNoShowStudents();
  const c = getCourseForUser(username, courseCode);
  if (!c) return;

  const courseNoShows = noShows.filter(s =>
    (c.students||[]).some(st => st.campusId === s.campusId)
  );

  if (!courseNoShows.length) { alert('No NO SHOW students in this course.'); return; }

  const wn = getWeekNum() || '—';
  const rows = courseNoShows.map(s => ({
    'Week': `Week ${wn}`,
    'Name': s.name,
    'Campus ID': s.campusId,
    'Course': courseCode,
    'Group': 'COSHP-MAB/MHB',
    'Responsible Staff': username
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'NO SHOW');
  XLSX.writeFile(wb, `no-show-${courseCode}-w${wn}.xlsx`);
}

// Universal export options modal
function showExportOptions(title, rows, filename, course, staffUsername) {
  const overlay = document.getElementById('exportOptionsOverlay');
  const body = document.getElementById('exportOptionsBody');

  body.innerHTML = `
    <div style="font-size:0.88rem;font-weight:600;margin-bottom:4px;">${title}</div>
    <div style="font-size:0.75rem;color:var(--text3);margin-bottom:16px;">
      ${course?.name||''} · ${(course?.students||[]).length} students · ${staffUsername}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button class="btn btn-primary btn-full" onclick="doExportAll('${filename}',${JSON.stringify(rows).replace(/'/g,"\'")||'[]'})">
        📦 Export All Formats (Excel + PDF)
      </button>
      <button class="btn btn-ghost btn-full" onclick="doExportExcel('${filename}',${JSON.stringify(rows).replace(/'/g,"\'")||'[]'})">
        📥 Export Excel only
      </button>
      <button class="btn btn-ghost btn-full" onclick="doExportPDF('${filename}','${title}','${course?.room||''}',${(course?.students||[]).length},'${staffUsername}')">
        🖨 Export PDF only
      </button>
    </div>`;

  // Store rows for export
  window._exportRows = rows;
  window._exportCourse = course;
  window._exportTitle = title;
  window._exportStaff = staffUsername;
  overlay.classList.add('show');
}

function closeExportOptions() {
  document.getElementById('exportOptionsOverlay').classList.remove('show');
}

function doExportExcel(filename, rows) {
  const r = window._exportRows || rows;
  const ws = XLSX.utils.json_to_sheet(r);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet');
  XLSX.writeFile(wb, `${filename}.xlsx`);
  closeExportOptions();
}

function doExportPDF(filename, title, room, count, staff) {
  const c = window._exportCourse;
  const rows = window._exportRows || [];
  const tbl = rows.map(r => `<tr>
    <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px;text-align:center;">${r['Seat No']||''}</td>
    <td style="padding:6px 8px;border:1px solid #ccc;font-size:12px;">${r['Name']||''}</td>
    <td style="padding:6px 8px;border:1px solid #ccc;font-size:10px;font-family:monospace;">${r['Campus ID']||''}</td>
    <td style="padding:6px 8px;border:1px solid #ccc;width:80px;"></td>
  </tr>`).join('');
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;padding:24px;color:#000;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;}
    h2{font-size:14px;margin-bottom:4px;}
    p{font-size:11px;color:#555;margin-bottom:4px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#f0f0f0;padding:7px 8px;border:1px solid #ccc;font-size:10px;text-align:left;}
    .footer{margin-top:40px;font-size:9px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:8px;}
    @media print{.no-print{display:none;}}
  </style></head><body>
  <div class="header">
    <div>
      <h2>${window._exportTitle||title}</h2>
      <p>${c?.name||''} &nbsp;·&nbsp; Room: ${c?.room||room} &nbsp;·&nbsp; ${count} students</p>
      <p>Date: ${new Date().toLocaleDateString('en-GB')} &nbsp;·&nbsp; Staff: ${staff}</p>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Seat</th><th>Name</th><th>Campus ID</th><th>Signature</th>
    </tr></thead>
    <tbody>${tbl}</tbody>
  </table>
  <div class="footer">KSAU-HS | COSHP-RM | Student Affairs &nbsp;·&nbsp; Designed and developed by: Ghamdisult · 2026</div>
  </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(), 500);
  closeExportOptions();
}

function doExportAll(filename) {
  doExportExcel(filename, window._exportRows);
  setTimeout(()=> doExportPDF(filename, window._exportTitle, window._exportCourse?.room||'', (window._exportRows||[]).length, window._exportStaff), 300);
}


// ══════════════════════════════════════════════════════════
const TOUR_STEPS = [
  { title:'Welcome to Attendance Manager 🎓', desc:'This quick tour will show you everything you need to know. It takes less than 2 minutes.', target:null },
  { title:'📅 Schedule Tab', desc:'Your weekly timetable lives here. Click any course chip to instantly open attendance for that lecture. Navigate between weeks with the arrows.', target:'tab-schedule' },
  { title:'⚙️ Setup — Start Here', desc:'Before anything else, go to Setup to: (1) Set your term dates, (2) Upload your course rosters via Excel, (3) Build your weekly schedule.', target:'tab-setup' },
  { title:'✋ Taking Attendance', desc:'Open a course, then tap student cards to mark them absent. Seat numbers match the physical room layout. Use "Mark All Absent" for mostly-empty rooms, then unmark those present.', target:'tab-attendance' },
  { title:'📊 SAS Matching', desc:'After manual attendance, upload the SAS Excel file. The app instantly compares both and shows: Absent, Escaped, Not Registered in App, and Excused students.', target:'sasTour' },
  { title:'📋 Reports & 📊 Analytics', desc:'Generate attendance/exam sheets in PDF or Excel from Reports. Analytics (Admin only) shows the ROI of manual vs electronic attendance — perfect for meetings.', target:'tab-reports' },
  { title:"You're all set! 🚀", desc:'Tap the ❓ button anytime to return to the Help Center or restart this tour. Triple-click the logo to access the Admin Panel.', target:null }
];

let tourStep=0;

function startTour() {
  tourStep=0;
  document.getElementById('tourOverlay').classList.add('show');
  renderTourStep();
}

function renderTourStep() {
  const step=TOUR_STEPS[tourStep];
  document.getElementById('tourStepNum').textContent=`Step ${tourStep+1} of ${TOUR_STEPS.length}`;
  document.getElementById('tourTitle').textContent=step.title;
  document.getElementById('tourDesc').textContent=step.desc;
  document.getElementById('tourNext').textContent=tourStep===TOUR_STEPS.length-1?'Finish ✓':'Next →';

  // Dots
  document.getElementById('tourDots').innerHTML=TOUR_STEPS.map((_,i)=>
    `<div class="tour-dot ${i===tourStep?'active':''}"></div>`).join('');

  // Position box near target
  const box=document.getElementById('tourBox');
  if (step.target) {
    const el=document.getElementById(step.target);
    if (el) {
      const r=el.getBoundingClientRect();
      const top=Math.min(r.bottom+12, window.innerHeight-200);
      const left=Math.min(Math.max(r.left,12), window.innerWidth-340);
      box.style.top=top+'px'; box.style.left=left+'px';
      box.style.bottom=''; box.style.right='';
    }
  } else {
    box.style.top='50%'; box.style.left='50%';
    box.style.transform='translate(-50%,-50%)';
    setTimeout(()=>box.style.transform='',10);
  }
}

function nextTourStep() {
  if (tourStep>=TOUR_STEPS.length-1) { endTour(); return; }
  tourStep++; renderTourStep();
}

function endTour() {
  document.getElementById('tourOverlay').classList.remove('show');
  const d=load(); d.tourDone=true; save(d);
}
</script>
Content = allSessions.length;
  renderUsersTable();
  document.getElementById('adminOverlay').classList.add('show');
}

function closeAdmin() { document.getElementById('adminOverlay').classList.remove('show'); _editingUserIdx=null; }

function renderUsersTable() {
  const shared = loadShared();
  const tbody = document.getElementById('usersBody');
  const d = { users: shared.users };
  const ROLE_BADGE = { admin:'b-purple', teamlead:'b-cyan', user:'b-blue' };
  const ROLE_LABEL = { admin:'Admin', teamlead:'Team Lead', user:'User' };

  tbody.innerHTML = d.users.map((u, i) => {
    const isMe = u.username === CU.username;
    const teamStr = (u.team||[]).join(', ') || '—';
    return `<tr style="${u.enabled===false?'opacity:0.5':''}">
      <td>
        <div style="font-weight:500;">${u.username}</div>
        ${u.role==='teamlead'?`<div style="font-size:0.65rem;color:var(--text3);">Team: ${teamStr}</div>`:''}
      </td>
      <td><span class="badge ${ROLE_BADGE[u.role]||'b-blue'}">${ROLE_LABEL[u.role]||u.role}</span></td>
      <td style="font-size:0.7rem;color:var(--text3);font-family:var(--mono);">${u.lastLogin?new Date(u.lastLogin).toLocaleDateString('en-GB'):'—'}</td>
      <td style="font-size:0.7rem;color:${u.enabled===false?'var(--red)':'var(--green)'};">${u.enabled===false?'Disabled':'Active'}</td>
      <td>
        ${!isMe ? `
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="btn btn-ghost" style="padding:2px 7px;font-size:0.68rem;" onclick="editUser(${i})">✏️ Edit</button>
            <button class="btn btn-ghost" style="padding:2px 7px;font-size:0.68rem;" onclick="toggleUserEnabled(${i})">${u.enabled===false?'Enable':'Disable'}</button>
            <button class="btn btn-danger" style="padding:2px 7px;font-size:0.68rem;" onclick="delUser(${i})">Remove</button>
          </div>` : '<span style="font-size:0.72rem;color:var(--text3);">You</span>'}
      </td>
    </tr>`;
  }).join('');
}

function editUser(idx) {
  _editingUserIdx = idx;
  const d = loadShared();
  const u = d.users[idx];
  document.getElementById('nuName').value = u.username;
  document.getElementById('nuPass').value = '';
  document.getElementById('nuRole').value = u.role || 'user';
  renderTeamSelector(u);
  document.getElementById('editUserPanel').style.display = 'block';
  document.getElementById('saveEditBtn').style.display = 'inline-flex';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
  document.getElementById('nuName').disabled = true; // cant change username
}

function renderTeamSelector(u) {
  const shared = loadShared();
  const wrap = document.getElementById('teamSelectorWrap');
  if ((document.getElementById('nuRole').value || u.role) !== 'teamlead') {
    wrap.style.display = 'none'; return;
  }
  wrap.style.display = 'block';
  const otherUsers = shared.users.filter(x => x.username !== u.username && x.role !== 'admin');
  const currentTeam = u.team || [];
  document.getElementById('teamMembersList').innerHTML = otherUsers.map(x => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface2);border-radius:6px;cursor:pointer;font-size:0.8rem;">
      <input type="checkbox" value="${x.username}" ${currentTeam.includes(x.username)?'checked':''} />
      ${x.username} <span class="badge b-blue" style="font-size:0.62rem;">${x.role}</span>
    </label>`).join('');
}

function saveEditUser() {
  const shared = loadShared();
  const idx = _editingUserIdx;
  if (idx === null) return;
  const u = shared.users[idx];
  const newPass = document.getElementById('nuPass').value;
  const newRole = document.getElementById('nuRole').value;
  if (newPass) u.password = newPass;
  u.role = newRole;
  if (newRole === 'teamlead') {
    const checks = document.querySelectorAll('#teamMembersList input[type=checkbox]');
    u.team = Array.from(checks).filter(c=>c.checked).map(c=>c.value);
  } else {
    u.team = [];
  }
  saveShared(shared); _editingUserIdx = null;
  document.getElementById('editUserPanel').style.display = 'none';
  document.getElementById('saveEditBtn').style.display = 'none';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('nuName').disabled = false;
  document.getElementById('nuName').value = '';
  document.getElementById('nuPass').value = '';
  renderUsersTable();
  alert('✅ User updated!');
}

function cancelEdit() {
  _editingUserIdx = null;
  document.getElementById('editUserPanel').style.display = 'none';
  document.getElementById('saveEditBtn').style.display = 'none';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('nuName').disabled = false;
  document.getElementById('nuName').value = '';
  document.getElementById('nuPass').value = '';
}

function toggleUserEnabled(idx) {
  const shared = loadShared();
  shared.users[idx].enabled = shared.users[idx].enabled === false ? true : false;
  saveShared(shared); renderUsersTable();
}

function addUser() {
  if (_editingUserIdx !== null) { saveEditUser(); return; }
  const n = document.getElementById('nuName').value.trim();
  const p = document.getElementById('nuPass').value;
  const r = document.getElementById('nuRole').value || 'user';
  if (!n||!p) { alert('Fill username and password.'); return; }
  const shared = loadShared();
  if (shared.users.find(u=>u.username===n)) { alert('Username already exists.'); return; }
  const newUser = {username:n,password:p,role:r,lastLogin:null,enabled:true,team:[]};
  if (r === 'teamlead') {
    const checks = document.querySelectorAll('#teamMembersList input[type=checkbox]');
    newUser.team = Array.from(checks).filter(c=>c.checked).map(c=>c.value);
  }
  shared.users.push(newUser);
  saveShared(shared);
  document.getElementById('nuName').value='';
  document.getElementById('nuPass').value='';
  document.getElementById('nuRole').value='user';
  document.getElementById('teamSelectorWrap').style.display='none';
  renderUsersTable();
  alert(`✅ User "${n}" created as ${r}`);
}

function delUser(i) {
  const shared=loadShared();
  if (!confirm(`Remove "${shared.users[i].username}"?`)) return;
  const removed = shared.users[i].username;
  shared.users.splice(i,1);
  saveShared(shared);
  // Clear their personal data
  localStorage.removeItem(SK_USER(removed));
  renderUsersTable();
}

function extendAll() {
  const shared = loadShared();
  shared.users.forEach(u => {
    const p = loadPersonal(u.username);
    p.term.weeks = (p.term.weeks||16)+1;
    savePersonal(p, u.username);
  });
  // Also extend current user's view
  const p = loadPersonal();
  alert(`✅ Term extended to ${p.term.weeks} weeks for all users.`);
  renderSched();
}

function clearAll() {
  if (!confirm('⚠️ Clear ALL personal data for ALL users? (courses, schedule, sessions, term)')) return;
  if (!confirm('This cannot be undone. Confirm?')) return;
  const shared = loadShared();
  shared.users.forEach(u => {
    savePersonal(initPersonal(), u.username);
  });
  closeAdmin(); initApp(); alert('✅ All personal data cleared for all users.');
}

// ══════════════════════════════════════════════════════════
//  STUDENTS PAGE
// ══════════════════════════════════════════════════════════
let _currentStudent = null;

function renderStudentsPage() {
  const allCourses = loadAccessibleCourses();
  const sel = document.getElementById('studentCourseFilter');
  sel.innerHTML = '<option value="">All Courses</option>';
  Object.entries(allCourses).forEach(([k, c]) => {
    sel.innerHTML += `<option value="${k}">${c.code}${k.includes('::')?` (${k.split('::')[0]})`:''}`;
  });
  // Show NO SHOW banner
  renderNoShowBanner();
  // Reset detail
  document.getElementById('studentDetailPanel').style.display = 'none';
  document.getElementById('studentSearchResults').innerHTML = '<div class="empty">Start typing to search...</div>';
}

function searchStudents() {
  const q = document.getElementById('studentSearch').value.trim().toLowerCase();
  const courseFilter = document.getElementById('studentCourseFilter').value;
  const d = load();
  const results = document.getElementById('studentSearchResults');

  if (!q && !courseFilter) {
    results.innerHTML = '<div class="empty">Start typing to search...</div>'; return;
  }

  // Build student index from accessible courses
  const allCourses = loadAccessibleCourses();
  const studentMap = {}; // campusId -> {name, courses[]}

  Object.entries(allCourses).forEach(([k, c]) => {
    if (courseFilter && k !== courseFilter) return;
    (c.students||[]).forEach(s => {
      if (!studentMap[s.campusId]) studentMap[s.campusId] = { name:s.name, campusId:s.campusId, courses:[] };
      const label = c.code + (k.includes('::')?` (${k.split('::')[0]})`:'');
      if (!studentMap[s.campusId].courses.includes(label)) studentMap[s.campusId].courses.push(label);
    });
  });

  const matches = Object.values(studentMap).filter(s =>
    !q || s.campusId.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  ).slice(0, 20);

  if (!matches.length) { results.innerHTML='<div class="empty">No students found</div>'; return; }

  // Check NO SHOW status
  const noShows = getNoShowStudents();

  results.innerHTML = matches.map(s => {
    const isNoShow = noShows.some(ns => ns.campusId === s.campusId);
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface2);border:1px solid ${isNoShow?'rgba(239,68,68,0.4)':'var(--border)'};border-radius:var(--r);cursor:pointer;transition:border-color 0.15s;"
      onclick="openStudentDetail('${s.campusId}')">
      <div style="flex:1;">
        <div style="font-size:0.82rem;font-weight:500;">${s.name}</div>
        <div style="font-size:0.68rem;color:var(--text3);font-family:var(--mono);">${s.campusId}</div>
      </div>
      <div style="font-size:0.7rem;color:var(--text3);">${s.courses.join(', ')}</div>
      ${isNoShow?'<span class="badge b-red" style="font-size:0.62rem;">NO SHOW</span>':''}
    </div>`;
  }).join('');
}

function getNoShowStudents() {
  const d = load();
  const groupId = d.activeGroup;
  // جمع الطلاب — فقط من المجموعة النشطة إن وجدت
  const courses = groupId && d.groups?.[groupId]
    ? d.groups[groupId].courses
    : loadAccessibleCourses();
  const studentMap = {};
  Object.values(courses).forEach(c => {
    (c.students||[]).forEach(s => {
      if (!studentMap[s.campusId]) studentMap[s.campusId] = { name:s.name, campusId:s.campusId, seenElectronic:false };
    });
  });
  // Mark as seen — فقط جلسات المجموعة النشطة
  const allSessions = loadAllSessions();
  allSessions
    .filter(s => !groupId || !s.groupId || s.groupId === groupId)
    .forEach(sess => {
      if (sess.studentDetails) {
        sess.studentDetails.forEach(sd => {
          if (sd.status !== 'Absent' && studentMap[sd.campusId]) {
            studentMap[sd.campusId].seenElectronic = true;
          }
        });
      }
    });
  return Object.values(studentMap).filter(s => !s.seenElectronic);
}

function renderNoShowBanner() {
  const noShows = getNoShowStudents();
  const banner = document.getElementById('noShowBanner');
  if (!noShows.length) { banner.style.display='none'; return; }
  banner.style.display = 'block';
  document.getElementById('noShowList').innerHTML = noShows.slice(0,10).map(s => `
    <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--surface2);border-radius:6px;font-size:0.78rem;cursor:pointer;"
      onclick="openStudentDetail('${s.campusId}')">
      <span class="badge b-red" style="font-size:0.6rem;">NO SHOW</span>
      <span style="font-weight:500;">${s.name}</span>
      <span style="color:var(--text3);font-family:var(--mono);font-size:0.68rem;">${s.campusId}</span>
    </div>`).join('') +
    (noShows.length>10?`<div style="font-size:0.72rem;color:var(--text3);padding:6px 10px;">+ ${noShows.length-10} more...</div>`:'');
}

function openStudentDetail(campusId) {
  const d = load();
  // Find student info across all accessible courses
  let studentInfo = null;
  const allCourses2 = loadAccessibleCourses();
  Object.values(allCourses2).forEach(c => {
    const s = (c.students||[]).find(s=>s.campusId===campusId);
    if (s && !studentInfo) studentInfo = s;
  });
  if (!studentInfo) return;
  _currentStudent = campusId;

  document.getElementById('studentDetailName').textContent = studentInfo.name;
  document.getElementById('studentDetailId').textContent = campusId;

  // NO SHOW badge
  const noShows = getNoShowStudents();
  const nsEl = document.getElementById('studentNoShowBadge');
  nsEl.style.display = noShows.some(s=>s.campusId===campusId) ? 'inline-flex' : 'none';

  // Populate course filter
  const sel = document.getElementById('studentDetailCourse');
  sel.innerHTML = '<option value="">All Courses</option>';
  const allCoursesForStudent = {};
  if (d.groups) { Object.values(d.groups).forEach(g => Object.assign(allCoursesForStudent, g.courses||{})); }
  else { Object.assign(allCoursesForStudent, d.courses||{}); }
  Object.keys(allCoursesForStudent).forEach(k => {
    const inCourse = (allCoursesForStudent[k].students||[]).some(s=>s.campusId===campusId);
    if (inCourse) sel.innerHTML += `<option value="${k}">${allCoursesForStudent[k].code}</option>`;
  });

  document.getElementById('studentDetailPanel').style.display = 'block';
  document.getElementById('studentSearchResults').style.display = 'none';
  document.querySelector('.card:has(#studentSearch)') && (document.querySelector('.card:has(#studentSearch)').style.display='none');
  renderStudentSummary(campusId);
  renderStudentHistory();
}

function closeStudentDetail() {
  _currentStudent = null;
  document.getElementById('studentDetailPanel').style.display = 'none';
  const searchCard = document.getElementById('studentSearch')?.closest('.card');
  if (searchCard) searchCard.style.display = 'block';
  document.getElementById('studentSearchResults').style.display = 'flex';
}

function renderStudentSummary(campusId) {
  const cards = document.getElementById('studentSummaryCards');
  const courseSummary = {};
  const allCourses3 = loadAccessibleCourses();

  Object.entries(allCourses3).forEach(([k, c]) => {
    const inCourse = (c.students||[]).some(s=>s.campusId===campusId);
    if (inCourse) courseSummary[k] = { total:0, absent:0, escaped:0, excused:0, code:c.code };
  });

  const allSessions2 = loadAllSessions();
  allSessions2.forEach(sess => {
    if (!sess.studentDetails) return;
    const sd = sess.studentDetails.find(s=>s.campusId===campusId);
    if (!sd) return;
    // Match session course to summary key (handle prefixed keys)
    const matchKey = Object.keys(courseSummary).find(k => {
      const {key} = resolveCourseKey(k);
      return key === sess.courseCode && (k.includes('::')?k.split('::')[0]===sess._owner:sess._owner===CU.username);
    }) || sess.courseCode;
    if (!courseSummary[matchKey]) return;
    courseSummary[matchKey].total++;
    if (sd.status==='Absent')   courseSummary[matchKey].absent++;
    if (sd.status==='Escaped')  courseSummary[matchKey].escaped++;
    if (sd.status==='Excused')  courseSummary[matchKey].excused++;
  });

  cards.innerHTML = Object.entries(courseSummary).map(([k, s]) => {
    const c = allCourses3[k] || {code:s.code||k};
    const absPct = s.total ? Math.round((s.absent+s.escaped)/s.total*100) : 0;
    const color = absPct>=33?'var(--red)':absPct>=20?'var(--yellow)':'var(--green)';
    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px;text-align:center;">
      <div style="font-size:0.7rem;color:var(--text3);font-family:var(--mono);margin-bottom:4px;">${k}</div>
      <div style="font-size:1.5rem;font-weight:700;font-family:var(--mono);color:${color};">${absPct}%</div>
      <div style="font-size:0.68rem;color:var(--text3);">absent · ${s.absent+s.escaped} of ${s.total}</div>
    </div>`;
  }).join('') || '<div class="empty">No sessions recorded</div>';
}

function renderStudentHistory() {
  const d = load();
  const campusId = _currentStudent;
  const courseFilter = document.getElementById('studentDetailCourse').value;
  const showStaff = isAdmin() || isTeamLead();

  // Show/hide staff column
  document.getElementById('staffColHeader').style.display = showStaff ? '' : 'none';

  const rows = [];
  const allSess = loadAllSessions();
  allSess.forEach(sess => {
    if (courseFilter && sess.courseCode !== courseFilter) return;
    if (!sess.studentDetails) return;
    const sd = sess.studentDetails.find(s=>s.campusId===campusId);
    if (!sd || sd.status==='Present') return;
    rows.push({date:sess.date, course:sess.courseCode, status:sd.status, staff:sess.staff});
  });

  rows.sort((a,b) => b.date.localeCompare(a.date));

  const STATUS_BADGE = {
    'Absent':        'b-red',
    'Escaped':       'b-yellow',
    'Not Registered':'b-green',
    'Excused':       'b-cyan'
  };

  const tbody = document.getElementById('studentHistoryBody');
  if (!rows.length) { tbody.innerHTML='<tr><td colspan="4" class="empty">No absences recorded</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => `<tr>
    <td style="padding:7px 10px;border:1px solid var(--border);font-family:var(--mono);font-size:0.72rem;">${r.date}</td>
    <td style="padding:7px 10px;border:1px solid var(--border);"><span class="badge b-blue" style="font-size:0.65rem;">${r.course}</span></td>
    <td style="padding:7px 10px;border:1px solid var(--border);"><span class="badge ${STATUS_BADGE[r.status]||'b-blue'}" style="font-size:0.65rem;">${r.status}</span></td>
    ${showStaff?`<td style="padding:7px 10px;border:1px solid var(--border);font-size:0.72rem;color:var(--text3);">${r.staff||'—'}</td>`:''}
  </tr>`).join('');
}

function exportStudentReport() {
  if (!_currentStudent) return;
  let studentName = '';
  getAllCoursesForUser(CU.username).forEach(c => {
    const s = (c.students||[]).find(s=>s.campusId===_currentStudent);
    if (s && !studentName) studentName = s.name;
  });
  const rows = [];
  const allSess = loadAllSessions();
  allSess.forEach(sess => {
    if (!sess.studentDetails) return;
    const sd = sess.studentDetails.find(s=>s.campusId===_currentStudent);
    if (!sd) return;
    const row = {'Date':sess.date,'Course':sess.courseCode,'Status':sd.status};
    if (isAdmin() || isTeamLead()) row['Staff'] = sess.staff||'';
    rows.push(row);
  });
  if (!rows.length) { alert('No data to export.'); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Report');
  XLSX.writeFile(wb,`student-${_currentStudent}.xlsx`);
}

function exportNoShowReport() {
  const noShows = getNoShowStudents();
  if (!noShows.length) { alert('No NO SHOW students.'); return; }
  const d = load();
  const wn = getWeekNum() || '—';
  const rows = noShows.map(s => ({
    'Week': wn,
    'Name': s.name,
    'Campus ID': s.campusId,
    'Group': 'COSHP-MAB/MHB'
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'NO SHOW');
  XLSX.writeFile(wb,`no-show-week${wn}.xlsx`);
}


// ══════════════════════════════════════════════════════════
//  ELECTRONIC ONLY MODE
// ══════════════════════════════════════════════════════════
function showElectronicOnly() { setAttMode('electronic'); }

function setAttMode(mode) {
  _attMode = mode;
  const MODES = {
    manual:      { el:'modeManual',      color:'var(--green)',  bg:'var(--green-dim)',  border:'var(--green)' },
    electronic:  { el:'modeElectronic',  color:'var(--cyan)',   bg:'rgba(6,182,212,0.1)', border:'var(--cyan)' },
    latemanual:  { el:'modeLateManual',  color:'var(--yellow)', bg:'var(--yellow-dim)', border:'var(--yellow)' },
  };

  // Reset all mode buttons
  Object.entries(MODES).forEach(([m, cfg]) => {
    const el = document.getElementById(cfg.el);
    if (!el) return;
    if (m === mode) {
      el.style.background = cfg.bg;
      el.style.borderColor = cfg.border;
      el.querySelector('div:nth-child(2)').style.color = cfg.color;
    } else {
      el.style.background = 'var(--surface2)';
      el.style.borderColor = 'var(--border)';
      el.querySelector('div:nth-child(2)').style.color = 'var(--text2)';
    }
  });

  // Show/hide extra fields
  const extra = document.getElementById('modeExtraFields');
  const extraM = document.getElementById('extraManual');
  const extraE = document.getElementById('extraElectronic');
  const extraL = document.getElementById('extraLateManual');
  if (extra) {
    if (extraM) extraM.style.display = mode === 'manual' ? 'block' : 'none';
    if (extraE) extraE.style.display = mode === 'electronic' ? 'block' : 'none';
    if (extraL) extraL.style.display = mode === 'latemanual' ? 'block' : 'none';
    extra.style.display = 'block';
    // Populate coveredBy dropdown when switching to electronic
    if (mode === 'electronic') populateCoveredByList();
  }

  // Show/hide manual attendance grid
  const manualCard = document.getElementById('attGrid')?.closest('.card');
  if (manualCard) {
    manualCard.style.opacity = mode === 'electronic' ? '0.4' : '1';
    manualCard.style.pointerEvents = mode === 'electronic' ? 'none' : '';
  }

  // Update match button
  const btn = document.getElementById('matchBtn');
  if (btn) {
    if (mode === 'electronic') btn.textContent = '⚡ Process Electronic Attendance';
    else if (mode === 'latemanual') btn.textContent = '📋 Save Manual Only Attendance';
    else btn.textContent = '⚡ Match & Show Results';
  }
}

// ══════════════════════════════════════════════════════════
//  REPORTS — ADDITIONAL TYPES
// ══════════════════════════════════════════════════════════

// NO SHOW Weekly Report
function exportNoShowReportFull(scope) {
  // scope: 'own' | 'team' | 'all'
  const noShows = getNoShowStudents();
  const d = load();
  const wn = getWeekNum() || '—';

  let filtered = noShows;
  if (scope === 'own') {
    // Only students in courses this user manages
    const ownCourses = new Set(Object.keys(d.courses));
    filtered = noShows.filter(s => {
      const allC = Object.assign({}, d.courses||{});
      if (d.groups) Object.values(d.groups).forEach(g => Object.assign(allC, g.courses||{}));
      return Object.keys(allC).some(k => (allC[k].students||[]).some(st=>st.campusId===s.campusId));
    });
  }

  if (!filtered.length) { alert('No NO SHOW students found.'); return; }

  const rows = filtered.map(s => ({
    'Week Number': `Week ${wn}`,
    'Name': s.name,
    'Campus ID': s.campusId,
    'Group': 'COSHP-MAB/MHB',
    'Status': 'NO SHOW — Never appeared in any session'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // Style header
  const range = XLSX.utils.decode_range(ws['!ref']);
  ws['!cols'] = [{wch:12},{wch:30},{wch:18},{wch:18},{wch:45}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `NO SHOW W${wn}`);
  XLSX.writeFile(wb, `no-show-week${wn}-${scope}.xlsx`);
}

// Biweekly Report
function exportBiweeklyReport(scope) {
  // scope: 'own' | 'user:username' | 'all'
  const d = load();
  const wn = getWeekNum();
  const week1 = wn ? wn-1 : 1;
  const week2 = wn || 2;

  // Get sessions for last 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const cutoff = twoWeeksAgo.toISOString().split('T')[0];

  const getSessionsForUser = (username) => {
    return d.sessions.filter(s => s.staff === username && s.date >= cutoff);
  };

  const buildUserSheet = (username) => {
    const sessions = getSessionsForUser(username);
    const rows = [];

    // Get all expected lectures for this user (from schedule)
    // Group by week
    const sessMap = {};
    sessions.forEach(s => {
      const key = `${s.courseCode}|${s.date}`;
      sessMap[key] = s;
    });

    // Add recorded sessions
    sessions.forEach(s => {
      rows.push({
        'Week': getSessionWeekNum(s.date) || '—',
        'Date': s.date,
        'Group': s.groupId || '—',
        'Course': s.courseCode,
        'Staff': username,
        'Type': s.electronicOnly ? '⚡ Electronic Only' : '✅ Manual + Electronic',
        'Covered By': s.coveredBy || '',
        'Total Students': s.total || 0,
        'Absent': (s.electronicAbsent||0),
        'Escaped': s.escaped || 0,
        'Excused': s.excused || 0,
        'Accuracy %': s.accuracy || 0,
        'Note': s.note || ''
      });
    });

    if (!rows.length) {
      rows.push({'Week':'—','Date':'—','Course':'No sessions recorded','Staff':username,'Type':'❌ Not recorded','Covered By':'','Total Students':0,'Absent':0,'Escaped':0,'Excused':0,'Accuracy %':0,'Note':''});
    }
    return rows;
  };

  const wb = XLSX.utils.book_new();

  if (scope === 'own') {
    const rows = buildUserSheet(CU.username);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:8},{wch:12},{wch:10},{wch:14},{wch:12},{wch:22},{wch:14},{wch:8},{wch:8},{wch:8},{wch:8},{wch:10},{wch:30}];
    XLSX.utils.book_append_sheet(wb, ws, CU.username);
    XLSX.writeFile(wb, `biweekly-${CU.username}-w${week1}-${week2}.xlsx`);
    return;
  }

  if (scope === 'all' && isAdmin()) {
    // All users - one sheet each + summary
    const summaryRows = [];
    d.users.forEach(u => {
      const rows = buildUserSheet(u.username);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{wch:8},{wch:12},{wch:10},{wch:14},{wch:12},{wch:22},{wch:14},{wch:8},{wch:8},{wch:8},{wch:8},{wch:10},{wch:30}];
      XLSX.utils.book_append_sheet(wb, ws, u.username.substring(0,31));

      // Summary row
      const recorded = d.sessions.filter(s=>s.staff===u.username && s.date>=cutoff).length;
      const compliance = recorded > 0 ? Math.round((d.sessions.filter(s=>s.staff===u.username&&s.date>=cutoff&&!s.electronicOnly).length/recorded)*100) : 0;
      summaryRows.push({
        'Staff': u.username,
        'Role': u.role,
        'Sessions Recorded': recorded,
        'Manual+Electronic': d.sessions.filter(s=>s.staff===u.username&&s.date>=cutoff&&!s.electronicOnly).length,
        'Electronic Only': d.sessions.filter(s=>s.staff===u.username&&s.date>=cutoff&&s.electronicOnly).length,
        'Not Recorded': '—',
        'Manual Compliance %': compliance
      });
    });

    // Summary sheet first
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summaryWs, '📊 Summary');
    // Move summary to first position
    wb.SheetNames = ['📊 Summary', ...wb.SheetNames.filter(s=>s!=='📊 Summary')];

    XLSX.writeFile(wb, `biweekly-ALL-w${week1}-${week2}.xlsx`);
    return;
  }

  // Single user (admin viewing another user)
  const target = scope.replace('user:','');
  const rows = buildUserSheet(target);
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, target);
  XLSX.writeFile(wb, `biweekly-${target}-w${week1}-${week2}.xlsx`);
}

function getSessionWeekNum(dateStr) {
  const d = load();
  if (!d.term.start) return null;
  const start = new Date(d.term.start);
  const sess = new Date(dateStr);
  const diff = Math.floor((sess-start)/(7*24*3600*1000));
  return diff>=0 ? diff+1 : null;
}

// ══════════════════════════════════════════════════════════
//  NO SHOW — Versioned export (Simple / Detailed)
// ══════════════════════════════════════════════════════════
function exportNoShowVersioned(version, scope) {
  // version: 'simple' | 'detailed'
  // scope: 'own' | 'all'
  const wn = getWeekNum() || '—';
  const shared = loadShared();
  const allSessions = loadAllSessions();

  // Collect all students across accessible users
  const accessUsers = scope === 'own' ? [CU.username] : accessibleUsernames();

  // Build a map: campusId -> {name, courseCode, courseName, staffUsername, lastSeen}
  const studentMap = {}; // campusId -> info

  for (const uname of accessUsers) {
    if (!uname) continue;
    getAllCoursesForUser(uname).forEach(course => {
      (course.students || []).forEach(st => {
        if (!studentMap[st.campusId]) {
          studentMap[st.campusId] = {
            name: st.name,
            campusId: st.campusId,
            courseCode: course.code,
            courseName: course.name,
            staff: uname,
            lastSeen: null
          };
        }
      });
    });
  }

  // Check if student ever appeared (not absent) in any session
  const appearedIds = new Set();
  const lastSeenMap = {};

  allSessions.forEach(sess => {
    if (!accessUsers.includes(sess._owner)) return;
    (sess.studentDetails || []).forEach(sd => {
      if (sd.status !== 'Absent') {
        appearedIds.add(sd.campusId);
        // Track last seen date
        if (!lastSeenMap[sd.campusId] || sess.date > lastSeenMap[sd.campusId]) {
          lastSeenMap[sd.campusId] = sess.date;
        }
      }
    });
  });

  // Filter NO SHOWs
  const noShows = Object.values(studentMap).filter(s => !appearedIds.has(s.campusId));

  if (!noShows.length) { alert('No NO SHOW students found.'); return; }

  let rows;
  if (version === 'simple') {
    rows = noShows.map(s => ({
      'Week': `Week ${wn}`,
      'Name': s.name,
      'Campus ID': s.campusId,
      'Group': 'COSHP-MAB/MHB'
    }));
  } else {
    rows = noShows.map(s => ({
      'Week': `Week ${wn}`,
      'Name': s.name,
      'Campus ID': s.campusId,
      'Group': 'COSHP-MAB/MHB',
      'Course': s.courseCode,
      'Last Seen': lastSeenMap[s.campusId] || 'Never',
      'Responsible Staff': s.staff
    }));
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = version === 'simple'
    ? [{wch:10},{wch:30},{wch:16},{wch:18}]
    : [{wch:10},{wch:30},{wch:16},{wch:18},{wch:14},{wch:14},{wch:18}];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `NO SHOW W${wn}`);

  // Footer row
  const footerRowIdx = rows.length + 2;
  const footerCell = XLSX.utils.encode_cell({r: footerRowIdx, c: 0});
  ws[footerCell] = { v: 'KSAU-HS | COSHP-RM | Student Affairs', t: 's' };

  XLSX.writeFile(wb, `no-show-w${wn}-${version}-${scope}.xlsx`);
}

// ══════════════════════════════════════════════════════════
//  BIWEEKLY — Versioned export (Personal / Unified)
// ══════════════════════════════════════════════════════════
function exportBiweeklyVersioned(version) {
  // version: 'personal' | 'unified'
  const wn = getWeekNum();
  const week2 = wn || 2;
  const week1 = Math.max(1, week2 - 1);

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const cutoff = twoWeeksAgo.toISOString().split('T')[0];

  const typeLabel = (s) => {
    if (s.lateManual) return 'Manual Only';
    if (s.electronicOnly) return 'Electronic Only';
    return 'Manual + Electronic';
  };

  if (version === 'personal') {
    const d = load();
    const sessions = (d.sessions || []).filter(s => s.date >= cutoff);
    const rows = sessions.map(s => ({
      'Week': getSessionWeekNum(s.date) || '—',
      'Date': s.date,
      'Course': s.courseCode,
      'Course Name': s.courseName || '',
      'Type': typeLabel(s),
      'Covered By': s.coveredBy || '',
      'Total Students': s.total || 0,
      'Absent': s.electronicAbsent || 0,
      'Escaped': s.escaped || 0,
      'Excused': s.excused || 0,
      'Accuracy %': s.accuracy || 0,
      'Note': s.note || ''
    }));

    if (!rows.length) { alert('No sessions recorded in the last 2 weeks.'); return; }

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:8},{wch:12},{wch:12},{wch:24},{wch:20},{wch:16},{wch:8},{wch:8},{wch:8},{wch:8},{wch:12},{wch:30}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, CU.username);

    // Footer
    const fr = rows.length + 2;
    ws[XLSX.utils.encode_cell({r:fr,c:0})] = { v: 'KSAU-HS | COSHP-RM | Student Affairs', t:'s' };

    XLSX.writeFile(wb, `biweekly-personal-${CU.username}-w${week1}-${week2}.xlsx`);
    return;
  }

  if (version === 'unified' && isAdmin()) {
    const shared = loadShared();
    const allSessions = loadAllSessions();
    const wb = XLSX.utils.book_new();
    const summaryRows = [];

    shared.users.forEach(u => {
      const userSess = allSessions.filter(s => s._owner === u.username && s.date >= cutoff);
      const manual = userSess.filter(s => !s.electronicOnly && !s.lateManual).length;
      const elec   = userSess.filter(s => s.electronicOnly).length;
      const late   = userSess.filter(s => s.lateManual).length;
      const total  = userSess.length;
      const compliance = total > 0 ? Math.round((manual / total) * 100) : 0;

      summaryRows.push({
        'Staff': u.username,
        'Role': u.role,
        'Total Sessions': total,
        'Manual + Electronic': manual,
        'Electronic Only': elec,
        'Manual Only': late,
        'Compliance %': compliance + '%'
      });

      // Individual sheet per user
      const rows = userSess.map(s => ({
        'Week': getSessionWeekNum(s.date) || '—',
        'Date': s.date,
        'Course': s.courseCode,
        'Type': typeLabel(s),
        'Students': s.total || 0,
        'Absent': s.electronicAbsent || 0,
        'Accuracy %': s.accuracy || 0
      }));
      if (rows.length) {
        const ws2 = XLSX.utils.json_to_sheet(rows);
        ws2['!cols'] = [{wch:8},{wch:12},{wch:14},{wch:20},{wch:10},{wch:8},{wch:12}];
        XLSX.utils.book_append_sheet(wb, ws2, u.username.substring(0,31));
      }
    });

    // Summary sheet first
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs['!cols'] = [{wch:18},{wch:12},{wch:16},{wch:20},{wch:16},{wch:14},{wch:14}];

    // Footer in summary
    const fr = summaryRows.length + 2;
    summaryWs[XLSX.utils.encode_cell({r:fr,c:0})] = { v: 'KSAU-HS | COSHP-RM | Student Affairs', t:'s' };

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    wb.SheetNames = ['Summary', ...wb.SheetNames.filter(s => s !== 'Summary')];

    XLSX.writeFile(wb, `biweekly-unified-w${week1}-${week2}.xlsx`);
  }
}

// ══════════════════════════════════════════════════════════
//  REPORTS PAGE — UPDATE WITH NEW TYPES
// ══════════════════════════════════════════════════════════
function showReportModal(type) {
  const overlay = document.getElementById('reportModalOverlay');
  const body = document.getElementById('reportModalBody');
  const wn = getWeekNum() || '—';
  const canDetailed = isAdmin() || isTeamLead();

  if (type === 'noshow') {
    body.innerHTML = `
      <div style="font-size:0.88rem;font-weight:700;margin-bottom:4px;">🚨 NO SHOW Weekly Report</div>
      <div style="font-size:0.73rem;color:var(--text3);margin-bottom:16px;">Week ${wn} · Students absent from all sessions</div>

      <div style="display:flex;flex-direction:column;gap:10px;">

        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;">
          <div style="font-size:0.78rem;font-weight:600;margin-bottom:4px;">📋 Simple Report</div>
          <div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">
            Name · Campus ID · Group · Week — available to all staff
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="btn btn-primary btn-full" onclick="exportNoShowVersioned('simple','own');closeReportModal()">
              📥 My Courses
            </button>
            ${canDetailed?`<button class="btn btn-ghost btn-full" onclick="exportNoShowVersioned('simple','all');closeReportModal()">
              📥 ${isTeamLead()?'My Team':'All Staff'}
            </button>`:''}
          </div>
        </div>

        ${canDetailed ? `<div style="background:var(--surface2);border:1px solid rgba(168,85,247,0.3);border-radius:var(--r);padding:12px 14px;">
          <div style="font-size:0.78rem;font-weight:600;margin-bottom:4px;color:var(--purple);">🔍 Detailed Report <span class="badge b-purple" style="font-size:0.6rem;vertical-align:middle;">${isTeamLead()?'Team Lead':'Admin'}</span></div>
          <div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">
            Adds: Last Seen · Responsible Staff
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button class="btn btn-ghost btn-full" style="border-color:rgba(168,85,247,0.4);color:var(--purple);"
              onclick="exportNoShowVersioned('detailed','own');closeReportModal()">
              📥 My Courses (Detailed)
            </button>
            <button class="btn btn-ghost btn-full" style="border-color:rgba(168,85,247,0.4);color:var(--purple);"
              onclick="exportNoShowVersioned('detailed','all');closeReportModal()">
              📥 ${isTeamLead()?'My Team':'All Staff'} (Detailed)
            </button>
          </div>
        </div>` : ''}

      </div>`;
  }

  if (type === 'biweekly') {
    const wn2 = typeof wn === 'number' ? wn : 2;
    body.innerHTML = `
      <div style="font-size:0.88rem;font-weight:700;margin-bottom:4px;">📊 Biweekly Staff Report</div>
      <div style="font-size:0.73rem;color:var(--text3);margin-bottom:16px;">Weeks ${Math.max(1,wn2-1)}–${wn2}</div>

      <div style="display:flex;flex-direction:column;gap:10px;">

        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;">
          <div style="font-size:0.78rem;font-weight:600;margin-bottom:4px;">👤 Personal Report</div>
          <div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">
            Your sessions · Course · Date · Type (Manual / Electronic / Manual Only) · Students · Absent
          </div>
          <button class="btn btn-primary btn-full" onclick="exportBiweeklyVersioned('personal');closeReportModal()">
            📥 Export My Report
          </button>
        </div>

        ${isAdmin() ? `<div style="background:var(--surface2);border:1px solid rgba(168,85,247,0.3);border-radius:var(--r);padding:12px 14px;">
          <div style="font-size:0.78rem;font-weight:600;margin-bottom:4px;color:var(--purple);">📊 Unified Report <span class="badge b-purple" style="font-size:0.6rem;vertical-align:middle;">Admin</span></div>
          <div style="font-size:0.72rem;color:var(--text3);margin-bottom:10px;">
            All staff summary · Sessions · Manual / Electronic / Manual Only breakdown · Compliance %
          </div>
          <button class="btn btn-ghost btn-full" style="border-color:rgba(168,85,247,0.4);color:var(--purple);"
            onclick="exportBiweeklyVersioned('unified');closeReportModal()">
            📥 Export Unified Report (All Staff)
          </button>
        </div>` : ''}

      </div>`;
  }

  overlay.classList.add('show');
}

function closeReportModal() {
  document.getElementById('reportModalOverlay').classList.remove('show');
}


function exportStaffNoShow(username, courseCode) {
  const noShows = getNoShowStudents();
  const c = getCourseForUser(username, courseCode);
  if (!c) return;

  const courseNoShows = noShows.filter(s =>
    (c.students||[]).some(st => st.campusId === s.campusId)
  );

  if (!courseNoShows.length) { alert('No NO SHOW students in this course.'); return; }

  const wn = getWeekNum() || '—';
  const rows = courseNoShows.map(s => ({
    'Week': `Week ${wn}`,
    'Name': s.name,
    'Campus ID': s.campusId,
    'Course': courseCode,
    'Group': 'COSHP-MAB/MHB',
    'Responsible Staff': username
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'NO SHOW');
  XLSX.writeFile(wb, `no-show-${courseCode}-w${wn}.xlsx`);
}

// Universal export options modal
function showExportOptions(title, rows, filename, course, staffUsername) {
  const overlay = document.getElementById('exportOptionsOverlay');
  const body = document.getElementById('exportOptionsBody');

  body.innerHTML = `
    <div style="font-size:0.88rem;font-weight:600;margin-bottom:4px;">${title}</div>
    <div style="font-size:0.75rem;color:var(--text3);margin-bottom:16px;">
      ${course?.name||''} · ${(course?.students||[]).length} students · ${staffUsername}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button class="btn btn-primary btn-full" onclick="doExportAll('${filename}',${JSON.stringify(rows).replace(/'/g,"\'")||'[]'})">
        📦 Export All Formats (Excel + PDF)
      </button>
      <button class="btn btn-ghost btn-full" onclick="doExportExcel('${filename}',${JSON.stringify(rows).replace(/'/g,"\'")||'[]'})">
        📥 Export Excel only
      </button>
      <button class="btn btn-ghost btn-full" onclick="doExportPDF('${filename}','${title}','${course?.room||''}',${(course?.students||[]).length},'${staffUsername}')">
        🖨 Export PDF only
      </button>
    </div>`;

  // Store rows for export
  window._exportRows = rows;
  window._exportCourse = course;
  window._exportTitle = title;
  window._exportStaff = staffUsername;
  overlay.classList.add('show');
}

function closeExportOptions() {
  document.getElementById('exportOptionsOverlay').classList.remove('show');
}

function doExportExcel(filename, rows) {
  const r = window._exportRows || rows;
  const ws = XLSX.utils.json_to_sheet(r);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet');
  XLSX.writeFile(wb, `${filename}.xlsx`);
  closeExportOptions();
}

function doExportPDF(filename, title, room, count, staff) {
  const c = window._exportCourse;
  const rows = window._exportRows || [];
  const tbl = rows.map(r => `<tr>
    <td style="padding:6px 8px;border:1px solid #ccc;font-size:11px;text-align:center;">${r['Seat No']||''}</td>
    <td style="padding:6px 8px;border:1px solid #ccc;font-size:12px;">${r['Name']||''}</td>
    <td style="padding:6px 8px;border:1px solid #ccc;font-size:10px;font-family:monospace;">${r['Campus ID']||''}</td>
    <td style="padding:6px 8px;border:1px solid #ccc;width:80px;"></td>
  </tr>`).join('');
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;padding:24px;color:#000;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;}
    h2{font-size:14px;margin-bottom:4px;}
    p{font-size:11px;color:#555;margin-bottom:4px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#f0f0f0;padding:7px 8px;border:1px solid #ccc;font-size:10px;text-align:left;}
    .footer{margin-top:40px;font-size:9px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:8px;}
    @media print{.no-print{display:none;}}
  </style></head><body>
  <div class="header">
    <div>
      <h2>${window._exportTitle||title}</h2>
      <p>${c?.name||''} &nbsp;·&nbsp; Room: ${c?.room||room} &nbsp;·&nbsp; ${count} students</p>
      <p>Date: ${new Date().toLocaleDateString('en-GB')} &nbsp;·&nbsp; Staff: ${staff}</p>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Seat</th><th>Name</th><th>Campus ID</th><th>Signature</th>
    </tr></thead>
    <tbody>${tbl}</tbody>
  </table>
  <div class="footer">KSAU-HS | COSHP-RM | Student Affairs &nbsp;·&nbsp; Designed and developed by: Ghamdisult · 2026</div>
  </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(), 500);
  closeExportOptions();
}

function doExportAll(filename) {
  doExportExcel(filename, window._exportRows);
  setTimeout(()=> doExportPDF(filename, window._exportTitle, window._exportCourse?.room||'', (window._exportRows||[]).length, window._exportStaff), 300);
}


// ══════════════════════════════════════════════════════════
const TOUR_STEPS = [
  { title:'Welcome to Attendance Manager 🎓', desc:'This quick tour will show you everything you need to know. It takes less than 2 minutes.', target:null },
  { title:'📅 Schedule Tab', desc:'Your weekly timetable lives here. Click any course chip to instantly open attendance for that lecture. Navigate between weeks with the arrows.', target:'tab-schedule' },
  { title:'⚙️ Setup — Start Here', desc:'Before anything else, go to Setup to: (1) Set your term dates, (2) Upload your course rosters via Excel, (3) Build your weekly schedule.', target:'tab-setup' },
  { title:'✋ Taking Attendance', desc:'Open a course, then tap student cards to mark them absent. Seat numbers match the physical room layout. Use "Mark All Absent" for mostly-empty rooms, then unmark those present.', target:'tab-attendance' },
  { title:'📊 SAS Matching', desc:'After manual attendance, upload the SAS Excel file. The app instantly compares both and shows: Absent, Escaped, Not Registered in App, and Excused students.', target:'sasTour' },
  { title:'📋 Reports & 📊 Analytics', desc:'Generate attendance/exam sheets in PDF or Excel from Reports. Analytics (Admin only) shows the ROI of manual vs electronic attendance — perfect for meetings.', target:'tab-reports' },
  { title:"You're all set! 🚀", desc:'Tap the ❓ button anytime to return to the Help Center or restart this tour. Triple-click the logo to access the Admin Panel.', target:null }
];

let tourStep=0;

function startTour() {
  tourStep=0;
  document.getElementById('tourOverlay').classList.add('show');
  renderTourStep();
}

function renderTourStep() {
  const step=TOUR_STEPS[tourStep];
  document.getElementById('tourStepNum').textContent=`Step ${tourStep+1} of ${TOUR_STEPS.length}`;
  document.getElementById('tourTitle').textContent=step.title;
  document.getElementById('tourDesc').textContent=step.desc;
  document.getElementById('tourNext').textContent=tourStep===TOUR_STEPS.length-1?'Finish ✓':'Next →';

  // Dots
  document.getElementById('tourDots').innerHTML=TOUR_STEPS.map((_,i)=>
    `<div class="tour-dot ${i===tourStep?'active':''}"></div>`).join('');

  // Position box near target
  const box=document.getElementById('tourBox');
  if (step.target) {
    const el=document.getElementById(step.target);
    if (el) {
      const r=el.getBoundingClientRect();
      const top=Math.min(r.bottom+12, window.innerHeight-200);
      const left=Math.min(Math.max(r.left,12), window.innerWidth-340);
      box.style.top=top+'px'; box.style.left=left+'px';
      box.style.bottom=''; box.style.right='';
    }
  } else {
    box.style.top='50%'; box.style.left='50%';
    box.style.transform='translate(-50%,-50%)';
    setTimeout(()=>box.style.transform='',10);
  }
}

function nextTourStep() {
  if (tourStep>=TOUR_STEPS.length-1) { endTour(); return; }
  tourStep++; renderTourStep();
}

function endTour() {
  document.getElementById('tourOverlay').classList.remove('show');
  const d=load(); d.tourDone=true; save(d);
}
</script>
