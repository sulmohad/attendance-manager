
const GROUP_COLORS = ['#3b82f6','#a855f7','#22c55e','#f97316','#06b6d4','#eab308'];

function getActiveGroup(d) {
  if (!d) d = load();
  if (!d.groups || !d.activeGroup) return { courses:{}, schedule:[] };
  return d.groups[d.activeGroup] || { courses:{}, schedule:[] };
}
function getActiveCourses(d) { return getActiveGroup(d).courses || {}; }
function getActiveSchedule(d) { return getActiveGroup(d).schedule || []; }

function getGroupColor(groupId, d) {
  if (!d) d = load();
  const idx = Object.keys(d.groups || {}).indexOf(groupId);
  return GROUP_COLORS[Math.max(0, idx) % GROUP_COLORS.length];
}

function refreshGroupSelector() {
  const d    = load();
  const wrap = document.getElementById('groupSelectorWrap');
  const sel  = document.getElementById('groupSelect');
  const dot  = document.getElementById('groupDot');
  const none = document.getElementById('groupNoneMsg');
  if (!wrap || !sel) return;
  const groups = d.groups || {};
  const keys   = Object.keys(groups);
  if (keys.length === 0) {
    wrap.style.display = 'none';
    none.style.display = 'inline-block';
    return;
  }
  none.style.display = 'none';
  wrap.style.display = 'flex';
  sel.innerHTML = '';
  keys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    if (k === d.activeGroup) opt.selected = true;
    sel.appendChild(opt);
  });
  if (dot) dot.style.background = getGroupColor(d.activeGroup, d);
}

function switchGroup(groupId) {
  const d = load();
  if (!d.groups[groupId]) return;
  d.activeGroup = groupId;
  save(d);
  const dot = document.getElementById('groupDot');
  if (dot) dot.style.background = getGroupColor(groupId, d);
  const activePage = document.querySelector('.page.active');
  if (activePage) showPage(activePage.id.replace('page-', ''));
}

// ── Permission helpers ─────────────────────────────────────
function isAdmin()      { return CU && CU.role === 'admin'; }
function isTeamLead()   { return CU && CU.role === 'teamlead'; }
function isUser()       { return CU && CU.role === 'user'; }
function canSeeAnalytics()  { return isAdmin(); }
function canSeeAdminPanel() { return isAdmin(); }

// Get list of usernames this user can see data for
function accessibleUsers() {
  const shared = loadShared();
  if (isAdmin()) return shared.users.map(u => u.username);
  if (isTeamLead()) {
    const me = shared.users.find(u => u.username === CU.username);
    return me ? [CU.username, ...(me.team || [])] : [CU.username];
  }
  return [CU.username];
}

function canAccessUser(username) {
  return accessibleUsers().includes(username);
}

// Check if a permission is enabled for this user
function hasPerm(perm) {
  if (!CU) return false;
  if (isAdmin()) return true;
  const shared = loadShared();
  const me = shared.users.find(u => u.username === CU.username);
  if (!me || me.enabled === false) return false;
  const perms = me.permissions || [];
  if (isTeamLead()) {
    const teamLeadPerms = ['viewTeam','staffNameInReport','noShowUnified','biweeklyUnified','studentAllCourses'];
    return teamLeadPerms.includes(perm) || perms.includes(perm);
  }
  return perms.includes(perm);
}

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════
