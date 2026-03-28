/**
 * Expense Split Module Logic
 * Vanilla JavaScript implementation for managing participants,
 * expenses, different split calculations, and debt simplification.
 */

// --- STATE ---
let participants = []; // Array of strings (names)
let participantUpis = {}; // Map of name to UPI ID strings
let expenses = []; // Array of expense objects
let isDarkMode = false;

// --- DOM ELEMENTS ---
const themeToggle = document.getElementById('themeToggle');
const shareModule = document.getElementById('shareModule');
const addParticipantForm = document.getElementById('addParticipantForm');
const participantNameInput = document.getElementById('participantName');
const participantUpiInput = document.getElementById('participantUpi');
const participantsList = document.getElementById('participantsList');

const addExpenseForm = document.getElementById('addExpenseForm');
const expenseDesc = document.getElementById('expenseDesc');
const expenseAmount = document.getElementById('expenseAmount');
const expensePaidBy = document.getElementById('expensePaidBy');
const expenseSplitMethod = document.getElementById('expenseSplitMethod');
const dynamicSplitParams = document.getElementById('dynamicSplitParams');
const addExpenseBtn = document.getElementById('addExpenseBtn');

const expensesListContainer = document.getElementById('expensesList');
const settlementsListContainer = document.getElementById('settlementsList');
const grandTotalLabel = document.getElementById('grandTotalLabel');
const dashboardTitle = document.getElementById('dashboardTitle');
const dashboardSubtitle = document.getElementById('dashboardSubtitle');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  renderParticipants();
  checkExpenseFormReadiness();
});

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Theme
  themeToggle.addEventListener('click', toggleTheme);
  
  // Share
  if (shareModule) shareModule.addEventListener('click', handleShareModule);

  // Forms
  addParticipantForm.addEventListener('submit', handleAddParticipant);
  addExpenseForm.addEventListener('submit', handleAddExpense);
  
  // Dynamic Split UI updates
  expenseSplitMethod.addEventListener('change', renderDynamicSplitUI);
  
  // Ripple effect on all buttons globally
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn')) {
      createRipple(e, e.target);
    }
  });
}

// --- THEME & UI EFFECTS ---
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    isDarkMode = true;
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
  }
}

