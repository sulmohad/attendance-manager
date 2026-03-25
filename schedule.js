// ══════════════════════════════════════════════════════════
//  ALERT — upcoming lecture
// ══════════════════════════════════════════════════════════
function isSmartAlertOn() {
  const d = load();
  return d.smartAlert === true; // off by default
}

function toggleSmartAlert() {
  const d = load();
  d.smartAlert = !isSmartAlertOn();
  savePersonal(d);
  updateAlertToggleUI();
  if (!d.smartAlert) {
    document.getElementById('alertBanner').classList.remove('show');
  } else {
    checkAlert();
  }
}

function updateAlertToggleUI() {
  const on = isSmartAlertOn();
  const btn = document.getElementById('alertToggleBtn');
  const icon = document.getElementById('alertToggleIcon');
  const lbl  = document.getElementById('alertToggleLbl');
  if (!btn) return;
  icon.textContent = on ? '🔔' : '🔕';
  lbl.textContent  = on ? 'Alert On' : 'Alert Off';
  btn.style.borderColor = on ? 'var(--accent)' : '';
  btn.style.color        = on ? 'var(--accent)' : '';
}

function checkAlert() {
  if (!isSmartAlertOn()) return;
  const d = load();
  const schedule = getActiveSchedule(d);
  const courses  = getActiveCourses(d);
  if (!schedule.length) return;
  const now = new Date();
  const dayIdx = now.getDay();

  for (const s of schedule) {
    if (s.day !== dayIdx) continue;
    const [sh, sm] = s.time.split(':').map(Number);
    const slotMins = sh*60+sm;
    const nowMins = now.getHours()*60+now.getMinutes();
    const diff = slotMins - nowMins;
    if (diff >= 0 && diff <= 30) {
      const c = courses[s.courseCode];
      if (!c) continue;
      document.getElementById('alertText').textContent =
        `🔔 ${c.code} — ${c.name} starts in ${diff===0?'now!':diff+' min'} · Room ${c.room}`;
      document.getElementById('alertBanner').classList.add('show');
      return;
    }
  }
}

// ══════════════════════════════════════════════════════════
//  SCHEDULE
// ══════════════════════════════════════════════════════════
let weekOff = 0;

function getSun(off) {
  const n = new Date(); const d = new Date(n);
  d.setDate(n.getDate()-n.getDay()+off*7); d.setHours(0,0,0,0); return d;
}

function fmtDate(d) { return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}); }

function changeWeek(dir) { weekOff+=dir; renderSched(); }

function getWeekNum() {
  const d = load();
  if (!d.term.start) return null;
  const s = new Date(d.term.start), n = new Date();
  const diff = Math.floor((n-s)/(7*24*3600*1000));
  return diff>=0 && diff<d.term.weeks ? diff+1 : null;
}

// وضع عرض الجدول: 'merged' (كل المجموعات) أو 'single' (النشطة فقط)
let _schedView = 'merged';

function setSchedView(mode) {
  _schedView = mode;
  document.querySelectorAll('.svt').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('svt-' + mode);
  if (btn) btn.classList.add('active');
  renderSched();
}

