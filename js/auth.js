let CU = null;
const COLORS = ['#3b82f6','#22c55e','#ef4444','#eab308','#a855f7','#f97316','#06b6d4','#ec4899'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday'];

function doLogin() {
  const shared = loadShared();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const user = shared.users.find(x => x.username===u && x.password===p);
  if (!user) { document.getElementById('loginErr').style.display='block'; return; }
  if (user.enabled === false) {
    document.getElementById('loginErr').textContent = 'Account is disabled. Contact admin.';
    document.getElementById('loginErr').style.display='block'; return;
  }
  user.lastLogin = new Date().toISOString();
  saveShared(shared);
  CU = user;
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'block';
  document.getElementById('userLbl').textContent = user.username;
  document.getElementById('userAv').textContent = user.username[0].toUpperCase();
  // Show/hide tabs based on role
  const badge = document.getElementById('adminBadge');
  const tabAnalytics = document.getElementById('tab-analytics');
  const tabAdmin = document.getElementById('tab-admin');
  const tabStudents = document.getElementById('tab-students');

  if (isAdmin()) {
    badge.textContent = 'ADMIN';
    badge.style.display = 'inline-flex';
    badge.style.background = 'rgba(168,85,247,0.15)';
    badge.style.color = 'var(--purple)';
    badge.style.borderColor = 'rgba(168,85,247,0.3)';
    tabAnalytics.style.display = 'flex';
    tabAdmin.style.display = 'flex';
  } else if (isTeamLead()) {
    badge.textContent = 'TEAM LEAD';
    badge.style.display = 'inline-flex';
    badge.style.background = 'rgba(6,182,212,0.12)';
    badge.style.color = 'var(--cyan)';
    badge.style.borderColor = 'rgba(6,182,212,0.3)';
    tabAnalytics.style.display = 'none';
    tabAdmin.style.display = 'none';
  } else {
    badge.style.display = 'none';
    tabAnalytics.style.display = 'none';
    tabAdmin.style.display = 'none';
  }
  if (tabStudents) tabStudents.style.display = 'flex';
  initApp();
}

function doLogout() {
  CU = null;
  _attMode = 'manual';
  stopTimer();
  document.getElementById('appPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginErr').style.display = 'none';
}

// ══════════════════════════════════════════════════════════
//  NAV
// ══════════════════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nt').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.mn-item').forEach(t=>t.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  const tab = document.getElementById('tab-'+id);
  if (tab) tab.classList.add('active');
  const mn = document.getElementById('mn-'+id);
  if (mn) mn.classList.add('active');
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  if (id==='schedule')   renderSched();
  if (id==='attendance') renderPicker();
  if (id==='reports')    renderReports();
  if (id==='analytics')  renderAnalytics();
  if (id==='setup')      renderSetup();
  if (id==='students')   renderStudentsPage();
}

function initApp() {
  refreshGroupSelector();
  updateAlertToggleUI();
  checkAlert();
  checkArchive();
  renderSched();
  renderPicker();
  renderReports();
  renderSetup();
  initMobileNav();
  // Show analytics help section for admin only
  const helpAnalytics = document.getElementById('helpAnalyticsSection');
  if (helpAnalytics) helpAnalytics.style.display = isAdmin() ? 'block' : 'none';
  const d = load();
  if (!d.tourDone) setTimeout(startTour, 800);
}

function initMobileNav() {
  // Mirror the same visibility logic as desktop tabs
  const anTab  = document.getElementById('tab-analytics');
  const admTab = document.getElementById('tab-admin');
  const mnAn   = document.getElementById('mn-analytics');
  const mnAdm  = document.getElementById('mn-admin');
  if (mnAn)  mnAn.style.display  = (anTab  && anTab.style.display  !== 'none') ? 'inline-flex' : 'none';
  if (mnAdm) mnAdm.style.display = (admTab && admTab.style.display !== 'none') ? 'inline-flex' : 'none';
  // Set initial active state to match schedule (default page)
  document.querySelectorAll('.mn-item').forEach(t=>t.classList.remove('active'));
  const active = document.querySelector('.page.active');
  if (active) {
    const pid = active.id.replace('page-','');
    const mn = document.getElementById('mn-'+pid);
    if (mn) mn.classList.add('active');
  }
}

