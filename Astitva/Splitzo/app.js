/* ============================================
   SPLITZO — Main Application Logic
   ============================================ */

/* ── App State ─────────────────────────────── */
const state = {
  currentUser: null,
  currentPage: 'landing',
  currentGroupId: null,
  currentGroup: null,
  groups: [],
  members: [],      // temp members for create-group form
  expenses: [],
  splitType: 'equal'
};

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
const CURRENCY_RATES = { INR: 1, USD: 83.5, EUR: 90.2, GBP: 105.8, JPY: 0.56 }; // to INR

/* ── DOM References ────────────────────────── */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ── Page Navigation (SPA) ─────────────────── */
function navigateTo(pageId) {
  $$('.page').forEach(p => { p.classList.remove('active'); p.style.animation = 'none'; });
  const page = $(`#page-${pageId}`);
  if (page) {
    page.classList.add('active');
    void page.offsetWidth; // trigger reflow
    page.style.animation = 'fadeInPage .4s cubic-bezier(.4,0,.2,1) forwards';
  }
  state.currentPage = pageId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update nav active state
  $$('.nav-links a').forEach(a => a.classList.remove('active'));
  if (pageId === 'landing') {
    $('[data-nav="home"]').classList.add('active');
  }
}

/* ── Theme Toggle ──────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('splitzo-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('splitzo-theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  $('#theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* ── Toast Notifications ───────────────────── */
function showToast(title, message, type = 'info') {
  const container = $('#toast-container');
  const icons = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-content">
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .4s cubic-bezier(.4,0,.2,1) forwards';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

/* ── Header Scroll Effect ──────────────────── */
function initHeaderScroll() {
  window.addEventListener('scroll', () => {
    const header = $('#main-header');
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/* ── Hamburger Menu ────────────────────────── */
function initHamburger() {
  const hamburger = $('#hamburger');
  const navLinks = $('#nav-links');
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });
  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });
}

/* ── Profile Dropdown ──────────────────────── */
function initProfileDropdown() {
  const btn = $('#profile-btn');
  const dropdown = $('#profile-dropdown');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!$('#profile-wrapper').contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });
}

/* ── Modal Helpers ─────────────────────────── */
function openModal(id) { $(`#${id}`).classList.add('open'); }
function closeModal(id) { $(`#${id}`).classList.remove('open'); }