function toggleTheme() {
  isDarkMode = !isDarkMode;
  if (isDarkMode) {
    document.body.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.removeAttribute('data-theme');
    themeToggle.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
}

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

// --- PARTICIPANT LOGIC ---
function handleAddParticipant(e) {
  e.preventDefault();
  const name = participantNameInput.value.trim();
  const upi = participantUpiInput.value.trim();
  
  if (!name) return;
  if (participants.includes(name)) {
    alert("Participant already exists!");
    return;
  }
  
  participants.push(name);
  if (upi) participantUpis[name] = upi;
  
  participantNameInput.value = '';
  if (participantUpiInput) participantUpiInput.value = '';
  
  renderParticipants();
  updatePaidByDropdown();
  renderDynamicSplitUI(); // Update UI in case a method relies on participants list
  checkExpenseFormReadiness();
}

function removeParticipant(name) {
  // Check if participant is part of existing expenses
  const isUsed = expenses.some(ex => ex.paidBy === name || name in ex.splits);
  if (isUsed) {
    alert("Cannot remove a participant involved in an expense. Remove the expense first.");
    return;
  }
  
  participants = participants.filter(p => p !== name);
  delete participantUpis[name];
  renderParticipants();
  updatePaidByDropdown();
  renderDynamicSplitUI();
  checkExpenseFormReadiness();
}

function renderParticipants() {
  if (participants.length === 0) {
    participantsList.innerHTML = '<span class="text-secondary subtitle">No participants added yet.</span>';
    return;
  }
  
  participantsList.innerHTML = participants.map(name => `
    <div class="chip">
      ${name}
      <button type="button" onclick="removeParticipant('${name}')">✕</button>
    </div>
  `).join('');
}

function updatePaidByDropdown() {
  const currentSelection = expensePaidBy.value;
  expensePaidBy.innerHTML = '<option value="" disabled selected>Select...</option>' + 
    participants.map(name => `<option value="${name}">${name}</option>`).join('');
    
  // Restore selection if still valid
  if (participants.includes(currentSelection)) {
    expensePaidBy.value = currentSelection;
  }
}

function checkExpenseFormReadiness() {
  // At least 2 participants needed to split expenses
  addExpenseBtn.disabled = participants.length < 2;
}

// --- EXPENSE SPLIT DYNAMIC UI ---
function renderDynamicSplitUI() {
  const method = expenseSplitMethod.value;
  dynamicSplitParams.innerHTML = ''; // clear previous
  
  if (participants.length === 0) return;
  
  if (method === 'EQUAL') {
    dynamicSplitParams.innerHTML = '<p class="subtitle text-secondary">Expense will be split equally among all participants.</p>';
  } 
  else if (method === 'PERCENTAGE') {
    let html = '<p class="subtitle">Enter percentage for each participant (Must sum to 100)</p>';
    participants.forEach(p => {
      html += `
        <div class="dynamic-row">
          <label>${p}</label>
          <input type="number" step="0.1" min="0" max="100" class="split-input-pct" data-name="${p}" placeholder="0%" required>
        </div>
      `;
    });
    dynamicSplitParams.innerHTML = html;
  } 
  else if (method === 'CUSTOM') {
    let html = '<p class="subtitle">Enter exact amount for each participant (Must sum to Total Amount)</p>';
    participants.forEach(p => {
      html += `
        <div class="dynamic-row">
          <label>${p}</label>
          <input type="number" step="0.01" min="0" class="split-input-amt" data-name="${p}" placeholder="₹0.00" required>
        </div>
      `;
    });
    dynamicSplitParams.innerHTML = html;
} 
  else if (method === 'SHARED') {
    let html = '<p class="subtitle">Select who shares this expense equally</p>';
    participants.forEach(p => {
      html += `
        <div class="checkbox-row mt-10">
          <input type="checkbox" class="split-checkbox" value="${p}" checked>
          <label>${p}</label>
        </div>
      `;
    });
    dynamicSplitParams.innerHTML = html;
  }
}

// --- EXPENSE PROCESSING ---
function handleAddExpense(e) {
  e.preventDefault();
  
  const desc = expenseDesc.value.trim();
  const amount = parseFloat(expenseAmount.value);
  const paidBy = expensePaidBy.value;
  const method = expenseSplitMethod.value;
  
  if (!desc || isNaN(amount) || amount <= 0 || !paidBy) {
    alert("Please fill all basic expense details correctly.");
    return;
  }

  // Calculate generic splits mapped { "Alice": 50, "Bob": 50 }
  const splits = calculateSplits(method, amount);
  if (!splits) return; // Validation failed
  
  const expense = {
    id: Date.now().toString(),
    desc,
    amount,
    paidBy,
    method,
    splits
  };
  
  expenses.push(expense);
  
  // Reset Form Defaults
  expenseDesc.value = '';
  expenseAmount.value = '';
  expenseSplitMethod.value = 'EQUAL';
  renderDynamicSplitUI();
  
  updateDashboard();
}

function removeExpense(id) {
  expenses = expenses.filter(ex => ex.id !== id);
  updateDashboard();
}

function calculateSplits(method, totalAmount) {
  let splits = {};
  
  if (method === 'EQUAL') {
    const share = Number((totalAmount / participants.length).toFixed(2));
    // Handle small rounding errors (e.g., 100 / 3) by giving remainder to the first person
    let sum = 0;
    participants.forEach((p, i) => {
      splits[p] = share;
      sum += share;
    });
    let diff = totalAmount - sum;
    if (diff !== 0) splits[participants[0]] += diff;
  } 
  else if (method === 'PERCENTAGE') {
    const inputs = document.querySelectorAll('.split-input-pct');
    let totalPct = 0;
    let sumShare = 0;
    
    inputs.forEach(input => {
      const val = parseFloat(input.value) || 0;
      totalPct += val;
      const share = Number((totalAmount * (val / 100)).toFixed(2));
      splits[input.dataset.name] = share;
      sumShare += share;
    });
    
    // JS math precision edge cases
    if (Math.abs(totalPct - 100) > 0.1) {
      alert("Percentages must sum to exactly 100%. Currently: " + totalPct + "%");
      return null;
    }
    
    // Rounding adjustment
    let diff = totalAmount - sumShare;
    if (diff !== 0 && participants.length > 0) splits[participants[0]] += diff;
  } 
  else if (method === 'CUSTOM') {
    const inputs = document.querySelectorAll('.split-input-amt');
    let sumAmt = 0;
    
    inputs.forEach(input => {
      const val = parseFloat(input.value) || 0;
      splits[input.dataset.name] = val;
      sumAmt += val;
    });
    
    // JS floating point drift check
    if (Math.abs(sumAmt - totalAmount) > 0.02) {
      alert(`Exact amounts must sum to ${totalAmount}. Currently: ${sumAmt.toFixed(2)}`);
      return null;
    }
  } 
  else if (method === 'SHARED') {
    const checkboxes = document.querySelectorAll('.split-checkbox:checked');
    if (checkboxes.length === 0) {
      alert("At least one person must be selected for a shared expense.");
      return null;
    }
    
    const count = checkboxes.length;
    const share = Number((totalAmount / count).toFixed(2));
    let sum = 0;
    
    checkboxes.forEach((cb) => {
      const name = cb.value;
      splits[name] = share;
      sum += share;
    });
    
    // Distribute remaining cents to the first checked person
    let diff = totalAmount - sum;
    if (diff !== 0) splits[checkboxes[0].value] += diff;
    
    // Assign 0 to unchecked participants
    participants.forEach(p => {
      if (!(p in splits)) splits[p] = 0;
    });
  }
  
  return splits;
}

// --- DASHBOARD & CALCULATIONS ---
// Core function controlling when and how debts are calculated and displayed
function updateDashboard() {
  renderExpensesList();
  
  // If no expenses exist, reset dashboard display
  if (expenses.length === 0) {
    if (dashboardTitle) dashboardTitle.innerText = "📊 Settlements Dashboard";
    if (dashboardSubtitle) dashboardSubtitle.innerText = "Add expenses to see settlements.";
    renderSettlements([]);
    const newTotal = 0;
    animateValue("grandTotalLabel", parseFloat(grandTotalLabel.innerText) || 0, newTotal, 1000);
    return;
  }
  
  // Rule: Debt Simplification applies ONLY if ALL expenses are Equal Split
  // We check the method property of every expense tracked
  const allEqual = expenses.every(ex => ex.method === 'EQUAL');
  
  let settlements = [];
  if (allEqual) {
    // Simplification ON: Use the greedy simplification algorithm
    if (dashboardTitle) dashboardTitle.innerText = "📊 Debt Simplified Transactions";
    if (dashboardSubtitle) dashboardSubtitle.innerText = "Optimized to reduce total transactions.";
    
    // 1. First calculate net balances (who is up/down globally)
    const balances = calculateBalances();
    // 2. Simplify using greedy approach (matches biggest debtor with biggest creditor)
    settlements = simplifyDebts(balances);
  } else {
    // Simplification OFF: Complex splits exist, so we cannot simplify accurately
    // without potentially forcing people to pay people they do not normally share expenses with.
    if (dashboardTitle) dashboardTitle.innerText = "📊 Exact Balances";
    if (dashboardSubtitle) dashboardSubtitle.innerText = "Showing pairwise exact debts without simplification.";
    
    // Get unsimplified debts (pairwise exact mappings A -> B, A -> C)
    settlements = getUnsimplifiedDebts();
  }
  
  // Render the final computed settlements
  renderSettlements(settlements);
  
  // Total Counter Animation
  const newTotal = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  animateValue("grandTotalLabel", parseFloat(grandTotalLabel.innerText) || 0, newTotal, 1000);
}

function calculateBalances() {
  const balances = {};
  participants.forEach(p => balances[p] = 0);
  
  expenses.forEach(ex => {
    // Payer gets money back (+)
    if (balances[ex.paidBy] !== undefined) {
      balances[ex.paidBy] += ex.amount;
    }
    
    // Everyone involved owes money (-)
    for (const [person, owedAmount] of Object.entries(ex.splits)) {
      if (balances[person] !== undefined) {
        balances[person] -= owedAmount;
      }
    }
  });
  
  // Clean up floating point errors
  for (const person in balances) {
    balances[person] = Number(balances[person].toFixed(2));
  }
  
  return balances;
}

/**
 * Greedy algorithm to simplify debts
 * Matches biggest debtor with biggest creditor.
 */
function simplifyDebts(balances) {
  const debtors = [];
  const creditors = [];
  
  for (const [person, amount] of Object.entries(balances)) {
    if (amount < -0.01) debtors.push({ name: person, amount: Math.abs(amount) });
    else if (amount > 0.01) creditors.push({ name: person, amount: amount });
  }
  
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  const settlements = [];
  
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    settlements.push({
      from: debtor.name,
      to: creditor.name,
      amount: Number(amount.toFixed(2))
    });
    
    debtor.amount -= amount;
    creditor.amount -= amount;
    
    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }
  
  return settlements;
}