function renderSched() {
  const d       = load();
  const groups  = d.groups || {};
  const gKeys   = Object.keys(groups);
  const groupId = d.activeGroup;

  const sun = getSun(weekOff);
  const thu = new Date(sun); thu.setDate(sun.getDate()+4);
  document.getElementById('weekLabel').textContent = `${fmtDate(sun)} – ${fmtDate(thu)}`;
  const wn = getWeekNum();
  document.getElementById('weekNum').textContent = wn ? `Week ${wn} of ${d.term.weeks}` : '';

  // إظهار/إخفاء toggle بناءً على عدد المجموعات
  const toggle = document.getElementById('schedViewToggle');
  if (toggle) toggle.style.display = gKeys.length > 1 ? 'flex' : 'none';

  // ── تجميع المحتوى حسب وضع العرض ──────────────────────
  let allSlots = []; // { day, time, courseCode, groupId, color }

  if (_schedView === 'merged' && gKeys.length > 1) {
    // كل المجموعات في جدول واحد
    gKeys.forEach(gid => {
      const g = groups[gid];
      const color = getGroupColor(gid, d);
      (g.schedule || []).forEach(s => {
        allSlots.push({ ...s, groupId: gid, color,
          course: (g.courses || {})[s.courseCode] });
      });
    });
  } else {
    // المجموعة النشطة فقط
    const courses  = getActiveCourses(d);
    const schedule = getActiveSchedule(d);
    schedule.forEach(s => {
      allSlots.push({ ...s, groupId,
        color: courses[s.courseCode]?.color || 'var(--accent)',
        course: courses[s.courseCode] });
    });
  }

  if (!allSlots.length) {
    document.getElementById('schedNoData').style.display='block';
    document.getElementById('schedWrap').style.display='none';
    return;
  }
  document.getElementById('schedNoData').style.display='none';
  document.getElementById('schedWrap').style.display='block';

  // ── بناء الجدول ────────────────────────────────────────
  const times = [...new Set(allSlots.map(s=>s.time))].sort();

  // في وضع مدمج: أضف legend لألوان المجموعات
  let legendHtml = '';
  if (_schedView === 'merged' && gKeys.length > 1) {
    legendHtml = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;">
      <span style="font-size:0.68rem;color:var(--text3);font-weight:600;">Groups:</span>
      ${gKeys.map(gid => `
        <span onclick="switchGroup('${gid}')" style="cursor:pointer;display:flex;align-items:center;gap:5px;
          padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:600;
          background:${getGroupColor(gid,d)}18;border:1px solid ${getGroupColor(gid,d)}40;
          color:${getGroupColor(gid,d)};${gid===groupId?'border-width:2px;':''}">
          <span style="width:7px;height:7px;border-radius:50%;background:${getGroupColor(gid,d)};"></span>
          ${gid}${gid===groupId?' ●':''}
        </span>`).join('')}
    </div>`;
  }

  const headerLabel = _schedView==='single' && groupId
    ? ` <span style="font-size:0.7rem;color:var(--accent);font-weight:600;margin-right:4px;
         padding:2px 8px;background:rgba(59,130,246,0.1);border-radius:10px;">${groupId}</span>`
    : '';
  let thead = `<tr><th>Day / Date${headerLabel}</th>`+times.map(t=>`<th>${t}</th>`).join('')+'</tr>';
  let tbody = '';

  for (let i=0; i<5; i++) {
    const day = new Date(sun); day.setDate(sun.getDate()+i);
    const isToday = day.toDateString()===new Date().toDateString();
    let row = `<td class="day-cell ${isToday?'today':''}">
      <div class="day-name">${DAYS[i]}</div>
      <div class="day-date">${fmtDate(day)}</div>
    </td>`;

    for (const t of times) {
      // في وضع مدمج: ممكن مجموعات متعددة في نفس الخلية
      const daySlots = allSlots.filter(s => s.day===i && s.time===t && s.course);
      if (!daySlots.length) {
        row += '<td class="slot-empty"></td>';
        continue;
      }
      // بناء chips داخل الخلية
      const chips = daySlots.map(slot => {
        const c = slot.course;
        const isActive = slot.groupId === groupId;
        return `<div class="chip" style="background:${slot.color}15;border-color:${slot.color}${isActive?'80':'30'};
          opacity:${isActive?'1':'0.7'};"
          onclick="switchGroup('${slot.groupId}');openCourseAtt('${slot.courseCode}')">
          ${_schedView==='merged' && gKeys.length>1
            ? `<div style="font-size:0.6rem;color:${slot.color};font-weight:700;margin-bottom:1px;">${slot.groupId}</div>`
            : ''}
          <div class="chip-code" style="color:${slot.color}">${c.code}</div>
          <div class="chip-name">${c.name}</div>
          <div class="chip-room">📍 ${c.room}</div>
        </div>`;
      }).join('');
      row += `<td>${chips}</td>`;
    }
    tbody += `<tr>${row}</tr>`;
  }

  document.getElementById('schedWrap').innerHTML =
    legendHtml +
    `<div class="sched-wrap" style="overflow-x:auto;">
       <table class="sched-tbl" id="schedTbl">
         <thead>${thead}</thead>
         <tbody>${tbody}</tbody>
       </table>
     </div>`;
}

// ══════════════════════════════════════════════════════════
//  SETUP
// ══════════════════════════════════════════════════════════
function renderSetup() {
  const d = load();
  if (d.term.start) {
    document.getElementById('termStart').value = d.term.start;
    document.getElementById('termWeeks').value = d.term.weeks;
    updateTermDates();
    markDone('sn1');
  }
  renderCourseList();
  renderSchedEntries();
  renderRosterStatus();
  // Mark done states — بناءً على المجموعات الموجودة
  const activeCourses = getActiveCourses(d);
  if (Object.keys(activeCourses).length > 0) {
    markDone('sn2');
    if (Object.values(activeCourses).some(c => c.students && c.students.length > 0)) markDone('sn3');
  }
  renderExistingGroupChips();
}

function updateTermDates() {
  const s = document.getElementById('termStart').value;
  const w = parseInt(document.getElementById('termWeeks').value)||16;
  if (!s) return;
  const sd = new Date(s), ed = new Date(sd);
  ed.setDate(sd.getDate()+w*7-1);
  document.getElementById('tiStart').textContent = fmtDate(sd);
  document.getElementById('tiEnd').textContent = fmtDate(ed);
  document.getElementById('tiWeeks').textContent = w+' weeks';
  const now = new Date();
  const diff = Math.floor((now-sd)/(7*24*3600*1000));
  document.getElementById('tiCurrent').textContent = diff>=0&&diff<w ? `Week ${diff+1}` : 'Outside term';
  document.getElementById('termInfo').classList.add('show');
}

function saveTerm() {
  const s = document.getElementById('termStart').value;
  const w = parseInt(document.getElementById('termWeeks').value)||16;
  if (!s) { alert('Please select a start date.'); return; }
  const d = load(); d.term={start:s,weeks:w}; save(d);
  markDone('sn1');
  alert('✅ Term dates saved!');
}

function extendTerm() {
  document.getElementById('termWeeks').value = parseInt(document.getElementById('termWeeks').value)+1;
  updateTermDates();
}

function markDone(id) {
  const el = document.getElementById(id);
  el.classList.add('done'); el.textContent='✓';
}

// ── University Schedule Excel Parser ──────────────────────
let _uniWB = null; // store workbook for sheet selection

function loadUniversitySchedule(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _uniWB = XLSX.read(e.target.result, {type:'array'});
    const sheets = _uniWB.SheetNames;
    const sel = document.getElementById('sheetSelector');
    sel.innerHTML = '<option value="">— Select sheet —</option>';
    sheets.forEach(s => sel.innerHTML += `<option value="${s}">${s}</option>`);
    // Auto-select sheet if only one meaningful sheet or if name contains group
    const autoSheet = sheets.find(s => s !== 'Sheet1' && s !== 'Sheet2') || sheets[0];
    if (sheets.length === 1) {
      sel.value = autoSheet;
      onSheetSelected();
    }
    document.getElementById('sheetSelectorWrap').style.display = 'block';
    document.getElementById('schedExcelLabel').textContent = '✅ ' + file.name;
    document.getElementById('schedExcelZone').classList.add('loaded');
    input.value = '';
    renderExistingGroupChips();
  };
  reader.readAsArrayBuffer(file);
}

