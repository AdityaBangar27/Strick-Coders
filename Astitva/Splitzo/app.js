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
  splitType: 'equal',
  userCache: {}      // Cache for member profile data (with UPI IDs)
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

  // Interactive Game (Learn More)
  $('#btn-learn-more').addEventListener('click', () => {
    openModal('game-modal');
    if (typeof window.initGame === 'function') {
      window.initGame();
    } else {
      // Lazy load game script if not present
      const script = document.createElement('script');
      script.src = 'game.js';
      script.onload = () => { if (window.initGame) window.initGame(); };
      document.body.appendChild(script);
    }
  });
  $('#game-modal-close').addEventListener('click', () => closeModal('game-modal'));

  // Manual Join Group
  $('#join-group-modal-close').addEventListener('click', () => closeModal('join-group-modal'));

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
    const email = user.email || '';
    const displayName = user.displayName || (email ? email.split('@')[0] : 'User');
    const initial = displayName.charAt(0).toUpperCase();

    $('#profile-initial').textContent = initial;
    $('#dropdown-logged-out').classList.add('hidden');
    $('#dropdown-logged-in').classList.remove('hidden');
    $('#dropdown-user-name').textContent = displayName;

    const dashboardUserName = $('#dashboard-user-name');
    if (dashboardUserName) dashboardUserName.textContent = displayName;
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
          state.currentUserData = userData; // Save globally for UPI retrieval
        }
      } catch (err) {
        console.warn("Could not fetch user data (might be missing Firestore rules):", err);
      }
      updateUIForAuth(user);

      // Process pending invites after login
      const pendingGroupId = sessionStorage.getItem('pendingInviteGroupId');
      const pendingPhone = sessionStorage.getItem('pendingInvitePhone');
      if (pendingGroupId) {
        // Defer auto-join to the new confirmation 'Join Group' preview page
        openJoinGroupPage(pendingGroupId, pendingPhone, user);
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

      if (!sessionStorage.getItem('pendingInviteGroupId')) {
        loadMyGroups();
        navigateTo('dashboard');
      }
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
    const phone = $('#register-phone').value.trim();
    const upiId = $('#register-upi').value.trim();
    const password = $('#register-password').value;
    const confirm = $('#register-confirm-password').value;
    if (password !== confirm) {
      showToast('Error', 'Passwords do not match.', 'danger');
      return;
    }
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      await DB.createUser(cred.user.uid, { name, email, phone, upiId });
      closeModal('register-modal');
      showToast('Welcome!', 'Account created successfully.', 'success');

      if (!sessionStorage.getItem('pendingInviteGroupId')) {
        navigateTo('dashboard');
        loadMyGroups();
      }
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
  $('#nav-manage-profile').addEventListener('click', (e) => {
    e.preventDefault();
    $('#profile-dropdown').classList.remove('open');
    navigateTo('profile');
    loadProfile();
  });
  $('#nav-manage-profile').addEventListener('click', (e) => {
    e.preventDefault();
    $('#profile-dropdown').classList.remove('open');
    navigateTo('profile');
    loadProfile();
  });
  $('#nav-join-group').addEventListener('click', (e) => {
    e.preventDefault();
    $('#profile-dropdown').classList.remove('open');
    if (state.currentUser) openModal('join-group-modal');
    else openModal('login-modal');
  });

  // Create group buttons
  $('#btn-open-create-group').addEventListener('click', () => navigateTo('create-group'));
  $('#btn-empty-create-group').addEventListener('click', () => navigateTo('create-group'));

  // Back buttons
  $('#back-from-create-group').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });
  $('#back-from-group-detail').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });
  $('#back-from-add-expense').addEventListener('click', () => { navigateTo('group-detail'); loadGroupDetail(state.currentGroupId); });
  $('#back-from-member-dashboard').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });
  $('#back-from-profile').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });
  $('#btn-cancel-profile').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });
  $('#back-from-profile').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });
  $('#btn-cancel-profile').addEventListener('click', () => { navigateTo('dashboard'); loadMyGroups(); });

  // Group detail actions
  $('#btn-add-expense').addEventListener('click', () => {
    if (!state.currentGroupId) return;
    navigateTo('add-expense');
    initAddExpenseForm();
  });
  $('#btn-split-pay').addEventListener('click', () => {
    calculateSettlements();
    openModal('split-pay-modal');
  });

  // WhatsApp Share / Invite Resend Bonus Feature
  $('#btn-share-group').addEventListener('click', () => {
    if (!state.currentGroup) return;
    const inviteLink = `${window.location.origin}${window.location.pathname}?inviteGroupId=${state.currentGroup.id}`;
    const textMsg = `Hey! You are invited to join '${state.currentGroup.name}' on Splitzo 💸\nClick here to join: ${inviteLink}`;

    // Copy to clipboard first
    navigator.clipboard.writeText(textMsg).then(() => {
      showToast('Link Copied!', 'Invite link copied to clipboard.', 'success');

      // Try native share API for smooth mobile experience
      if (navigator.share) {
        navigator.share({
          title: `Join ${state.currentGroup.name} on Splitzo`,
          text: textMsg
        }).catch(err => console.log('Share canceled'));
      } else {
        // Fallback direct to WhatsApp for desktop
        const waUrl = `https://wa.me/?text=${encodeURIComponent(textMsg)}`;
        window.open(waUrl, '_blank');
      }
    }).catch(err => {
      showToast('Error', 'Failed to copy link.', 'danger');
    });
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
   INTEGRATED JOIN GROUP PREVIEW PAGE
   ═══════════════════════════════════════════ */
async function openJoinGroupPage(groupId, pendingPhone, user) {
  navigateTo('join-group');
  const btnJoin = $('#btn-confirm-join');
  const btnCancel = $('#btn-cancel-join');
  const groupNameEl = $('#join-group-name');
  const membersEl = $('#join-group-members');

  try {
    const group = await DB.getGroup(groupId);
    if (!group) throw new Error("Group does not exist.");

    const memberCount = group.members ? group.members.length : 0;
    const isAlreadyMember = group.members && group.members.find(m => m.email === user.email);

    if (isAlreadyMember) {
      showToast('Already a Member', `You are already part of ${group.name}!`, 'info');
      sessionStorage.removeItem('pendingInviteGroupId');
      sessionStorage.removeItem('pendingInvitePhone');
      openGroup(groupId);
      return;
    }

    groupNameEl.textContent = `${group.name}`;

    // Dynamic Group Avatar
    const joinIconEl = document.querySelector('.join-icon');
    if (joinIconEl) {
      joinIconEl.textContent = group.name.substring(0, 2).toUpperCase();
      joinIconEl.style.background = 'linear-gradient(135deg, var(--primary), var(--secondary))';
      joinIconEl.style.color = '#fff';
      joinIconEl.style.width = '80px';
      joinIconEl.style.height = '80px';
      joinIconEl.style.lineHeight = '80px';
      joinIconEl.style.borderRadius = '50%';
      joinIconEl.style.margin = '0 auto 16px';
      joinIconEl.style.fontSize = '2rem';
      joinIconEl.style.fontWeight = 'bold';
    }

    // Member Preview List
    const memberPreview = group.members ? group.members.map(m => m.name.split(' ')[0]).join(', ') : '';

    membersEl.innerHTML = `This group has <strong>${memberCount} member(s)</strong>.<br>
      <span style="font-size:0.85rem; color:var(--text-light);">(${memberPreview})</span><br><br>
      Created by: <em>${group.createdBy}</em>`;

    btnJoin.textContent = 'Join Group';
    btnJoin.disabled = false;

    // Handle Join
    btnJoin.onclick = async () => {
      btnJoin.textContent = 'Joining...';
      btnJoin.disabled = true;
      try {
        const email = user.email || '';
        const uName = user.displayName || (email ? email.split('@')[0] : 'User');
        await DB.joinGroupFromInvite(groupId, email, uName, pendingPhone);

        // Clean session
        sessionStorage.removeItem('pendingInviteGroupId');
        sessionStorage.removeItem('pendingInvitePhone');
        showToast('You have joined the group successfully 🎉', `You are now a member of ${group.name}.`, 'success');

        // Redirect to group dashboard
        openGroup(groupId);
      } catch (err) {
        console.error(err);
        showToast('Error', 'Failed to join the group. Please try again.', 'danger');
        btnJoin.textContent = 'Join Group';
        btnJoin.disabled = false;
      }
    };

    // Handle Cancel
    btnCancel.onclick = () => {
      sessionStorage.removeItem('pendingInviteGroupId');
      sessionStorage.removeItem('pendingInvitePhone');
      navigateTo('dashboard');
      loadMyGroups();
    };

  } catch (err) {
    groupNameEl.textContent = 'Group Not Found';
    membersEl.textContent = 'The invite link may be invalid or expired. Please contact the group creator.';
    btnJoin.style.display = 'none';
    btnCancel.textContent = 'Go to Dashboard';
    btnCancel.onclick = () => {
      sessionStorage.removeItem('pendingInviteGroupId');
      sessionStorage.removeItem('pendingInvitePhone');
      navigateTo('dashboard');
      loadMyGroups();
    };
  }
}

/* ═══════════════════════════════════════════
   ADD EXPENSE & SPLITTING LOGIC
   ═══════════════════════════════════════════ */
function initCreateGroup() {
  state.members = [];

  $('#btn-add-member').addEventListener('click', () => {
    const name = $('#member-name-input').value.trim();
    const phone = $('#member-phone-input').value.trim();
    const upiId = $('#member-upi-input').value.trim();
    if (!name || !phone) {
      showToast('Missing Info', 'Please enter both name and mobile number.', 'warning');
      return;
    }
    if (state.members.find(m => m.phone === phone)) {
      showToast('Duplicate', 'This member is already added.', 'warning');
      return;
    }
    state.members.push({ name, phone, upiId, status: 'Pending' });
    renderMemberList();
    $('#member-name-input').value = '';
    $('#member-phone-input').value = '';
    $('#member-upi-input').value = '';
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
    if (submitBtn) submitBtn.textContent = 'Creating & Opening WhatsApp...';

    // Include current user as member
    const allMembers = [...state.members];
    if (state.currentUser) {
      const userEmail = state.currentUser.email;
      if (!allMembers.find(m => m.email === userEmail)) {
        const displayName = state.currentUser.displayName || (userEmail ? userEmail.split('@')[0] : 'Owner');
        allMembers.push({
          name: displayName,
          email: userEmail,
          upiId: state.currentUserData ? state.currentUserData.upiId : '',
          status: 'Joined'
        });
      }
    }

    if (allMembers.length < 2) {
      showToast('Need Members', 'Add at least one other member to the group.', 'warning');
      if (submitBtn) submitBtn.textContent = 'Create Group & Send WhatsApp Invites';
      return;
    }

    try {
      const groupId = await DB.createGroup({
        name: groupName,
        members: allMembers,
        createdBy: state.currentUser.email
      });

      const userEmail = state.currentUser.email || '';
      const creatorName = state.currentUser.displayName || (userEmail ? userEmail.split('@')[0] : 'Owner');
      const generalInviteLink = `${window.location.origin}${window.location.pathname}?inviteGroupId=${groupId}`;
      const generalTextMsg = `Hey! You are invited to join '${groupName}' on Splitzo 💸\nClick here to join: ${generalInviteLink}`;

      // Open universal WhatsApp picker right away if no specific numbers were provided
      const externalMembers = state.members.filter(m => m.phone);
      if (externalMembers.length === 0) {
        const fallbackUrl = `https://wa.me/?text=${encodeURIComponent(generalTextMsg)}`;
        setTimeout(() => window.open(fallbackUrl, '_blank'), 500);
      } else {
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
      }

      showToast('Group Created!', `"${groupName}" created. Redirecting to WhatsApp for invites.`, 'success');
      state.members = [];
      $('#create-group-form').reset();
      renderMemberList();
      if (submitBtn) submitBtn.textContent = 'Create Group & Send WhatsApp Invites';
      navigateTo('dashboard');
      loadMyGroups();
    } catch (err) {
      showToast('Error', 'Failed to create group. Try again.', 'danger');
      if (submitBtn) submitBtn.textContent = 'Create Group';
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
    <div class="member-item card" style="animation-delay: ${i * 0.1}s; padding: 12px 16px; margin-bottom: 8px;">
      <div class="member-avatar" style="width: 38px; height: 38px; border-radius: 50%; background: var(--primary-gradient); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 0.875rem;">
        ${m.name.charAt(0).toUpperCase()}
      </div>
      <div class="member-info" style="flex: 1; margin-left: 12px;">
        <strong style="display: block; font-size: 0.938rem;">${m.name}</strong>
        <small style="color: var(--text-muted); font-size: 0.75rem;">📱 ${m.phone} ${m.upiId ? `| 🏦 ${m.upiId}` : ''} <span class="badge badge-warning" style="font-size:0.65rem; margin-left:6px;">Pending</span></small>
      </div>
      <button class="remove-member" type="button" onclick="removeMember(${i})" style="color: var(--text-muted); padding: 4px; font-size: 1.1rem;">✕</button>
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

    // Fetch full profiles for all members to get their UPI IDs
    const profiles = await Promise.all(
      group.members.map(async m => {
        const email = typeof m === 'string' ? m : (m.email || '');
        const nameFallback = typeof m === 'object' ? m.name : (email ? email.split('@')[0] : 'Member');

        try {
          if (email) {
            const profile = await DB.getUserByEmail(email);
            if (profile) {
              state.userCache[email] = profile;
              return profile;
            }
          }
          // Fallback if no profile exists or no email
          const memberObj = typeof m === 'object' ? m : null;
          return {
            email: email,
            name: memberObj ? memberObj.name : nameFallback,
            upiId: memberObj ? (memberObj.upiId || '') : ''
          };
        } catch (e) {
          return { email, name: nameFallback, upiId: '' };
        }
      })
    );

    const userEmail = state.currentUser.email;

    // Calculate balances using profiles (contains UPI IDs)
    const balances = computeAllBalances(expenses, profiles, userEmail);
    state.currentBalances = balances;

    // Update balance cards
    $('#total-owe').textContent = `₹${Math.abs(balances.totalOwe).toFixed(0)}`;
    $('#total-receive').textContent = `₹${Math.abs(balances.totalReceive).toFixed(0)}`;
    const totalSpending = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    animateTextValue('total-spending', parseFloat($('#total-spending').textContent.replace('₹', '')) || 0, totalSpending, '₹');

    // Individual balances
    renderIndividualBalances(balances.individual);

    // Expense list
    renderExpenseList(expenses);

    // Spending chart
    renderSpendingChart(expenses, profiles);

    // Activity feed
    renderActivityFeed(expenses);

  } catch (err) {
    console.error(err);
    showToast('Error', 'Failed to load group details.', 'danger');
  }
}

function renderIndividualBalances(individual) {
  const container = $('#individual-balances');
  if (!container) return;
  if (!individual || individual.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px; font-size:0.875rem;">No active balances in this group.</p>';
    return;
  }
  container.innerHTML = individual.map(b => {
    const isOwe = b.amount < 0;
    const colorClass = isOwe ? 'text-danger' : 'text-success';
    const initials = b.name ? b.name.charAt(0).toUpperCase() : '?';

    return `
      <div class="balance-modern-row">
        <div class="balance-modern-info">
          <div class="balance-modern-avatar" style="background: ${isOwe ? 'var(--danger)' : 'var(--success)'};">
            ${initials}
          </div>
          <div class="balance-modern-text">
            <strong style="display:block; font-size: 0.938rem;">${b.name}</strong>
            <small class="${colorClass}" style="font-size: 0.75rem; font-weight: 600;">
              ${isOwe ? 'You owe' : 'Owes you'} ₹${Math.abs(b.amount).toFixed(0)}
            </small>
          </div>
        </div>
        ${isOwe && b.upiId ? `
          <a href="https://pay.google.com/intl/en_us/about/pay-online/" target="_blank" class="btn btn-accent btn-sm" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center;">
            ⚡ GPay
          </a>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderExpenseList(expenses) {
  const container = $('#expense-list-items');
  if (!container) return;
  if (!expenses || expenses.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">No expenses yet.</p>';
    return;
  }
  const expenseIcons = ['🍔', '🚗', '🏨', '🛒', '🎬', '💡', '📱', '💊', '🎵', '✈️'];

  // Sort reverse chronological
  const sorted = [...expenses].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  container.innerHTML = sorted.map((exp, i) => {
    const icon = expenseIcons[i % expenseIcons.length];
    const sym = CURRENCY_SYMBOLS[exp.currency] || '₹';
    const paidByName = getMemberName(exp.paidBy, state.currentGroup.members);
    const dateStr = exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently';

    return `
      <div class="expense-card-modern" onclick="openExpenseDetail('${exp.id}')">
        <div class="expense-icon-circle">${icon}</div>
        <div class="expense-info-main">
          <strong class="expense-title-main">${escapeHTML(exp.title)}</strong>
          <span class="expense-meta-info">${dateStr} · Paid by ${paidByName}</span>
        </div>
        <div class="expense-amount-side">
          <div class="expense-val-main">${sym}${Number(exp.amount).toFixed(0)}</div>
          <span class="expense-val-sub">${exp.currency || 'INR'}</span>
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
  if (!feed) return;
  if (!expenses || expenses.length === 0) {
    feed.innerHTML = '<p class="text-muted" style="text-align:center;padding:14px;">No activity yet.</p>';
    return;
  }
  const recent = [...expenses].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);

  feed.innerHTML = recent.map((exp, i) => {
    const name = getMemberName(exp.paidBy, state.currentGroup.members);
    const timeAgo = exp.date ? timeAgoStr(exp.date) : 'recently';
    const icon = exp.type === 'settlement' ? '💸' : '📝';

    return `
      <div class="activity-row-modern">
        <div class="activity-icon-modern">${icon}</div>
        <div class="activity-text-modern">
          <p><strong>${name}</strong> added "${escapeHTML(exp.title)}"</p>
          <small>${timeAgo}</small>
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

    case 'custom':
      container.innerHTML = memberNames.map(name => `
        <div class="split-member-row">
          <span class="member-name">${name}</span>
          <input type="number" step="0.01" min="0" class="form-control split-custom-input" data-member="${name}" placeholder="₹0.00" />
          <span style="font-size:.813rem;color:var(--text-muted);">exact</span>
        </div>
      `).join('');
      break;

    case 'shared':
      container.innerHTML = `
        <p class="subtitle" style="font-size:.813rem;color:var(--text-secondary);margin-bottom:10px;">Select people sharing this equally:</p>
        <div class="checkbox-container" style="display:flex; flex-direction:column; gap:8px;">
          ${memberNames.map(name => `
            <label class="checkbox-row" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" class="split-checkbox" value="${name}" checked />
              <span>${name}</span>
            </label>
          `).join('')}
        </div>
      `;
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
      const share = Number((amount / memberNames.length).toFixed(2));
      let sum = 0;
      memberNames.forEach(n => {
        splitDetails[n] = share;
        sum += share;
      });
      // Rounding adjustment
      let diff = amount - sum;
      if (diff !== 0 && memberNames.length > 0) splitDetails[memberNames[0]] += diff;
    } else if (state.splitType === 'percentage') {
      let sumShare = 0;
      $$('.split-pct-input').forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        const share = Number((amount * (val / 100)).toFixed(2));
        splitDetails[inp.dataset.member] = share;
        sumShare += share;
      });
      // Rounding adjustment
      let diff = amount - sumShare;
      if (diff !== 0 && memberNames.length > 0) splitDetails[memberNames[0]] += diff;
    } else if (state.splitType === 'share') {
      const totalShares = Array.from($$('.split-share-input')).reduce((s, inp) => s + (parseFloat(inp.value) || 0), 0);
      let sumShare = 0;
      $$('.split-share-input').forEach(inp => {
        const shares = parseFloat(inp.value) || 0;
        const share = Number(((shares / totalShares) * amount).toFixed(2));
        splitDetails[inp.dataset.member] = share;
        sumShare += share;
      });
      // Rounding adjustment
      let diff = amount - sumShare;
      if (diff !== 0 && memberNames.length > 0) splitDetails[memberNames[0]] += diff;
    } else if (state.splitType === 'custom') {
      let sumCustom = 0;
      $$('.split-custom-input').forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        splitDetails[inp.dataset.member] = val;
        sumCustom += val;
      });
      if (Math.abs(sumCustom - amount) > 0.02) {
        showToast('Error', `Custom amounts must sum to ₹${amount.toFixed(2)}. Current sum: ₹${sumCustom.toFixed(2)}`, 'warning');
        return;
      }
    } else if (state.splitType === 'shared') {
      const checkedMembers = Array.from($$('.split-checkbox:checked')).map(cb => cb.value);
      if (checkedMembers.length === 0) {
        showToast('Error', 'Please select at least one person sharing this.', 'warning');
        return;
      }
      const share = Number((amount / checkedMembers.length).toFixed(2));
      let sum = 0;
      memberNames.forEach(n => {
        if (checkedMembers.includes(n)) {
          splitDetails[n] = share;
          sum += share;
        } else {
          splitDetails[n] = 0;
        }
      });
      // Rounding adjustment
      let diff = amount - sum;
      if (diff !== 0 && checkedMembers.length > 0) splitDetails[checkedMembers[0]] += diff;
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
    const paidBy = exp.paidBy;
    const splitType = exp.splitType || 'equal';
    const details = exp.splitDetails || {};

    // How much did the user owe for this expense?
    let userOwed = 0;
    if (splitType === 'equal') {
      userOwed = exp.amount / memberNames.length;
    } else if (splitType === 'percentage' || splitType === 'share') {
      userOwed = details[userName] || details[userEmail] || 0;
    } else if (splitType === 'itemwise') {
      userOwed = details[userName] || details[userEmail] || 0;
    }

    if (paidBy === userEmail || paidBy === userName) {
      // User paid: they get back (Total - MyShare)
      balance += (exp.amount - userOwed);
    } else {
      // Someone else paid: User owes their share
      balance -= userOwed;
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
    const paidByName = getMemberName(exp.paidBy, members);
    const splitType = exp.splitType || 'equal';
    const details = exp.splitDetails || {};

    if (paidByName === userName) {
      // User paid — others owe user their share
      memberNames.forEach(name => {
        if (name !== userName) {
          let share = 0;
          if (splitType === 'equal') share = exp.amount / memberNames.length;
          else share = details[name] || 0;
          balanceMap[name] += share;
        }
      });
    } else {
      // Someone else paid — user owes them their share
      if (balanceMap[paidByName] !== undefined) {
        let userShare = 0;
        if (splitType === 'equal') userShare = exp.amount / memberNames.length;
        else userShare = details[userName] || details[userEmail] || 0;
        balanceMap[paidByName] -= userShare;
      }
    }
  });

  let totalOwe = 0, totalReceive = 0;
  const individual = [];
  Object.entries(balanceMap).forEach(([name, amount]) => {
    if (amount > 0.01) { totalReceive += amount; }
    else if (amount < -0.01) { totalOwe += Math.abs(amount); }
    if (Math.abs(amount) > 0.01) {
      individual.push({
        name,
        amount: Number(amount.toFixed(2)),
        upiId: getMemberUpi(name, members)
      });
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

function getMemberUpi(emailOrName, members) {
  if (!members) return null;

  // Try to find in state.userCache first for best information
  if (state.userCache && state.userCache[emailOrName]) {
    return state.userCache[emailOrName].upiId || null;
  }

  for (const m of members) {
    if (typeof m === 'string') {
      if (m === emailOrName && state.userCache && state.userCache[m]) {
        return state.userCache[m].upiId || null;
      }
    } else {
      // Check if it's the right person and they have a upiId
      if ((m.email === emailOrName || m.name === emailOrName) && m.upiId) {
        return m.upiId;
      }
    }
  }
  return null;
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
    const splitType = exp.splitType || 'equal';
    const details = exp.splitDetails || {};

    // Credit the person who paid
    net[paidBy] = (net[paidBy] || 0) + exp.amount;

    // Debit each member their share
    memberNames.forEach(name => {
      let share = 0;
      if (splitType === 'equal') {
        share = exp.amount / n;
      } else {
        // Percentage/Share/Itemwise (details maps name to amount)
        share = details[name] || 0;
      }
      net[name] = (net[name] || 0) - share;
    });
  });

  // Rule: Debt Simplification applies BY DEFAULT but we can toggle based on preferences
  // In split.js, it checked if all expenses are 'EQUAL'. 
  // Here we'll implement both and decide.

  const allEqual = state.expenses.every(ex => ex.splitType === 'equal');

  let transactions = [];
  if (allEqual) {
    // Greedy simplification
    transactions = simplifyDebtsGreedy(net, members);
  } else {
    // Pairwise exact debts (Unsimplified)
    transactions = getUnsimplifiedDebts(state.expenses, members);
  }

  // Pass profiles (cached in loadGroupDetail) to ensure UPI ids are available
  const memberProfiles = state.userCache && Object.keys(state.userCache).length > 0
    ? Object.values(state.userCache).filter(u => state.currentGroup.members.includes(u.email))
    : members;

  renderSettlementsUI(transactions, memberProfiles);
}

function simplifyDebtsGreedy(net, members) {
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
      toUpi: getMemberUpi(creditors[j].name, members),
      amount: settle
    });
    debtors[i].amount -= settle;
    creditors[j].amount -= settle;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return transactions;
}

function getUnsimplifiedDebts(expenses, members) {
  const memberNames = members.map(m => typeof m === 'string' ? m : m.name);
  const pairwise = {};
  memberNames.forEach(p => {
    pairwise[p] = {};
    memberNames.forEach(p2 => pairwise[p][p2] = 0);
  });

  expenses.forEach(ex => {
    const payer = getMemberName(ex.paidBy, members);
    const details = ex.splitDetails || {};
    for (const [person, owedAmount] of Object.entries(details)) {
      if (person !== payer && owedAmount > 0) {
        pairwise[person][payer] += owedAmount;
      }
    }
  });

  const transactions = [];
  for (let i = 0; i < memberNames.length; i++) {
    for (let j = i + 1; j < memberNames.length; j++) {
      const p1 = memberNames[i];
      const p2 = memberNames[j];
      const p1OwesP2 = pairwise[p1][p2];
      const p2OwesP1 = pairwise[p2][p1];
      const net = p1OwesP2 - p2OwesP1;
      if (net > 0.01) {
        transactions.push({ from: p1, to: p2, toUpi: getMemberUpi(p2, members), amount: net });
      } else if (net < -0.01) {
        transactions.push({ from: p2, to: p1, toUpi: getMemberUpi(p1, members), amount: Math.abs(net) });
      }
    }
  }
  return transactions;
}

function renderSettlementsUI(transactions, members) {
  const container = $('#split-pay-results');

  // Update modal subtitle based on mode
  const subtitle = $('#split-pay-modal .modal-subtitle');
  const allEqual = state.expenses.every(ex => ex.splitType === 'equal');
  if (subtitle) {
    subtitle.innerHTML = allEqual
      ? "📊 <strong>Debt Simplified:</strong> Optimized to reduce total transactions."
      : "📊 <strong>Exact Balances:</strong> Showing direct pairwise debts (Simplification disabled for non-equal splits).";
  }

  if (transactions.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">✅ All settled up! No payments needed.</p>';
    return;
  }
  container.innerHTML = transactions.map(t => `
    <div class="transaction-card">
      <div class="transaction-from">
        <div class="avatar">${t.from.charAt(0)}</div>
        <strong>${t.from}</strong>
        <small style="color:var(--text-muted); font-size:0.65rem;">Debtor</small>
      </div>
      <span class="transaction-arrow">→</span>
      <div class="transaction-to">
        <div class="avatar" style="background:var(--success);">${t.to.charAt(0)}</div>
        <strong>${t.to}</strong>
        <small style="color:var(--text-muted); font-size:0.65rem;">Creditor</small>
      </div>
      <div class="transaction-actions">
        <span class="transaction-amount">₹${t.amount.toFixed(2)}</span>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary btn-sm btn-gpay" onclick="payViaGPay('${t.toUpi || ''}', '${t.to}', ${t.amount})" title="Instant Payment" 
                  style="background:#1a73e8; color:#fff; font-weight:700; border-radius:var(--radius-full);">
            GPay ⚡
          </button>
          <button class="btn btn-success btn-sm" onclick="markAsPaid(this, '${t.from}', '${t.to}', ${t.amount})" title="Settle debt">
            ✓ Settle
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

window.payViaGPay = function (upiId, receiverName, amount) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (!upiId || upiId.trim() === '') {
    showToast('Missing UPI', `Please ask ${receiverName} to add their UPI ID to their profile to enable GPay!`, 'warning');
    return;
  }

  if (!isMobile) {
    showToast('Mobile Only', 'UPI redirects work best on mobile devices with Google Pay installed.', 'info');
    return;
  }

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(receiverName)}&am=${amount.toFixed(2)}&cu=INR`;
  window.location.href = upiLink;
};

window.markAsPaid = async function (btn, fromName, toName, amount) {
  if (!state.currentGroupId) return;
  if (!confirm(`Mark ₹${amount.toFixed(0)} as paid from ${fromName} to ${toName}?`)) return;

  if (btn) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    await DB.addExpense(state.currentGroupId, {
      title: `Settlement: ${fromName} paid ${toName}`,
      amount: amount,
      currency: 'INR',
      paidBy: fromName,
      date: today,
      splitType: 'itemwise',
      splitDetails: { [toName]: amount },
      recurring: false
    });

    showToast('Settlement Recorded', `₹${amount.toFixed(0)} paid to ${toName}.`, 'success');
    closeModal('split-pay-modal');
    // Refresh group data to show new balances
    openGroup(state.currentGroupId);
  } catch (err) {
    console.error(err);
    showToast('Error', 'Failed to mark as paid.', 'danger');
    if (btn) {
      btn.innerHTML = btn.dataset.originalText || 'Settle';
      btn.disabled = false;
    }
  }
};

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
          <div class="balance-item premium-item" style="padding:14px 18px; margin-bottom:12px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div class="info" style="display:flex; align-items:center; gap:12px; flex:1; min-width:160px;">
              <div class="avatar ${isOwe ? 'owe-avatar' : 'receive-avatar'}" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${isOwe ? 'var(--danger)' : 'var(--success)'};color:#fff;font-weight:700;font-size:0.8rem;">
                ${b.name.charAt(0)}
              </div>
              <div>
                <div style="font-size:.875rem;font-weight:700;">${isOwe ? `You owe ${b.name}` : `${b.name} owes you`}</div>
                <div style="font-size:.70rem;color:var(--text-muted);">in ${b.groupName}</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="amount-label ${isOwe ? 'text-danger' : 'text-success'}" style="font-weight:800;font-size:1rem;">₹${Math.abs(b.amount).toFixed(2)}</span>
              ${isOwe && b.upiId ? `
                <button class="btn btn-primary btn-sm" onclick="payViaGPay('${b.upiId}', '${b.name}', ${Math.abs(b.amount)})" title="Click to Pay via UPI" 
                        style="background:#1a73e8; border-color:#1a73e8; color:#fff; font-size:0.75rem; padding:6px 12px;">
                  Pay
                </button>
              ` : ''}
            </div>
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

function animateTextValue(id, start, end, prefix = '') {
  const obj = document.getElementById(id);
  if (!obj) return;
  const range = end - start;
  if (range === 0) { obj.innerHTML = prefix + end.toFixed(0); return; }
  let startTime = null;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / 1000, 1);
    const current = (progress * range + start);
    obj.innerHTML = prefix + current.toFixed(0);
    if (progress < 1) window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
}

/* ── Ripple Effect ─────────────────────────── */
function createRipple(event, button) {
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

/* ═══════════════════════════════════════════
   INITIALIZE APP
   ═══════════════════════════════════════════ */
function handleInviteUrl() {
  const params = new URLSearchParams(window.location.search);
  const inviteGroupId = params.get('inviteGroupId') || params.get('groupId');
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

function initManualJoin() {
  $('#manual-join-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const groupId = $('#manual-group-id').value.trim();
    if (!groupId) return;

    if (!state.currentUser) {
      showToast('Login Required', 'You must be logged in to join a group.', 'warning');
      closeModal('join-group-modal');
      openModal('login-modal');
      return;
    }

    const btn = $('#manual-join-form').querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Joining...';
    btn.disabled = true;

    try {
      const userUpi = state.currentUserData ? state.currentUserData.upiId : '';
      const uName = state.currentUser.displayName || state.currentUser.email.split('@')[0];

      const groupInfo = await DB.manualJoinGroup(groupId, state.currentUser.email, uName, userUpi);

      showToast('Joined group successfully 🎉', `You are now a member of ${groupInfo.name}.`, 'success');
      closeModal('join-group-modal');
      $('#manual-join-form').reset();

      // Navigate to the new group dashboard
      openGroup(groupInfo.id);
    } catch (err) {
      console.error(err);
      showToast('Error', err.message || 'Failed to join group.', 'danger');
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Bonus: Group ID preview on input (de-bounced)
  let previewTimeout;
  $('#manual-group-id').addEventListener('input', (e) => {
    clearTimeout(previewTimeout);
    const val = e.target.value.trim();
    const preview = $('#join-preview');

    if (val.length < 5) {
      preview.classList.add('hidden');
      return;
    }

    previewTimeout = setTimeout(async () => {
      try {
        const group = await DB.getGroup(val);
        if (group) {
          $('#preview-group-name').textContent = group.name;
          $('#preview-group-meta').textContent = `👥 ${group.members ? group.members.length : 0} members • Created by ${group.createdBy}`;
          preview.classList.remove('hidden');
        } else {
          preview.classList.add('hidden');
        }
      } catch (err) {
        preview.classList.add('hidden');
      }
    }, 500);
  });
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
  initManualJoin();
  initProfileUpdate();
  renderMemberList();

  // Theme toggle
  $('#theme-toggle').addEventListener('click', toggleTheme);

  // Ripple effect global
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (btn) createRipple(e, btn);
  });

  // Initial page
  navigateTo('landing');
});

/* ═══════════════════════════════════════════
   MANAGE PROFILE LOGIC
   ═══════════════════════════════════════════ */
async function loadProfile() {
  if (!state.currentUser) return;
  const user = state.currentUser;

  // Try to refresh user data from DB
  try {
    const freshData = await DB.getUser(user.uid);
    if (freshData) state.currentUserData = freshData;
  } catch (err) { }

  const data = state.currentUserData || {};

  $('#profile-email-display').textContent = user.email;
  $('#profile-name-input').value = data.name || user.displayName || '';
  $('#profile-phone-input').value = data.phone || '';
  $('#profile-upi-input').value = data.upiId || '';

  const displayNameForInitial = data.name || user.displayName || user.email;
  const initial = (displayNameForInitial || 'User').charAt(0).toUpperCase();
  const profileInitialLarge = $('#profile-initial-large');
  if (profileInitialLarge) profileInitialLarge.textContent = initial;
}

function initProfileUpdate() {
  const form = $('#profile-update-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.currentUser) return;

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    const name = $('#profile-name-input').value.trim();
    const phone = $('#profile-phone-input').value.trim();
    const upiId = $('#profile-upi-input').value.trim();

    try {
      await DB.updateUser(state.currentUser.uid, { name, phone, upiId });

      // Update local state
      state.currentUserData = { ...state.currentUserData, name, phone, upiId };

      // Also update Firebase Auth profile display name
      if (name !== state.currentUser.displayName) {
        await state.currentUser.updateProfile({ displayName: name });
      }

      showToast('Profile Updated', 'Your changes have been saved successfully.', 'success');
      updateUIForAuth(state.currentUser);

      setTimeout(() => {
        navigateTo('dashboard');
        loadMyGroups();
      }, 1000);

    } catch (err) {
      console.error(err);
      showToast('Error', 'Failed to update profile. Please try again.', 'danger');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
}
