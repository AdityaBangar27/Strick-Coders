/**
 * Split the Bill - Tetris Challenge
 * Game Engine mapping 2D block arrays onto CSS transforms
 */

// --- CONFIG ---
const BOARD_W = 320;
const BOARD_H = 440;
const COL_W = 80; // 4 columns
const NUM_COLS = 4;

const TARGET_AMOUNT = 300;
const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
const PLAYERS = ["Alice", "Bob", "Charlie", "David"];

// Defines exactly 1200 worth of blocks
const LEVEL_BLOCKS = [
    150, 150, 200, 100, 300, 100, 200
];

// --- GAME STATE ---
let blocksQueue = [];
let landedBlocks = [[], [], [], []]; // Array of landed blocks per column
let playerTotals = [0, 0, 0, 0];
let activeBlock = null;

let isPlaying = false;
let animationId = null;
let fallSpeed = 2; // base speed
let isDropping = false;

// --- DOM ELEMENTS ---
const boardContainer = document.getElementById('blocks-container');
const avatarsContainer = document.getElementById('avatars-container');
const statsBlocksLeft = document.getElementById('blocks-left');
const btnStart = document.getElementById('btn-start');
const msgBox = document.getElementById('game-message');

const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnDrop = document.getElementById('btn-drop');

// --- INIT ---
function initGame() {
    if (window.__splitzoGameInitialized) return;
    window.__splitzoGameInitialized = true;
    setupInputs();
    renderAvatars();
}
window.initGame = initGame;

document.addEventListener('DOMContentLoaded', initGame);

btnStart.addEventListener('click', startGame);

function setupInputs() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (!isPlaying || !activeBlock) return;

        if (e.key === 'ArrowLeft') moveBlock(-1);
        else if (e.key === 'ArrowRight') moveBlock(1);
        else if (e.key === 'ArrowDown') isDropping = true;
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowDown') isDropping = false;
    });

    // Mobile
    btnLeft.addEventListener('click', () => moveBlock(-1));
    btnRight.addEventListener('click', () => moveBlock(1));

    btnDrop.addEventListener('touchstart', (e) => { e.preventDefault(); isDropping = true; });
    btnDrop.addEventListener('touchend', (e) => { e.preventDefault(); isDropping = false; });
    btnDrop.addEventListener('mousedown', () => isDropping = true);
    btnDrop.addEventListener('mouseup', () => isDropping = false);
}

// --- CORE GAME LOOP ---

function startGame() {
    // Reset Everything
    blocksQueue = [...LEVEL_BLOCKS].reverse(); // reverse so we can pop()
    landedBlocks = [[], [], [], []];
    playerTotals = [0, 0, 0, 0];
    isDropping = false;
    isPlaying = true;
    activeBlock = null;

    boardContainer.innerHTML = '';
    msgBox.style.display = 'none';
    msgBox.className = 'message-card mt-10 shadow-sm';
    btnStart.innerText = "Restart Game";
    btnStart.blur(); // Remove focus so space/enter doesn't click it

    updateDashboard();
    renderAvatars();

    if (animationId) cancelAnimationFrame(animationId);

    spawnNextBlock();
    lastTime = performance.now();
    animationId = requestAnimationFrame(gameLoop);
}