function initModals() {
  // Login
  $('#show-login-btn').addEventListener('click', (e) => {
    e.preventDefault();
    $('#profile-dropdown').classList.remove('open');
    openModal('login-modal');
  });
  $('#login-modal-close').addEventListener('click', () => closeModal('login-modal'));
  $('#switch-to-register').addEventListener('click', () => {
    closeModal('login-modal');
    setTimeout(() => openModal('register-modal'), 200);
  });

  // Register
  $('#show-register-btn').addEventListener('click', (e) => {
    e.preventDefault();
    $('#profile-dropdown').classList.remove('open');
    openModal('register-modal');
  });
  $('#register-modal-close').addEventListener('click', () => closeModal('register-modal'));
  $('#switch-to-login').addEventListener('click', () => {
    closeModal('register-modal');
    setTimeout(() => openModal('login-modal'), 200);
  });

  // Split & Pay
  $('#split-pay-close').addEventListener('click', () => closeModal('split-pay-modal'));

  // Close on overlay click
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

/* ── Auth State ────────────────────────────── */
function updateUIForAuth(user) {
  if (user) {
    state.currentUser = user;
    const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
    $('#profile-initial').textContent = initial;
    $('#dropdown-logged-out').classList.add('hidden');
    $('#dropdown-logged-in').classList.remove('hidden');
    const displayName = user.displayName || user.email.split('@')[0];
    $('#dropdown-user-name').textContent = displayName;
    $('#dashboard-user-name').textContent = displayName;
  } else {
    state.currentUser = null;
    $('#profile-initial').textContent = '👤';
    $('#dropdown-logged-out').classList.remove('hidden');
    $('#dropdown-logged-in').classList.add('hidden');
  }
}

/* ── Auth Handlers ─────────────────────────── */
function initAuth() {
  // Listen for auth state changes
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Try to get user data from Firestore
      try {
        const userData = await DB.getUser(user.uid);
        if (userData) {
          user.displayName = user.displayName || userData.name;
        }
      } catch (err) {
        console.warn("Could not fetch user data (might be missing Firestore rules):", err);
      }
      updateUIForAuth(user);

      // Process pending invites after login
      const pendingGroupId = sessionStorage.getItem('pendingInviteGroupId');
      const pendingPhone = sessionStorage.getItem('pendingInvitePhone');
      if (pendingGroupId) {
        try {
          const uName = user.displayName || user.email.split('@')[0];
          await DB.joinGroupFromInvite(pendingGroupId, user.email, uName, pendingPhone);
          sessionStorage.removeItem('pendingInviteGroupId');
          sessionStorage.removeItem('pendingInvitePhone');
          showToast('Welcome!', 'You successfully joined the group from the invite.', 'success');
          // Navigate to the group if we are not there already
          openGroup(pendingGroupId);
        } catch (e) {
          console.error(e);
          showToast('Error', 'Failed to join group from invite. Link may be invalid.', 'danger');
          sessionStorage.removeItem('pendingInviteGroupId');
          sessionStorage.removeItem('pendingInvitePhone');
        }
      }
    } else {
      updateUIForAuth(null);
      
      const pendingGroupId = sessionStorage.getItem('pendingInviteGroupId');
      if (pendingGroupId) {
        // user clicked link but is logged out
        showToast('Login Required', 'Please login or register to accept your invitation.', 'info');
        // Let's open the register modal automatically for them
        setTimeout(() => openModal('register-modal'), 1000);
      }
    }
  });

  // Login form
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    try {
      await auth.signInWithEmailAndPassword(email, password);
      closeModal('login-modal');
      showToast('Welcome back!', 'Logged in successfully.', 'success');
      loadMyGroups();
      navigateTo('dashboard');
      $('#login-form').reset();
    } catch (err) {
      showToast('Login Failed', err.message, 'danger');
    }
  });

  // Register form
  $('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#register-name').value.trim();
    const email = $('#register-email').value.trim();
    const password = $('#register-password').value;
    const confirm = $('#register-confirm-password').value;
    if (password !== confirm) {
      showToast('Error', 'Passwords do not match.', 'danger');
      return;
    }
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      await DB.createUser(cred.user.uid, { name, email });
      closeModal('register-modal');
      showToast('Welcome!', 'Account created successfully.', 'success');
      navigateTo('dashboard');
      loadMyGroups();
      $('#register-form').reset();
    } catch (err) {
      showToast('Registration Failed', err.message, 'danger');
    }
  });

  // Logout
  $('#logout-btn').addEventListener('click', async () => {
    await auth.signOut();
    $('#profile-dropdown').classList.remove('open');
    navigateTo('landing');
    showToast('Goodbye!', 'You have been logged out.', 'info');
  });
}

/* ── Navigation Links ──────────────────────── */
function initNavigation() {
  // Nav links
  $$('.nav-links a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const nav = a.getAttribute('data-nav');
      if (nav === 'home') {
        navigateTo('landing');
      } else if (nav === 'features') {
        navigateTo('landing');
        setTimeout(() => {
          document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else if (nav === 'contact') {
        navigateTo('landing');
        setTimeout(() => {
          document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });
  });

  // Logo
  $('#logo-link').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('landing');
  });

  // Hero buttons
  $('#hero-get-started').addEventListener('click', () => {
    if (state.currentUser) { navigateTo('dashboard'); loadMyGroups(); }
    else openModal('login-modal');
  });
  $('#hero-create-group').addEventListener('click', () => {
    if (state.currentUser) { navigateTo('create-group'); }
    else openModal('login-modal');
  });

  // Dashboard nav
  $('#nav-my-groups').addEventListener('click', (e) => {
    e.preventDefault();
    $('#profile-dropdown').classList.remove('open');
    navigateTo('dashboard');
    loadMyGroups();
  });
  $('#nav-member-dashboard').addEventListener('click', (e) => {
    e.preventDefault();
    $('#profile-dropdown').classList.remove('open');
    navigateTo('member-dashboard');
    loadMemberDashboard();
  });

  // Create group buttons
  $('#btn-open-create-group').addEventListener('click', () => navigateTo('create-group'));
  $('#btn-empty-create-group').addEventListener('click', () => navigateTo('create-group'));

  // Back buttons
  $('#back-from-create-group').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });
  $('#back-from-group-detail').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });
  $('#back-from-add-expense').addEventListener('click', () => { navigateTo('group-detail'); loadGroupDetail(state.currentGroupId); });
  $('#back-from-member-dashboard').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });

  // Group detail actions
  $('#btn-add-expense').addEventListener('click', () => {
    navigateTo('add-expense');
    initAddExpenseForm();
  });
  $('#btn-split-pay').addEventListener('click', () => {
    calculateSettlements();
    openModal('split-pay-modal');
  });
}

