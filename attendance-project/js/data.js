// ══════════════════════════════════════════════════════════
//  STORAGE
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
//  STORAGE — Separated by user
//  SK_SHARED  → users list (shared between all)
//  SK_USER(u) → personal data per user (courses, schedule, term, sessions, tourDone)
// ══════════════════════════════════════════════════════════
const SK_SHARED = 'attMgr_v3_shared';
const SK_USER   = (u) => `attMgr_v3_user_${u}`;

// Shared store: only users list
function loadShared() {
  try {
    return JSON.parse(localStorage.getItem(SK_SHARED)) || initShared();
  } catch { return initShared(); }
}

function initShared() {
  return {
    users: [
      { username:'admin', password:'admin123', role:'admin', lastLogin:null, enabled:true, team:[] },
      { username:'demo',  password:'demo123',  role:'teamlead', lastLogin:null, enabled:true, team:[] }
    ]
  };
}

function saveShared(d) { localStorage.setItem(SK_SHARED, JSON.stringify(d)); }

// Personal store: groups (multi-group), term, sessions, tourDone
// groups structure: { "MAB": { courses:{}, schedule:[] }, ... }
// activeGroup: string key into groups
function initPersonal() {
  return {
    term:        { start:null, weeks:16 },
    groups:      {},
    activeGroup: null,
    // Legacy flat fields kept for migration compatibility:
    courses:     {},
    schedule:    [],
    sessions:    [],
    tourDone:    false
  };
}

// ── Migration: upgrade old flat data to multi-group ──────
function migratePersonal(p) {
  // Already migrated if groups object exists and has entries
  if (p.groups && Object.keys(p.groups).length > 0) return p;
  // Has old flat courses → migrate to "Group 1"
  if (p.courses && Object.keys(p.courses).length > 0) {
    p.groups = { 'Group 1': { courses: p.courses, schedule: p.schedule || [] } };
    p.activeGroup = 'Group 1';
    // tag existing sessions with groupId
    (p.sessions || []).forEach(s => { if (!s.groupId) s.groupId = 'Group 1'; });
  } else {
    p.groups = {};
    p.activeGroup = null;
  }
  return p;
}

function loadPersonal(username) {
  const u = username || (CU ? CU.username : null);
  if (!u) return initPersonal();
  try {
    const raw = JSON.parse(localStorage.getItem(SK_USER(u))) || initPersonal();
    return migratePersonal(raw);
  } catch { return initPersonal(); }
}

function savePersonal(d, username) {
  const u = username || (CU ? CU.username : null);
  if (!u) return;
  localStorage.setItem(SK_USER(u), JSON.stringify(d));
}

// ── Cross-user data helpers ───────────────────────────────

// Get courses — multi-group aware
function loadAccessibleCourses(forceUser) {
  const username = forceUser || CU.username;
  const p = loadPersonal(username);
  const result = {};
  // جمع من كل المجموعات
  if (p.groups && Object.keys(p.groups).length > 0) {
    Object.entries(p.groups).forEach(([gid, g]) => {
      Object.entries(g.courses || {}).forEach(([k, c]) => {
        const key = `${k}::g::${gid}`; // مفتاح فريد per group
        result[key] = { ...c, _owner: username, _origKey: k, _groupId: gid };
      });
    });
  } else {
    Object.entries(p.courses || {}).forEach(([k, c]) => {
      result[k] = { ...c, _owner: username, _origKey: k };
    });
  }
  return result;
}

// Get usernames accessible to current user (without loading full data)
function accessibleUsernames() {
  const shared = loadShared();
  if (isAdmin()) return shared.users.map(u => u.username);
  if (isTeamLead()) {
    const me = shared.users.find(u => u.username === CU.username);
    return me ? [CU.username, ...(me.team || [])] : [CU.username];
  }
  return [CU.username];
}

// Get courses for a specific user — multi-group aware (all groups merged)
function loadUserCourses(username) {
  const p = loadPersonal(username);
  // إذا وُجدت مجموعات، نجمع المواد من كلها
  if (p.groups && Object.keys(p.groups).length > 0) {
    const merged = {};
    Object.values(p.groups).forEach(g => {
      Object.assign(merged, g.courses || {});
    });
    return merged;
  }
  return p.courses || {};
}