// عند اختيار شيت — تعبئة اسم المجموعة تلقائياً من ترويسة الشيت
function onSheetSelected() {
  const sel = document.getElementById('sheetSelector');
  const sheetName = sel.value;
  if (!sheetName || !_uniWB) return;

  // قراءة أول خلية غير فارغة في أول صفين — قد تحوي اسم المجموعة
  const ws  = _uniWB.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:null});
  let detectedName = '';
  for (let r = 0; r < Math.min(3, raw.length); r++) {
    const row = raw[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const val = row[c] ? String(row[c]).trim() : '';
      // اسم المجموعة عادةً 2-6 أحرف كبيرة (MAB, MAA, RPT1…)
      if (val && /^[A-Z]{2,6}\d*$/.test(val)) {
        detectedName = val;
        break;
      }
    }
    if (detectedName) break;
  }

  const inp = document.getElementById('groupNameInput');
  const btn = document.getElementById('loadGroupBtn');
  if (inp && detectedName && !inp.value) inp.value = detectedName;
  if (btn) btn.disabled = false;
  renderExistingGroupChips();
}

// عرض المجموعات الموجودة كـ chips قابلة للضغط (لاختيار الاسم سريعاً)
function renderExistingGroupChips() {
  const container = document.getElementById('existingGroupChips');
  if (!container) return;
  const d = load();
  const keys = Object.keys(d.groups || {});
  if (keys.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = keys.map(k =>
    `<span onclick="document.getElementById('groupNameInput').value='${k}';document.getElementById('loadGroupBtn').disabled=false;"
      style="padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:600;cursor:pointer;
             background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);color:var(--accent);">
      ${k}
    </span>`
  ).join('');
}

// ─────────────────────────────────────────────────────────
function parseScheduleSheet() {
  const sheetName = document.getElementById('sheetSelector').value;
  if (!sheetName || !_uniWB) return;

  // اسم المجموعة — إلزامي
  const groupNameRaw = (document.getElementById('groupNameInput')?.value || '').trim();
  const groupId = groupNameRaw || 'Group 1';

  const ws = _uniWB.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:null});

  const DAY_MAP = {
    'SUNDAY':0,'MONDAY':1,'TUESDAY':2,'WEDNESDAY':3,'THURSDAY':4
  };

  // Find header row (contains TIME + day names)
  let headerRow = -1;
  let dayColumns = {}; // col index -> day index
  for (let r = 0; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    const upper = row.map(c => c ? String(c).toUpperCase().trim() : '');
    if (upper.includes('TIME') && upper.some(c => DAY_MAP[c] !== undefined)) {
      headerRow = r;
      upper.forEach((val, ci) => { if (DAY_MAP[val] !== undefined) dayColumns[ci] = DAY_MAP[val]; });
      break;
    }
  }

  if (headerRow === -1) { alert('Could not find schedule header row.'); return; }

  const d = load();
  const newCourses = {};
  const newSchedule = [];

  // Parse each data row
  for (let r = headerRow + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    const timeCell = row[0] ? String(row[0]).trim() : '';
    if (!timeCell || timeCell.toUpperCase() === 'BREAK' || !timeCell.includes(':')) continue;

    // Extract start time (e.g. "09:00 - 09:50" -> "09:00")
    const timeMatch = timeCell.match(/(\d{1,2}:\d{2})/);
    if (!timeMatch) continue;
    const time = timeMatch[1].padStart(5,'0');

    Object.entries(dayColumns).forEach(([ci, dayIdx]) => {
      const cell = row[parseInt(ci)];
      if (!cell) return;
      const cellStr = String(cell).trim();
      if (!cellStr || cellStr.toUpperCase() === 'BREAK') return;

      const lines = cellStr.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return;

      // First line = course code (e.g. "PAMG 214")
      const codeMatch = lines[0].match(/^([A-Z]{2,6}\s*\d{3}[A-Z]?)/);
      if (!codeMatch) return;
      const code = codeMatch[1].replace(/\s+/, ' ').trim();
      const name = lines[1] || '';
      const room = lines[lines.length - 1] || '';

      // Only add if not a duplicate in schedule
      const exists = newSchedule.find(s => s.day===dayIdx && s.time===time && s.courseCode===code);
      if (!exists) newSchedule.push({day:dayIdx, time, courseCode:code});

      if (!newCourses[code]) {
        const ci2 = Object.keys(newCourses).length % COLORS.length;
        newCourses[code] = {
          code,
          name: name.replace(/\s+for\s+(AMS|Applied Medical.*?)$/i, '').trim(),
          room: room.includes('S-') || room.includes('N-') ? room : (lines.find(l => l.match(/^[SN]-[A-Z]\d+/)) || room),
          color: COLORS[ci2],
          students: (d.groups?.[groupId]?.courses?.[code] || d.courses[code])?.students || []
        };
      }
    });
  }

  // ── حفظ في المجموعة المحددة ──────────────────────────────
  if (!d.groups) d.groups = {};

  // الدمج مع مواد المجموعة الموجودة (للحفاظ على قوائم الطلاب)
  const existingGroup = d.groups[groupId] || { courses:{}, schedule:[] };
  Object.keys(newCourses).forEach(code => {
    if (existingGroup.courses[code]) {
      newCourses[code].students = existingGroup.courses[code].students;
    }
  });

  d.groups[groupId] = {
    courses:  { ...existingGroup.courses, ...newCourses },
    schedule: newSchedule.sort((a,b) => a.day-b.day || a.time.localeCompare(b.time))
  };

  // تعيين المجموعة النشطة إذا لم تكن محددة
  if (!d.activeGroup) d.activeGroup = groupId;

  // تحديث الحقول القديمة للـ courses/schedule للتوافق (نشطة فقط)
  if (d.activeGroup === groupId) {
    d.courses  = d.groups[groupId].courses;
    d.schedule = d.groups[groupId].schedule;
  }

  save(d);
  refreshGroupSelector();
  renderCourseList();
  renderSchedEntries();
  renderRosterStatus();
  markDone('sn2');

  // مسح حقل الاسم استعداداً لمجموعة ثانية
  const inp = document.getElementById('groupNameInput');
  if (inp) inp.value = '';
  renderExistingGroupChips();

  alert('✅ Group "' + groupId + '": ' + Object.keys(newCourses).length + ' courses, ' + newSchedule.length + ' slots loaded!');
}