let lastTime = 0;
function gameLoop(timestamp) {
    if (!isPlaying) return;

    // Delta Time for smooth falling across devices
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    if (activeBlock) {
        const currentFallSpeed = isDropping ? fallSpeed * 8 : fallSpeed;
        // Normalized by 16ms framing
        activeBlock.y += currentFallSpeed * (dt / 16);

        // Check Collision (landing)
        // Find the current stack height of the column the block is in
        const col = activeBlock.col;
        let stackHeight = 0;
        landedBlocks[col].forEach(b => { stackHeight += b.h; });
        const floorY = BOARD_H - stackHeight;

        if (activeBlock.y + activeBlock.h >= floorY) {
            // Landed
            activeBlock.y = floorY - activeBlock.h;
            landBlock();
        }
    }

    renderFrame();

    if (isPlaying) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

function spawnNextBlock() {
    if (blocksQueue.length === 0) {
        checkWinCondition();
        return;
    }

    const val = blocksQueue.pop();
    const height = Math.max(40, (val / 100) * 20 + 20); // Scale height relative to amount

    activeBlock = {
        id: Date.now(),
        amount: val,
        col: 1, // Start middle-left
        y: -height,
        w: COL_W,
        h: height,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };

    // Create DOM
    const el = document.createElement('div');
    el.className = 'expense-block';
    el.id = `block-${activeBlock.id}`;
    el.innerText = `₹${val}`;
    el.style.backgroundColor = activeBlock.color;
    el.style.width = `${activeBlock.w}px`;
    el.style.height = `${activeBlock.h}px`;
    el.style.left = `${activeBlock.col * COL_W}px`;
    el.style.top = `${activeBlock.y}px`;

    boardContainer.appendChild(el);
    updateDashboard();
}

function moveBlock(dir) {
    if (!activeBlock) return;
    const newCol = activeBlock.col + dir;
    if (newCol >= 0 && newCol < NUM_COLS) {
        // Check if moving sideways would clip into a stack that is too high
        let stackHeightRow = 0;
        landedBlocks[newCol].forEach(b => stackHeightRow += b.h);
        const wallY = BOARD_H - stackHeightRow;

        // If the block is physically lower than the top of the adjacent tower, block the move!
        if (activeBlock.y + activeBlock.h > wallY) {
            return; // Cannot pass through stacks of blocks
        }

        activeBlock.col = newCol;
    }
}

function landBlock() {
    const col = activeBlock.col;
    const amount = activeBlock.amount;

    // Push state
    landedBlocks[col].push({ ...activeBlock });
    playerTotals[col] += amount;

    // Sync DOM perfectly to grid
    const domEl = document.getElementById(`block-${activeBlock.id}`);
    domEl.style.top = `${activeBlock.y}px`;
    domEl.style.left = `${activeBlock.col * COL_W}px`;

    activeBlock = null;
    isDropping = false;

    renderAvatars();

    // Check Loss State (went over)
    if (playerTotals[col] > TARGET_AMOUNT) {
        triggerLoss(PLAYERS[col]);
        return;
    }

    // Small delay to admire drop
    setTimeout(() => {
        if (isPlaying) spawnNextBlock();
    }, 100);
}

// --- RENDERERS ---

function renderFrame() {
    if (!activeBlock) return;
    const el = document.getElementById(`block-${activeBlock.id}`);
    if (el) {
        el.style.transform = `translateY(${activeBlock.y + activeBlock.h}px)`;
        // Wait, using inline top for physics so transition isn't strictly necessary 
        // Let's use standard absolute pos updates
        el.style.top = `${activeBlock.y}px`;
        el.style.left = `${activeBlock.col * COL_W}px`;
    }
}

function renderAvatars() {
    let html = '';
    PLAYERS.forEach((p, idx) => {
        const total = playerTotals[idx];
        let tClass = "";
        if (total === TARGET_AMOUNT) tClass = "success";
        if (total > TARGET_AMOUNT) tClass = "danger";

        html += `
      <div class="avatar-slot">
        <div class="icon">${p[0]}</div>
        <div class="name">${p}</div>
        <div class="total ${tClass}">₹${total}</div>
      </div>
    `;
    });
    avatarsContainer.innerHTML = html;
}

function updateDashboard() {
    statsBlocksLeft.innerText = blocksQueue.length + (activeBlock ? 1 : 0);
}

// --- CONDITIONS ---

function triggerLoss(playerName) {
    isPlaying = false;
    msgBox.style.display = 'block';
    msgBox.className = 'message-card error mt-10 shadow-sm';
    msgBox.innerHTML = `<strong>Game Over!</strong><br>You gave too much to ${playerName}.`;
}

function checkWinCondition() {
    // If no blocks remain and we got here without triggering loss, we mathematically won 
    // because sum of blocks == 1200 and each must be exactly <= 300.
    isPlaying = false;
    msgBox.style.display = 'block';
    msgBox.className = 'message-card mt-10 shadow-sm';
    msgBox.innerHTML = `<strong>Splits Balanced! 🎉</strong><br>Everyone owes exactly ₹300!`;
}