// Get ALL courses for a user across all groups (returns array with groupId)
function getAllCoursesForUser(username) {
  const p = loadPersonal(username);
  const result = [];
  if (p.groups && Object.keys(p.groups).length > 0) {
    Object.entries(p.groups).forEach(([gid, g]) => {
      Object.values(g.courses || {}).forEach(c => {
        result.push({ ...c, _groupId: gid });
      });
    });
  } else {
    Object.values(p.courses || {}).forEach(c => result.push(c));
  }
  return result;
}

// Get a specific course for a user across all groups
function getCourseForUser(username, courseCode) {
  const p = loadPersonal(username);
  if (p.groups && Object.keys(p.groups).length > 0) {
    for (const g of Object.values(p.groups)) {
      if (g.courses && g.courses[courseCode]) return g.courses[courseCode];
    }
  }
  return p.courses ? p.courses[courseCode] : null;
}

// Resolve a potentially-prefixed course key to {owner, key}
function resolveCourseKey(key) {
  // صيغة مجموعة: code::g::groupId → لا تُعالج هنا
  if (key.includes('::g::')) {
    return { owner: CU?.username, key: key.split('::g::')[0] };
  }
  if (key.includes('::')) {
    const [owner, origKey] = key.split('::');
    return { owner, key: origKey };
  }
  return { owner: CU?.username || '', key };
}

// Get course object from potentially-prefixed key (multi-group aware)
// صيغ المفاتيح الممكنة:
//   "ANTM 214"            → مفتاح عادي (active group)
//   "user::ANTM 214"      → مفتاح مستخدم (cross-user)
//   "ANTM 214::g::MAB"    → مفتاح مجموعة محدد
function getCourse(key) {
  // صيغة مجموعة محددة: code::g::groupId
  if (key.includes('::g::')) {
    const [courseCode, , gid] = key.split('::');
    const p = loadPersonal(CU?.username);
    return p.groups?.[gid]?.courses?.[courseCode] || null;
  }
  // صيغة cross-user: owner::courseCode
  const { owner, key: origKey } = resolveCourseKey(key);
  const p = loadPersonal(owner);
  // البحث في المجموعة النشطة أولاً
  if (p.groups && p.activeGroup && p.groups[p.activeGroup]) {
    const c = p.groups[p.activeGroup].courses[origKey];
    if (c) return c;
  }
  // fallback: البحث في كل المجموعات
  if (p.groups) {
    for (const gid of Object.keys(p.groups)) {
      const c = p.groups[gid].courses?.[origKey];
      if (c) return c;
    }
  }
  return p.courses ? p.courses[origKey] : null;
}

// ── Compatibility wrappers ─────────────────────────────────
// load() returns merged view: shared users + personal data
function load() {
  const shared   = loadShared();
  const personal = loadPersonal(CU?.username);
  return { ...personal, users: shared.users };
}

// save() splits into shared and personal
function save(d) {
  // Save users to shared
  if (d.users) {
    const shared = loadShared();
    shared.users = d.users;
    saveShared(shared);
  }
  // Save personal data (multi-group aware)
  const personal = {
    term:        d.term        || initPersonal().term,
    groups:      d.groups      || {},
    activeGroup: d.activeGroup || null,
    // keep flat fields for compatibility
    courses:     d.courses     || {},
    schedule:    d.schedule    || [],
    sessions:    d.sessions    || [],
    tourDone:    d.tourDone    || false,
    smartAlert:  d.smartAlert  || false
  };
  savePersonal(personal);
}

// Load another user's personal data (for Admin/Team Lead views)
function loadUserData(username) {
  const personal = loadPersonal(username);
  const shared   = loadShared();
  return { ...personal, users: shared.users };
}

// Get all sessions across all users (for Admin analytics)
function loadAllSessions() {
  const shared = loadShared();
  const all = [];
  shared.users.forEach(u => {
    const p = loadPersonal(u.username);
    (p.sessions||[]).forEach(s => all.push({...s, _owner: u.username}));
  });
  return all;
}

// ══════════════════════════════════════════════════════════
//  MULTI-GROUP HELPERS
// ══════════════════════════════════════════════════════════