// ── SIS Roster Parser (Excel + PDF) ───────────────────────
let _rosterQueue = []; // [{filename, students}]

function loadRoster(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  const d = load();
  if (!Object.keys(d.courses).length) { alert('Upload schedule first (Step 2)'); return; }

  let processed = 0;
  files.forEach(file => {
    const reader = new FileReader();
    const isExcel = file.name.match(/\.xlsx?$/i);
    reader.onload = e => {
      let students = [];
      if (isExcel) {
        students = parseRosterExcel(e.target.result);
      } else {
        const bytes = new Uint8Array(e.target.result);
        const text = extractPDFText(bytes);
        students = parseSISRoster(text);
      }
      if (students.length) {
        _rosterQueue.push({ filename: file.name, students });
      } else {
        alert(`Could not read students from: ${file.name}`);
      }
      processed++;
      if (processed === files.length) {
        renderRosterQueue();
        document.getElementById('rosterLabel').textContent =
          `${_rosterQueue.length} file(s) ready to assign`;
        document.getElementById('rosterZone').classList.add('loaded');
      }
    };
    reader.readAsArrayBuffer(file);
  });
  input.value = '';
}

function parseRosterExcel(buffer) {
  const wb = XLSX.read(buffer, {type:'array'});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:null});

  const students = [];
  const campusIdPattern = /\d{2}-\d{1}-\d{1}-\d{1}-\d{4}/;

  for (let r = 0; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    // Find Campus ID in any column
    let campusId = '', name = '', seat = 0;
    for (let c = 0; c < row.length; c++) {
      const val = row[c] ? String(row[c]).trim() : '';
      if (campusIdPattern.test(val)) {
        campusId = val.match(campusIdPattern)[0];
        // seat: first numeric column
        for (let cc = 0; cc < c; cc++) {
          const v = row[cc];
          if (v && !isNaN(parseInt(v))) { seat = parseInt(v); break; }
        }
        // name: column after campusId or before
        const nextVal = row[c+1] ? String(row[c+1]).trim() : '';
        const prevVal = c>0 && row[c-1] ? String(row[c-1]).trim() : '';
        if (nextVal && /[A-Za-z]/.test(nextVal)) name = nextVal;
        else if (prevVal && /[A-Za-z]/.test(prevVal) && !campusIdPattern.test(prevVal)) name = prevVal;
        break;
      }
    }
    if (campusId && !students.find(s => s.campusId === campusId)) {
      students.push({ seat: seat || students.length+1, campusId, name: name || campusId });
    }
  }
  students.sort((a,b) => a.campusId.localeCompare(b.campusId));
  students.forEach((s,i) => s.seat = i+1);
  return students;
}