/* ── Contact Form ──────────────────────────── */
function initContactForm() {
  $('#contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#contact-name').value.trim();
    const email = $('#contact-email').value.trim();
    const message = $('#contact-message').value.trim();
    try {
      await DB.sendContactMessage({ name, email, message });
      showToast('Message Sent!', 'Thank you for reaching out. We\'ll get back to you soon.', 'success');
      $('#contact-form').reset();
    } catch (err) {
      showToast('Error', 'Failed to send message. Try again.', 'danger');
    }
  });
}

/* ═══════════════════════════════════════════
   CREATE GROUP
   ═══════════════════════════════════════════ */
function initCreateGroup() {
  state.members = [];

  $('#btn-add-member').addEventListener('click', () => {
    const name = $('#member-name-input').value.trim();
    const phone = $('#member-phone-input').value.trim();
    if (!name || !phone) {
      showToast('Missing Info', 'Please enter both name and mobile number.', 'warning');
      return;
    }
    if (state.members.find(m => m.phone === phone)) {
      showToast('Duplicate', 'This member is already added.', 'warning');
      return;
    }
    state.members.push({ name, phone, status: 'Pending' });
    renderMemberList();
    $('#member-name-input').value = '';
    $('#member-phone-input').value = '';
    showToast('Member Added', `${name} has been added.`, 'success');
  });

  // Remove individual send-invites button logic as it's merged into Create Group
  const btnSendInvites = $('#btn-send-invites');
  if (btnSendInvites) {
    btnSendInvites.style.display = 'none'; // hide it if it's there
  }

  $('#create-group-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const groupName = $('#group-name-input').value.trim();
    if (!groupName) { showToast('Error', 'Please enter a group name.', 'danger'); return; }

    const submitBtn = $('#create-group-form').querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.textContent = 'Creating & Opening WhatsApp...';

    // Include current user as member
    const allMembers = [...state.members];
    if (state.currentUser) {
      const userEmail = state.currentUser.email;
      if (!allMembers.find(m => m.email === userEmail)) {
        allMembers.push({
          name: state.currentUser.displayName || userEmail.split('@')[0],
          email: userEmail,
          status: 'Joined'
        });
      }
    }

    if (allMembers.length < 2) {
      showToast('Need Members', 'Add at least one other member to the group.', 'warning');
      if(submitBtn) submitBtn.textContent = 'Create Group & Send WhatsApp Invites';
      return;
    }

    try {
      const groupId = await DB.createGroup({
        name: groupName,
        members: allMembers,
        createdBy: state.currentUser.email
      });

      const creatorName = state.currentUser.displayName || state.currentUser.email.split('@')[0];
      
      let delay = 0;
      state.members.forEach((member) => {
        if (member.phone) {
          // Clean phone number (remove spaces/dashes)
          let cleanPhone = member.phone.replace(/[^0-9]/g, '');
          
          // If the user typed exactly 10 digits, assume it's an Indian number and prepend 91
          if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
          }
          
          const inviteLink = `${window.location.origin}${window.location.pathname}?inviteGroupId=${groupId}&phone=${cleanPhone}`;
          const textMsg = `${creatorName} invited you to join '${groupName}' on Splitzo.\nClick here to join: ${inviteLink}`;
          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMsg)}`;
          
          // Use setTimeout to open multiple tabs to try bypassing strict popup blockers
          setTimeout(() => {
            window.open(waUrl, '_blank');
          }, delay);
          delay += 1000;
        }
      });
      
      showToast('Group Created!', `"${groupName}" created. Redirecting to WhatsApp for invites.`, 'success');
      state.members = [];
      $('#create-group-form').reset();
      renderMemberList();
      if(submitBtn) submitBtn.textContent = 'Create Group & Send WhatsApp Invites';
      navigateTo('dashboard');
      loadMyGroups();
    } catch (err) {
      showToast('Error', 'Failed to create group. Try again.', 'danger');
      if(submitBtn) submitBtn.textContent = 'Create Group';
    }
  });
}

function renderMemberList() {
  const list = $('#member-list');
  if (state.members.length === 0) {
    list.innerHTML = '<p class="text-muted" style="text-align:center;padding:16px;font-size:.875rem;">No members added yet. Add members below.</p>';
    return;
  }
  list.innerHTML = state.members.map((m, i) => `
    <div class="member-item">
      <div class="member-avatar">${m.name.charAt(0).toUpperCase()}</div>
      <div class="member-info">
        <strong>${m.name}</strong>
        <small>📱 ${m.phone} <span class="badge badge-warning" style="font-size:0.65rem; margin-left: 6px;">Pending</span></small>
      </div>
      <button class="remove-member" type="button" onclick="removeMember(${i})">✕</button>
    </div>
  `).join('');
}

function removeMember(index) {
  state.members.splice(index, 1);
  renderMemberList();
}

/* ═══════════════════════════════════════════
   MY GROUPS (DASHBOARD)
   ═══════════════════════════════════════════ */
async function loadMyGroups() {
  if (!state.currentUser) return;
  const grid = $('#groups-grid');
  grid.innerHTML = '<p class="text-muted" style="text-align:center;padding:40px;grid-column:1/-1;">Loading groups...</p>';

  try {
    const groups = await DB.getGroupsByMemberEmail(state.currentUser.email);
    state.groups = groups;

    if (groups.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <h3>No groups yet</h3>
          <p>Create your first group to start splitting expenses.</p>
          <button class="btn btn-primary" onclick="navigateTo('create-group')">+ Create Group</button>
        </div>
      `;
      return;
    }

    // For each group, compute quick balance
    let cardsHTML = '';
    for (const group of groups) {
      const memberCount = Array.isArray(group.members) ? group.members.length : 0;
      const expenses = await DB.getExpenses(group.id);
      const balance = computeUserBalance(expenses, group.members, state.currentUser.email);
      const balanceClass = balance >= 0 ? 'balance-positive' : 'balance-negative';
      const balanceSign = balance >= 0 ? '+' : '';
      const emoji = getGroupEmoji(group.name);

      cardsHTML += `
        <div class="group-card" onclick="openGroup('${group.id}')">
          <div class="group-card-header">
            <div class="group-card-icon">${emoji}</div>
            <span class="badge badge-primary">${memberCount} members</span>
          </div>
          <h3>${escapeHTML(group.name)}</h3>
          <div class="members-count">👥 ${memberCount} people</div>
          <div class="balance-row">
            <span class="balance-label">Your Balance</span>
            <span class="balance-value ${balanceClass}">${balanceSign}₹${Math.abs(balance).toFixed(0)}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openGroup('${group.id}')">View Group →</button>
        </div>
      `;
    }
    grid.innerHTML = cardsHTML;
  } catch (err) {
    grid.innerHTML = '<p class="text-danger" style="text-align:center;padding:40px;grid-column:1/-1;">Failed to load groups.</p>';
    console.error(err);
  }
}