/**
 * Calculates exact pairwise debts without simplifying across the whole group.
 * Useful when Custom/Percentage splits are present, maintaining direct transaction chains.
 */
function getUnsimplifiedDebts() {
  // Initialize pairwise ledger for everyone to everyone else
  const pairwise = {};
  participants.forEach(p => {
    pairwise[p] = {};
    participants.forEach(p2 => pairwise[p][p2] = 0);
  });

  // Calculate raw pairwise debts
  expenses.forEach(ex => {
    const payer = ex.paidBy;
    for (const [person, owedAmount] of Object.entries(ex.splits)) {
      if (person !== payer && owedAmount > 0) {
        pairwise[person][payer] += owedAmount;
      }
    }
  });

  // Collapse two-way debts between same pair (e.g. A owes B 10, B owes A 5 -> A owes B 5)
  const settlements = [];
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const p1 = participants[i];
      const p2 = participants[j];
      
      const p1OwesP2 = pairwise[p1][p2];
      const p2OwesP1 = pairwise[p2][p1];
      
      const net = p1OwesP2 - p2OwesP1;
      
      // Push positive net balances as final settlement requirements
      if (net > 0.01) {
        settlements.push({ from: p1, to: p2, amount: Number(net.toFixed(2)) });
      } else if (net < -0.01) {
        settlements.push({ from: p2, to: p1, amount: Number(Math.abs(net).toFixed(2)) });
      }
    }
  }
  return settlements;
}