function extractPDFText(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 32 && b <= 126) text += String.fromCharCode(b);
    else if (b === 10 || b === 13) text += '\n';
  }
  return text;
}

function parseSISRoster(text) {
  const students = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const campusIdPattern = /\d{2}-\d{1}-\d{1}-\d{1}-\d{4}/;
  let seatCounter = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const campusMatch = line.match(campusIdPattern);
    if (!campusMatch) continue;
    const campusId = campusMatch[0];
    let seat = seatCounter;
    const numMatch = line.match(/^(\d+)\s/);
    if (numMatch) seat = parseInt(numMatch[1]);
    let name = '';
    const afterCampus = line.substring(line.indexOf(campusId) + campusId.length).trim();
    if (afterCampus && afterCampus.length > 3) name = afterCampus;
    else {
      const prev = lines[i-1]||'', next = lines[i+1]||'';
      if (/[A-Za-z,]/.test(prev) && !campusIdPattern.test(prev)) name = prev;
      else if (/[A-Za-z,]/.test(next) && !campusIdPattern.test(next)) name = next;
    }
    name = name.replace(/\d+/g,'').replace(/[^A-Za-z,. -]/g,'').trim();
    if (!students.find(s => s.campusId === campusId)) {
      students.push({ seat, campusId, name: name||campusId });
      seatCounter = seat+1;
    }
  }
  students.sort((a,b) => a.campusId.localeCompare(b.campusId));
  students.forEach((s,i) => s.seat = i+1);
  return students;
}