function getGroupEmoji(name) {
  const lower = name.toLowerCase();
  if (lower.includes('trip') || lower.includes('travel') || lower.includes('goa') || lower.includes('vacation')) return '✈️';
  if (lower.includes('room') || lower.includes('flat') || lower.includes('rent') || lower.includes('home')) return '🏠';
  if (lower.includes('office') || lower.includes('work')) return '💼';
  if (lower.includes('food') || lower.includes('dinner') || lower.includes('lunch')) return '🍕';
  if (lower.includes('party') || lower.includes('celebration')) return '🎉';
  return '👥';
}

/* ═══════════════════════════════════════════
   GROUP DETAIL
   ═══════════════════════════════════════════ */
async function openGroup(groupId) {
  state.currentGroupId = groupId;
  navigateTo('group-detail');
  await loadGroupDetail(groupId);
}

async function loadGroupDetail(groupId) {
  try {
    const group = await DB.getGroup(groupId);
    if (!group) { showToast('Error', 'Group not found.', 'danger'); return; }
    state.currentGroup = group;

    $('#group-detail-name').textContent = group.name;

    const expenses = await DB.getExpenses(groupId);
    state.expenses = expenses;

    const userEmail = state.currentUser.email;
    const members = group.members || [];

    // Calculate balances
    const balances = computeAllBalances(expenses, members, userEmail);

    // Update balance cards
    $('#total-owe').textContent = `₹${Math.abs(balances.totalOwe).toFixed(0)}`;
    $('#total-receive').textContent = `₹${Math.abs(balances.totalReceive).toFixed(0)}`;
    const totalSpending = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    $('#total-spending').textContent = `₹${totalSpending.toFixed(0)}`;

    // Individual balances
    renderIndividualBalances(balances.individual);

    // Expense list
    renderExpenseList(expenses);

    // Spending chart
    renderSpendingChart(expenses, members);

    // Activity feed
    renderActivityFeed(expenses);

  } catch (err) {
    console.error(err);
    showToast('Error', 'Failed to load group details.', 'danger');
  }
}