// --- RENDERING ---
function renderExpensesList() {
  if (expenses.length === 0) {
    expensesListContainer.innerHTML = '<div class="empty-state">No expenses tracked yet.</div>';
    return;
  }
  
  expensesListContainer.innerHTML = expenses.slice().reverse().map(ex => `
    <div class="list-item">
      <div class="item-left">
        <span class="item-title">${ex.desc}</span>
        <span class="item-sub">Paid by <strong>${ex.paidBy}</strong> • Split: ${ex.method}</span>
      </div>
      <div class="item-right">
        <div class="item-amount">₹${ex.amount.toFixed(2)}</div>
        <button class="btn btn-small btn-danger mt-10" onclick="removeExpense('${ex.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function renderSettlements(settlements) {
  if (settlements.length === 0) {
    settlementsListContainer.innerHTML = `
      <div class="empty-state">
        ${participants.length < 2 ? "Add at least 2 participants to start splitting." : "All settled up! No one owes anything."}
      </div>
    `;
    return;
  }
  
  let html = '';
  settlements.forEach((settlement, index) => {
    // Unique ID for the debt item
    const debtId = `debt-${index}`;
    
    // Check if the receiver has a setup UPI ID
    const upiId = participantUpis[settlement.to];
    let payButtonHtml = '';
    
    if (upiId) {
      // Create UPI URI scheme
      // format: upi://pay?pa=<UPI_ID>&pn=<NAME>&am=<AMOUNT>&cu=INR
      const encodedName = encodeURIComponent(settlement.to);
      const upiLink = `upi://pay?pa=${upiId}&pn=${encodedName}&am=${settlement.amount.toFixed(2)}&cu=INR`;
      
      payButtonHtml = `<a href="${upiLink}" class="btn btn-small mt-10" title="Click to Pay via UPI">Pay &nearr;</a>`;
    }
    
    html += `
      <div class="list-item" id="${debtId}">
        <div class="item-left">
          <span class="item-title"><strong>${settlement.from}</strong> owes <strong>${settlement.to}</strong></span>
        </div>
        <div class="item-right">
          <div class="item-amount" style="color: var(--danger);">₹${settlement.amount.toFixed(2)}</div>
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
            ${payButtonHtml}
            <button class="btn btn-small btn-success mt-10" onclick="markSettled('${debtId}')">Mark Settled</button>
          </div>
        </div>
      </div>
    `;
  });
  
  settlementsListContainer.innerHTML = html;
}

// Optional Feature: Visually mark a debt as settled
function markSettled(debtId) {
  const el = document.getElementById(debtId);
  if (el) {
    el.style.opacity = '0.5';
    el.innerHTML = '<div style="text-align:center; width: 100%; color: var(--success); font-weight: bold;">✅ Settled Off-Platform</div>';
    setTimeout(() => {
        el.style.display = 'none';
    }, 2000);
  }
}

// --- UTILS ---
function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;
  const range = end - start;
  // if no change
  if (range === 0) {
    obj.innerHTML = end.toFixed(2);
    return;
  }
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const current = (progress * range + start).toFixed(2);
    obj.innerHTML = current;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }
  window.requestAnimationFrame(step);
}

// --- SHARE MODULE ---
function handleShareModule() {
  const currentUrl = window.location.origin + window.location.pathname;
  const textMsg = `Hey! Check out this Expense Split Master 💸\nManage group bills and settle debts easily.\n${currentUrl}`;
  
  // Try native share API for smooth mobile experience
  if (navigator.share) {
    navigator.share({
      title: `Split Master - Expense Manager`,
      text: textMsg
    }).catch(err => console.log('Share canceled'));
  } else {
    // Copy to clipboard fallback
    navigator.clipboard.writeText(textMsg).then(() => {
      alert('Invite link copied to clipboard!');
      // Fallback direct to WhatsApp for desktop
      const waUrl = `https://wa.me/?text=${encodeURIComponent(textMsg)}`;
      window.open(waUrl, '_blank');
    }).catch(err => {
      alert('Failed to copy link.');
    });
  }
}