function renderRosterQueue() {
  const d = load();
  const courses = getActiveCourses(d);
  const keys = Object.keys(courses);
  const wrap = document.getElementById('rosterQueue');
  const list = document.getElementById('rosterQueueList');
  if (!_rosterQueue.length) { wrap.style.display='none'; return; }
  wrap.style.display = 'block';
  list.innerHTML = _rosterQueue.map((item, idx) => `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;">
      <div style="font-size:0.75rem;color:var(--text2);margin-bottom:8px;">
        📄 <strong>${item.filename}</strong>
        <span style="color:var(--green);margin-right:8px;">${item.students.length} students</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <select class="input" id="rosterAssign_${idx}" style="flex:1;">
          <option value="">— Assign to course —</option>
          ${keys.map(k=>`<option value="${k}">${courses[k].code} — ${courses[k].name}</option>`).join('')}
        </select>
        <button class="btn btn-success" onclick="saveQueueItem(${idx})">✓ Save</button>
        <button class="btn btn-danger" onclick="removeQueueItem(${idx})" style="padding:6px 10px;">✕</button>
      </div>
    </div>`).join('');
}

function saveQueueItem(idx) {
  const sel = document.getElementById(`rosterAssign_${idx}`);
  const code = sel ? sel.value : '';
  if (!code) { alert('Select a course first.'); return; }
  const d = load();
  const gid = d.activeGroup;
  if (gid && d.groups && d.groups[gid] && d.groups[gid].courses[code]) {
    d.groups[gid].courses[code].students = _rosterQueue[idx].students;
    d.courses = d.groups[gid].courses;
  } else {
    if (d.courses[code]) d.courses[code].students = _rosterQueue[idx].students;
  }
  save(d);
  _rosterQueue.splice(idx, 1);
  renderRosterQueue();
  renderRosterStatus();
  if (!_rosterQueue.length) {
    document.getElementById('rosterLabel').textContent = 'Click or drag SIS files here';
    document.getElementById('rosterZone').classList.remove('loaded');
    markDone('sn3');
  }
  const cnt = gid && d.groups?.[gid]?.courses?.[code]?.students?.length || d.courses?.[code]?.students?.length || 0;
  alert(`✅ ${cnt} students saved to ${code}`);
}

function removeQueueItem(idx) {
  _rosterQueue.splice(idx, 1);
  renderRosterQueue();
  if (!_rosterQueue.length) {
    document.getElementById('rosterLabel').textContent = 'Click or drag SIS files here';
    document.getElementById('rosterZone').classList.remove('loaded');
  }
}

function renderRosterStatus() {
  const d = load();
  const courses = getActiveCourses(d);
  const el = document.getElementById('rosterStatusList');
  const keys = Object.keys(courses);
  if (!keys.length) { el.innerHTML='<div class="empty" style="padding:10px;font-size:0.75rem;">Upload schedule first (Step 2)</div>'; return; }
  el.innerHTML = keys.map(k => {
    const c = courses[k];
    const hasRoster = c.students && c.students.length > 0;
    return `<div class="ci">
      <div class="ci-dot" style="background:${hasRoster?'var(--green)':'var(--text3)'}"></div>
      <div class="ci-code">${c.code}</div>
      <div class="ci-name">${c.name}</div>
      <div class="ci-cnt" style="color:${hasRoster?'var(--green)':'var(--yellow)'}">
        ${hasRoster ? c.students.length+' ✓' : 'No roster yet'}
      </div>
    </div>`;
  }).join('');
}

function renderCourseList() {
  const d = load();
  const courses = getActiveCourses(d);
  const el = document.getElementById('courseList');
  const keys = Object.keys(courses);
  if (!keys.length) { el.innerHTML='<div class="empty" style="padding:10px;font-size:0.75rem;">No courses loaded yet</div>'; return; }
  el.innerHTML = keys.map(k => {
    const c = courses[k];
    return `<div class="ci">
      <div class="ci-dot" style="background:${c.color}"></div>
      <div class="ci-code">${c.code}</div>
      <div class="ci-name">${c.name}</div>
      <div class="ci-cnt">${c.students.length} students</div>
      <div class="ci-del" onclick="delCourse('${k}')">✕</div>
    </div>`;
  }).join('');
}