function renderIndividualBalances(individual) {
  const container = $('#individual-balances');
  if (!individual || individual.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:14px;">No balances yet. Add expenses to see balances.</p>';
    return;
  }
  container.innerHTML = individual.map(b => {
    const isOwe = b.amount < 0;
    const avatarClass = isOwe ? 'owe-avatar' : 'receive-avatar';
    const colorClass = isOwe ? 'text-danger' : 'text-success';
    const label = isOwe
      ? `You owe ${b.name}`
      : `${b.name} owes you`;
    return `
      <div class="balance-item">
        <div class="info">
          <div class="avatar ${avatarClass}">${b.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-size:.875rem;">${label}</div>
          </div>
        </div>
        <span class="amount-label ${colorClass}">₹${Math.abs(b.amount).toFixed(0)}</span>
      </div>
    `;
  }).join('');
}

function renderExpenseList(expenses) {
  const container = $('#expense-list-items');
  if (!expenses || expenses.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">No expenses yet.</p>';
    return;
  }
  const expenseIcons = ['🍔', '🚗', '🏨', '🛒', '🎬', '💡', '📱', '💊', '🎵', '✈️'];
  container.innerHTML = expenses.map((exp, i) => {
    const icon = expenseIcons[i % expenseIcons.length];
    const sym = CURRENCY_SYMBOLS[exp.currency] || '₹';
    const paidByName = getMemberName(exp.paidBy, state.currentGroup.members);
    const dateStr = exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return `
      <div class="expense-item">
        <div class="expense-info">
          <div class="expense-icon">${icon}</div>
          <div>
            <div class="expense-title">${escapeHTML(exp.title)}</div>
            <div class="expense-meta">${dateStr} · ${exp.splitType || 'equal'} split${exp.recurring ? ' · 🔁 Recurring' : ''}</div>
          </div>
        </div>
        <div class="expense-amount">
          <div class="amount">${sym}${Number(exp.amount).toFixed(2)}</div>
          <div class="paid-by">Paid by ${paidByName}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSpendingChart(expenses, members) {
  const chart = $('#spending-chart');
  if (!expenses || expenses.length === 0) {
    chart.innerHTML = '<p class="text-muted" style="text-align:center;padding:14px;">No data yet.</p>';
    return;
  }
  // Aggregate spending per member
  const spending = {};
  members.forEach(m => {
    const name = typeof m === 'string' ? m : m.name;
    spending[name] = 0;
  });
  expenses.forEach(exp => {
    const name = getMemberName(exp.paidBy, members);
    if (spending[name] !== undefined) spending[name] += exp.amount;
    else spending[name] = exp.amount;
  });
  const max = Math.max(...Object.values(spending), 1);

  chart.innerHTML = Object.entries(spending).map(([name, amount]) => {
    const pct = (amount / max) * 100;
    return `
      <div class="chart-bar-group">
        <div class="chart-bar-label">${name} — ₹${amount.toFixed(0)}</div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  // Animate bars
  setTimeout(() => {
    chart.querySelectorAll('.chart-bar-fill').forEach(bar => {
      bar.style.width = bar.style.width; // trigger
    });
  }, 100);
}

function renderActivityFeed(expenses) {
  const feed = $('#activity-feed');
  if (!expenses || expenses.length === 0) {
    feed.innerHTML = '<p class="text-muted" style="text-align:center;padding:14px;">No activity yet.</p>';
    return;
  }
  const recent = expenses.slice(0, 5);
  const colors = ['blue', 'green', 'red', 'blue', 'green'];
  feed.innerHTML = recent.map((exp, i) => {
    const name = getMemberName(exp.paidBy, state.currentGroup.members);
    const timeAgo = exp.date ? timeAgoStr(exp.date) : 'recently';
    return `
      <div class="activity-item">
        <div class="activity-dot ${colors[i % colors.length]}"></div>
        <div>
          <p><strong>${name}</strong> paid ₹${exp.amount.toFixed(0)} for <strong>${escapeHTML(exp.title)}</strong></p>
          <span class="time">${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ═══════════════════════════════════════════
   ADD EXPENSE
   ═══════════════════════════════════════════ */
function initAddExpenseForm() {
  if (!state.currentGroup) return;
  const members = state.currentGroup.members || [];

  // Populate "Paid by" select
  const paidBySelect = $('#expense-paidby-select');
  paidBySelect.innerHTML = members.map(m => {
    const name = typeof m === 'string' ? m : m.name;
    const email = typeof m === 'string' ? m : m.email;
    const selected = email === state.currentUser.email ? 'selected' : '';
    return `<option value="${email}" ${selected}>${name}</option>`;
  }).join('');

  // Set today's date
  $('#expense-date-input').value = new Date().toISOString().split('T')[0];

  // Split type selector
  state.splitType = 'equal';
  $$('.split-type-btn').forEach(btn => btn.classList.remove('active'));
  $('[data-split="equal"]').classList.add('active');
  renderSplitDetails('equal', members);

  // Currency conversion
  $('#expense-currency-select').addEventListener('change', updateCurrencyConversion);
  $('#expense-amount-input').addEventListener('input', updateCurrencyConversion);
}

function updateCurrencyConversion() {
  const currency = $('#expense-currency-select').value;
  const amount = parseFloat($('#expense-amount-input').value) || 0;
  const display = $('#currency-conversion-display');

  if (currency !== 'INR' && amount > 0) {
    const rate = CURRENCY_RATES[currency] || 1;
    const converted = amount * rate;
    $('#converted-amount-text').textContent = `${CURRENCY_SYMBOLS[currency]}${amount.toFixed(2)} ≈ ₹${converted.toFixed(2)} INR`;
    display.classList.remove('hidden');
  } else {
    display.classList.add('hidden');
  }
}

function initSplitTypeSelector() {
  $$('.split-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.split-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.splitType = btn.getAttribute('data-split');
      const members = state.currentGroup ? state.currentGroup.members : [];
      renderSplitDetails(state.splitType, members);
    });
  });
}

function renderSplitDetails(type, members) {
  const container = $('#split-detail');
  const memberNames = members.map(m => typeof m === 'string' ? m : m.name);

  switch (type) {
    case 'equal':
      container.innerHTML = `
        <div style="padding:14px 18px;background:var(--bg-input);border-radius:var(--radius-md);font-size:.875rem;color:var(--text-secondary);">
          ✅ Expense will be split equally among all ${memberNames.length} members.
        </div>
      `;
      break;

    case 'percentage':
      container.innerHTML = memberNames.map(name => `
        <div class="split-member-row">
          <span class="member-name">${name}</span>
          <input type="number" class="form-control split-pct-input" data-member="${name}" placeholder="%" min="0" max="100" value="${(100 / memberNames.length).toFixed(1)}" />
          <span style="font-size:.813rem;color:var(--text-muted);">%</span>
        </div>
      `).join('');
      break;

    case 'share':
      container.innerHTML = memberNames.map(name => `
        <div class="split-member-row">
          <span class="member-name">${name}</span>
          <input type="number" class="form-control split-share-input" data-member="${name}" placeholder="Shares" min="0" value="1" />
          <span style="font-size:.813rem;color:var(--text-muted);">shares</span>
        </div>
      `).join('');
      break;

    case 'itemwise':
      container.innerHTML = `
        <div id="itemwise-items">
          <div class="split-member-row">
            <input type="text" class="form-control itemwise-name" placeholder="Item name" style="flex:2;" />
            <input type="number" class="form-control itemwise-amount" placeholder="Amount" style="flex:1;" min="0" step="0.01" />
            <select class="form-control itemwise-assignee" style="flex:1;">
              ${memberNames.map(n => `<option value="${n}">${n}</option>`).join('')}
            </select>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="btn-add-item" style="margin-top:8px;">+ Add Item</button>
      `;
      $('#btn-add-item').addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'split-member-row';
        row.innerHTML = `
          <input type="text" class="form-control itemwise-name" placeholder="Item name" style="flex:2;" />
          <input type="number" class="form-control itemwise-amount" placeholder="Amount" style="flex:1;" min="0" step="0.01" />
          <select class="form-control itemwise-assignee" style="flex:1;">
            ${memberNames.map(n => `<option value="${n}">${n}</option>`).join('')}
          </select>
        `;
        $('#itemwise-items').appendChild(row);
      });
      break;
  }
}

function initAddExpenseSubmit() {
  $('#add-expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('#expense-title-input').value.trim();
    const amount = parseFloat($('#expense-amount-input').value);
    const currency = $('#expense-currency-select').value;
    const paidBy = $('#expense-paidby-select').value;
    const date = $('#expense-date-input').value;
    const recurring = $('#expense-recurring').checked;

    if (!title || !amount || amount <= 0) {
      showToast('Error', 'Please fill in all required fields.', 'danger');
      return;
    }

    // Gather split details
    let splitDetails = {};
    const members = state.currentGroup.members || [];
    const memberNames = members.map(m => typeof m === 'string' ? m : m.name);

    if (state.splitType === 'equal') {
      const share = amount / memberNames.length;
      memberNames.forEach(n => splitDetails[n] = share);
    } else if (state.splitType === 'percentage') {
      $$('.split-pct-input').forEach(inp => {
        splitDetails[inp.dataset.member] = (parseFloat(inp.value) || 0) / 100 * amount;
      });
    } else if (state.splitType === 'share') {
      const totalShares = Array.from($$('.split-share-input')).reduce((s, inp) => s + (parseFloat(inp.value) || 0), 0);
      $$('.split-share-input').forEach(inp => {
        const shares = parseFloat(inp.value) || 0;
        splitDetails[inp.dataset.member] = (shares / totalShares) * amount;
      });
    } else if (state.splitType === 'itemwise') {
      const items = [];
      $$('#itemwise-items .split-member-row').forEach(row => {
        items.push({
          name: row.querySelector('.itemwise-name').value,
          amount: parseFloat(row.querySelector('.itemwise-amount').value) || 0,
          assignee: row.querySelector('.itemwise-assignee').value
        });
      });
      splitDetails = { items };
    }

    try {
      await DB.addExpense(state.currentGroupId, {
        title, amount, currency, paidBy, date,
        splitType: state.splitType,
        splitDetails,
        recurring
      });
      showToast('Expense Added', `"${title}" has been added.`, 'success');
      $('#add-expense-form').reset();
      navigateTo('group-detail');
      loadGroupDetail(state.currentGroupId);
    } catch (err) {
      showToast('Error', 'Failed to add expense.', 'danger');
      console.error(err);
    }
  });
}

/* ═══════════════════════════════════════════
   BALANCE COMPUTATION
   ═══════════════════════════════════════════ */
function computeUserBalance(expenses, members, userEmail) {
  if (!expenses || expenses.length === 0) return 0;
  let balance = 0;
  const memberNames = members.map(m => typeof m === 'string' ? m : m.name);
  const memberEmails = members.map(m => typeof m === 'string' ? m : m.email);
  const userIdx = memberEmails.indexOf(userEmail);
  const userName = userIdx >= 0 ? memberNames[userIdx] : userEmail;

  expenses.forEach(exp => {
    const n = memberNames.length || 1;
    const share = exp.amount / n;

    if (exp.paidBy === userEmail || exp.paidBy === userName) {
      // User paid: others owe user
      balance += (exp.amount - share);
    } else {
      // User owes share
      balance -= share;
    }
  });
  return balance;
}

function computeAllBalances(expenses, members, userEmail) {
  const memberNames = members.map(m => typeof m === 'string' ? m : m.name);
  const memberEmails = members.map(m => typeof m === 'string' ? m : m.email);
  const userIdx = memberEmails.indexOf(userEmail);
  const userName = userIdx >= 0 ? memberNames[userIdx] : userEmail;

  const balanceMap = {};
  memberNames.forEach(name => { if (name !== userName) balanceMap[name] = 0; });

  expenses.forEach(exp => {
    const n = memberNames.length || 1;
    const share = exp.amount / n;
    const paidByName = getMemberName(exp.paidBy, members);

    if (paidByName === userName) {
      // User paid — each other member owes user their share
      memberNames.forEach(name => {
        if (name !== userName && balanceMap[name] !== undefined) {
          balanceMap[name] += share;
        }
      });
    } else {
      // Someone else paid — user owes them their share
      if (balanceMap[paidByName] !== undefined) {
        balanceMap[paidByName] -= share;
      }
    }
  });

  let totalOwe = 0, totalReceive = 0;
  const individual = [];
  Object.entries(balanceMap).forEach(([name, amount]) => {
    if (amount > 0.01) { totalReceive += amount; }
    else if (amount < -0.01) { totalOwe += Math.abs(amount); }
    if (Math.abs(amount) > 0.01) {
      individual.push({ name, amount });
    }
  });

  return { totalOwe, totalReceive, individual };
}

function getMemberName(emailOrName, members) {
  if (!members) return emailOrName;
  for (const m of members) {
    if (typeof m === 'string') {
      if (m === emailOrName) return m;
    } else {
      if (m.email === emailOrName) return m.name;
      if (m.name === emailOrName) return m.name;
    }
  }
  return emailOrName;
}

/* ═══════════════════════════════════════════
   SPLIT & PAY — SETTLEMENTS
   ═══════════════════════════════════════════ */
function calculateSettlements() {
  if (!state.currentGroup || !state.expenses) return;

  const members = state.currentGroup.members || [];
  const memberNames = members.map(m => typeof m === 'string' ? m : m.name);
  const n = memberNames.length;

  // Net balance per member
  const net = {};
  memberNames.forEach(name => net[name] = 0);

  state.expenses.forEach(exp => {
    const paidBy = getMemberName(exp.paidBy, members);
    const share = exp.amount / n;
    net[paidBy] = (net[paidBy] || 0) + exp.amount;
    memberNames.forEach(name => {
      net[name] = (net[name] || 0) - share;
    });
  });

  // Greedy settlement
  const debtors = [];
  const creditors = [];
  Object.entries(net).forEach(([name, amt]) => {
    if (amt < -0.01) debtors.push({ name, amount: Math.abs(amt) });
    else if (amt > 0.01) creditors.push({ name, amount: amt });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const settle = Math.min(debtors[i].amount, creditors[j].amount);
    transactions.push({
      from: debtors[i].name,
      to: creditors[j].name,
      amount: settle
    });
    debtors[i].amount -= settle;
    creditors[j].amount -= settle;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  // Render
  const container = $('#split-pay-results');
  if (transactions.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">✅ All settled up! No payments needed.</p>';
    return;
  }
  container.innerHTML = transactions.map(t => `
    <div class="transaction-card">
      <div class="transaction-from">
        <div class="avatar">${t.from.charAt(0)}</div>
        <strong>${t.from}</strong>
      </div>
      <span class="transaction-arrow">→</span>
      <div class="transaction-to">
        <div class="avatar">${t.to.charAt(0)}</div>
        <strong>${t.to}</strong>
      </div>
      <span class="transaction-amount">₹${t.amount.toFixed(0)}</span>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════
   MEMBER DASHBOARD
   ═══════════════════════════════════════════ */
async function loadMemberDashboard() {
  if (!state.currentUser) return;
  try {
    const groups = await DB.getGroupsByMemberEmail(state.currentUser.email);
    let totalOwe = 0, totalReceive = 0;
    const allBalances = [];

    for (const group of groups) {
      const expenses = await DB.getExpenses(group.id);
      const balances = computeAllBalances(expenses, group.members, state.currentUser.email);
      totalOwe += balances.totalOwe;
      totalReceive += balances.totalReceive;
      balances.individual.forEach(b => {
        allBalances.push({ ...b, groupName: group.name });
      });
    }

    const netBalance = totalReceive - totalOwe;
    $('#dash-total-owe').textContent = `₹${totalOwe.toFixed(0)}`;
    $('#dash-total-receive').textContent = `₹${totalReceive.toFixed(0)}`;
    $('#dash-net-balance').textContent = `${netBalance >= 0 ? '+' : ''}₹${Math.abs(netBalance).toFixed(0)}`;
    $('#dash-net-balance').className = netBalance >= 0 ? 'value text-success' : 'value text-danger';

    const container = $('#dash-all-balances');
    if (allBalances.length === 0) {
      container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">No balances to show yet.</p>';
    } else {
      container.innerHTML = allBalances.map(b => {
        const isOwe = b.amount < 0;
        return `
          <div class="balance-item">
            <div class="info">
              <div class="avatar ${isOwe ? 'owe-avatar' : 'receive-avatar'}">${b.name.charAt(0)}</div>
              <div>
                <div style="font-size:.875rem;font-weight:600;">${isOwe ? `You owe ${b.name}` : `${b.name} owes you`}</div>
                <div style="font-size:.75rem;color:var(--text-muted);">in ${b.groupName}</div>
              </div>
            </div>
            <span class="amount-label ${isOwe ? 'text-danger' : 'text-success'}">₹${Math.abs(b.amount).toFixed(0)}</span>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

/* ═══════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════ */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function timeAgoStr(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════
   INITIALIZE APP
   ═══════════════════════════════════════════ */
function handleInviteUrl() {
  const params = new URLSearchParams(window.location.search);
  const inviteGroupId = params.get('inviteGroupId');
  const phone = params.get('phone');
  
  if (inviteGroupId) {
    sessionStorage.setItem('pendingInviteGroupId', inviteGroupId);
    if (phone) {
      sessionStorage.setItem('pendingInvitePhone', phone);
    }
    // Remove it from the URL so it doesn't trigger again on reload
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  handleInviteUrl();
  initTheme();
  initHeaderScroll();
  initHamburger();
  initProfileDropdown();
  initModals();
  initAuth();
  initNavigation();
  initContactForm();
  initCreateGroup();
  initSplitTypeSelector();
  initAddExpenseSubmit();
  renderMemberList();

  // Theme toggle
  $('#theme-toggle').addEventListener('click', toggleTheme);

  // Initial page
  navigateTo('landing');
});