function delCourse(code) {
  if (!confirm(`Remove ${code}?`)) return;
  const d = load();
  const gid = d.activeGroup;
  if (gid && d.groups && d.groups[gid]) {
    delete d.groups[gid].courses[code];
    d.groups[gid].schedule = d.groups[gid].schedule.filter(s=>s.courseCode!==code);
  }
  // sync flat fields
  d.courses  = getActiveCourses(d);
  d.schedule = getActiveSchedule(d);
  save(d); renderCourseList(); renderSchedEntries();
}

function dlTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Seat No','Campus ID','Name','Course Code','Course Name','Room'],
    [1,'45-1-1-1-0002','Alanazi, Ibrahim Saud','PAMG 214','Pathology & Molecular Genetics','S-A003'],
    [2,'45-1-1-1-0188','Almutairi, Abdulelah Masoud','PAMG 214','Pathology & Molecular Genetics','S-A003'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Roster');
  XLSX.writeFile(wb,'course-roster-template.xlsx');
}

function renderSchedCoursePicker() {
  const d = load();
  const courses = getActiveCourses(d);
  const sel = document.getElementById('sbCourse');
  sel.innerHTML = '<option value="">— Select course —</option>';
  Object.keys(courses).forEach(k=>{
    sel.innerHTML += `<option value="${k}">${courses[k].code} — ${courses[k].name}</option>`;
  });
}

function addSched() {
  const day=parseInt(document.getElementById('sbDay').value);
  const time=document.getElementById('sbTime').value;
  const code=document.getElementById('sbCourse').value;
  if (!time||!code) { alert('Please fill in all fields.'); return; }
  const d=load();
  const gid = d.activeGroup;
  const schedule = getActiveSchedule(d);
  if (schedule.find(s=>s.day===day&&s.time===time)) { alert('This time slot is already taken.'); return; }
  if (gid && d.groups && d.groups[gid]) {
    d.groups[gid].schedule.push({day,time,courseCode:code});
    d.groups[gid].schedule.sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time));
    d.schedule = d.groups[gid].schedule;
  }
  save(d); renderSchedEntries(); markDone('sn3');
}

function renderSchedEntries() {
  const d = load();
  const courses  = getActiveCourses(d);
  const schedule = getActiveSchedule(d);
  const c = document.getElementById('schedEntries');
  renderSchedCoursePicker();
  if (!schedule.length) {
    c.innerHTML='<div class="empty" style="padding:10px;font-size:0.75rem;" id="schedEmpty">No schedule entries yet</div>'; return;
  }
  c.innerHTML = schedule.map((s,i)=>{
    const co = courses[s.courseCode]; if (!co) return '';
    return `<div class="sched-entry">
      <span class="se-day">${DAYS[s.day]}</span>
      <span class="se-time">${s.time}</span>
      <span class="se-course">${co.code} — ${co.name}</span>
      <span class="se-del" onclick="delSched(${i})">✕</span>
    </div>`;
  }).join('');
}

function delSched(i) {
  const d = load();
  const gid = d.activeGroup;
  if (gid && d.groups && d.groups[gid]) {
    d.groups[gid].schedule.splice(i,1);
    d.schedule = d.groups[gid].schedule;
  } else {
    d.schedule.splice(i,1);
  }
  save(d); renderSchedEntries();
}

function confirmClear() {
  const d = load();
  const gid = d.activeGroup;
  const msg = gid
    ? `Clear all data for group "${gid}"? (courses, schedule, sessions)`
    : 'Clear all courses, schedule, and sessions for this term?';
  if (!confirm(msg)) return;
  if (gid && d.groups && d.groups[gid]) {
    // مسح المجموعة النشطة فقط
    delete d.groups[gid];
    const remaining = Object.keys(d.groups);
    d.activeGroup = remaining.length ? remaining[0] : null;
    d.courses  = getActiveCourses(d);
    d.schedule = getActiveSchedule(d);
    // مسح جلسات هذه المجموعة
    d.sessions = (d.sessions||[]).filter(s => s.groupId !== gid);
  } else {
    d.courses={}; d.schedule=[]; d.sessions=[]; d.term={start:null,weeks:16};
    d.groups={}; d.activeGroup=null;
  }
  save(d); refreshGroupSelector(); renderSetup(); renderSched(); renderPicker();
  alert('✅ Data cleared.');
}

// ══════════════════════════════════════════════════════════
//  ATTENDANCE
// ══════════════════════════════════════════════════════════
