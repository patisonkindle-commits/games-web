/**
 * Pattern Movement — Complex Path (Tiled Environments Complex Pat)
 * HTML5 Canvas port of the MonoGame XNA demo.
 *
 * Cat follows a complex 8-segment path using Bresenham line interpolation.
 * Each frame the cat moves one step toward the current segment endpoint.
 * Path loops continuously: (4,2)→(4,11)→(2,24)→(13,27)→(16,24)→(13,17)→(13,13)→(17,5)→back to (4,2)
 */

// ─── Constants ───────────────────────────────────────────────────
const kMaxPathLength = 8;
const TILE_SIZE = 32;
const CANVAS_W = 1024;
const CANVAS_H = 768;
const BG_COLOR = '#4682B4';  // CornflowerBlue
const STEP_INTERVAL = 30;   // frames between cat moves

// ─── State ───────────────────────────────────────────────────────
let catPosition = { x: 0, y: 0 };
let mousePosition = { x: 0, y: 0 };
let pathRow = new Array(kMaxPathLength).fill(-1);
let pathCol = new Array(kMaxPathLength).fill(-1);
let currentStep = 0;
let counter = 0;
let stop = false;
let oldKeys = {};
let frameCount = 0;

// ─── Canvas ──────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const ctx = canvas.getContext('2d');

// ─── Sprites (drawn procedurally) ────────────────────────────────
function drawCat(px, py) {
  ctx.save();
  // Body
  ctx.fillStyle = '#FFA500';
  ctx.fillRect(px + 2, py + 4, 28, 24);
  // Head
  ctx.fillStyle = '#FFB830';
  ctx.fillRect(px + 6, py, 20, 16);
  // Ears
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath();
  ctx.moveTo(px + 6, py);
  ctx.lineTo(px + 10, py - 8);
  ctx.lineTo(px + 14, py);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px + 18, py);
  ctx.lineTo(px + 22, py - 8);
  ctx.lineTo(px + 26, py);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 10, py + 4, 4, 4);
  ctx.fillRect(px + 18, py + 4, 4, 4);
  // Tail
  ctx.strokeStyle = '#FF8C00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px + 2, py + 16);
  ctx.quadraticCurveTo(px - 6, py + 8, px - 2, py + 24);
  ctx.stroke();
  ctx.restore();
}

function drawMouse(px, py) {
  ctx.save();
  // Body
  ctx.fillStyle = '#A9A9A9';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 20, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = '#B0B0B0';
  ctx.beginPath();
  ctx.arc(px + 16, py + 8, 8, 0, Math.PI * 2);
  ctx.fill();
  // Ears
  ctx.fillStyle = '#999';
  ctx.beginPath();
  ctx.arc(px + 8, py + 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + 24, py + 2, 5, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 12, py + 6, 3, 3);
  ctx.fillRect(px + 19, py + 6, 3, 3);
  // Nose
  ctx.fillStyle = '#FF69B4';
  ctx.fillRect(px + 14, py + 10, 4, 3);
  // Tail
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 16, py + 28);
  ctx.quadraticCurveTo(px + 16, py + 36, px + 24, py + 34);
  ctx.stroke();
  ctx.restore();
}

// ─── Background texture (procedural grid pattern) ────────────────
// Original draws bgTexture at (40,40) with scale 1.45
// We recreate a subtle grid/tiled background
function drawBackground() {
  ctx.save();
  ctx.translate(40, 40);
  ctx.scale(1.45, 1.45);

  // Base fill
  ctx.fillStyle = '#2a4a6b';
  ctx.fillRect(0, 0, 640, 640);

  // Subtle tile pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let r = 0; r <= 20; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * 32);
    ctx.lineTo(640, r * 32);
    ctx.stroke();
  }
  for (let c = 0; c <= 20; c++) {
    ctx.beginPath();
    ctx.moveTo(c * 32, 0);
    ctx.lineTo(c * 32, 640);
    ctx.stroke();
  }

  // Inner accent lines
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  for (let r = 0; r <= 20; r += 5) {
    ctx.beginPath();
    ctx.moveTo(0, r * 32);
    ctx.lineTo(640, r * 32);
    ctx.stroke();
  }
  for (let c = 0; c <= 20; c += 5) {
    ctx.beginPath();
    ctx.moveTo(c * 32, 0);
    ctx.lineTo(c * 32, 640);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Path Logic (faithful port) ──────────────────────────────────

function buildPathSegment(startRow, startCol, endRow, endCol, index) {
  if (index === 0) {
    pathCol[index] = startCol;
    pathRow[index] = startRow;
    pathCol[index + 1] = endCol - startCol;
    pathRow[index + 1] = endRow - startRow;
  } else if (index < pathCol.length - 1) {
    pathCol[index + 1] = endCol - startCol;
    pathRow[index + 1] = endRow - startRow;
  }
}

/**
 * Bresenham line step — moves cat one pixel-step toward the endpoint
 * of the current path segment. When the endpoint is reached, advances
 * to the next segment. Faithful port of doPatternMovementTiledNormalization().
 */
function doPatternMovementTiledNormalization() {
  let endCol, endRow;
  let sumCol = 0, sumRow = 0;

  if (currentStep === pathCol.length - 1) {
    endCol = pathCol[0];
    endRow = pathRow[0];
  } else {
    for (let i = 0; i <= currentStep; i++) {
      sumCol += pathCol[i];
      sumRow += pathRow[i];
    }
    endCol = sumCol + pathCol[currentStep + 1];
    endRow = sumRow + pathRow[currentStep + 1];
  }

  let nextCol = catPosition.x;
  let nextRow = catPosition.y;
  let deltaRow = endRow - catPosition.y;
  let deltaCol = endCol - catPosition.x;
  let stepCol = 1, stepRow = 1;
  let fraction;

  if (deltaRow < 0) stepRow = -1; else stepRow = 1;
  if (deltaCol < 0) stepCol = -1; else stepCol = 1;

  deltaRow = Math.abs(deltaRow);
  deltaCol = Math.abs(deltaCol);

  if (deltaCol > deltaRow) {
    fraction = deltaRow * 2 - deltaCol;
    if (fraction >= 0 && nextCol !== endCol) {
      nextRow = nextRow + stepRow;
    }
    nextCol = nextCol + stepCol;
    catPosition.x = nextCol;
    catPosition.y = nextRow;
  } else {
    fraction = deltaCol * 2 - deltaRow;
    if (fraction >= 0 && nextRow !== endRow) {
      nextCol = nextCol + stepCol;
    }
    nextRow = nextRow + stepRow;
    catPosition.x = nextCol;
    catPosition.y = nextRow;
  }

  if (catPosition.x === endCol && catPosition.y === endRow) {
    currentStep++;
    if (currentStep >= kMaxPathLength) {
      currentStep = 0;
    }
  }
}

// ─── Initialization ──────────────────────────────────────────────

function init() {
  // Random initial positions (original uses random.Next(10))
  catPosition.x = Math.floor(Math.random() * 10);
  catPosition.y = Math.floor(Math.random() * 10);
  mousePosition.x = Math.floor(Math.random() * 10);
  mousePosition.y = Math.floor(Math.random() * 10);

  // Build the 8 path segments (same as original)
  buildPathSegment(4, 2, 4, 11, 0);
  buildPathSegment(4, 11, 2, 24, 1);
  buildPathSegment(2, 24, 13, 27, 2);
  buildPathSegment(13, 27, 16, 24, 3);
  buildPathSegment(16, 24, 13, 17, 4);
  buildPathSegment(13, 17, 13, 13, 5);
  buildPathSegment(13, 13, 17, 5, 6);
  buildPathSegment(17, 5, 4, 2, 7);

  // Cat starts at first path point
  catPosition.x = pathCol[0];
  catPosition.y = pathRow[0];
  currentStep = 0;
}

// ─── Input ───────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.location.href = '../';
    return;
  }
  if (e.key === '1' && !oldKeys['1']) {
    mousePosition.x = Math.floor(Math.random() * 10);
    mousePosition.y = Math.floor(Math.random() * 10);
    stop = false;
  }
  oldKeys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
  oldKeys[e.key] = false;
});

// ─── Update ──────────────────────────────────────────────────────

function update() {
  if (frameCount % STEP_INTERVAL === 0 && !stop) {
    doPatternMovementTiledNormalization();
  }
  frameCount++;
  if (frameCount > 59) frameCount = 0;
}

// ─── Draw ────────────────────────────────────────────────────────

function draw() {
  // Clear
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Draw background texture (original: bgTexture at 40,40 scale 1.45)
  drawBackground();

  // Draw cat (original: catPosition * 32, scale 0.25)
  // We draw at full TILE_SIZE for visibility
  drawCat(catPosition.x * TILE_SIZE, catPosition.y * TILE_SIZE);

  // Draw mouse
  drawMouse(mousePosition.x * TILE_SIZE, mousePosition.y * TILE_SIZE);

  // HUD text (matching original Draw positions)
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('Cat pos X,y ' + catPosition.x + ',' + catPosition.y, 800, 20);
  ctx.fillText('Mouse pos X,y ' + mousePosition.x + ',' + mousePosition.y, 800, 40);
  ctx.fillStyle = '#c084fc';
  ctx.fillText('Step: ' + currentStep + '/' + (kMaxPathLength - 1) + '  Frame: ' + frameCount, 800, 60);
  ctx.restore();
}

// Expose debug state for browser console testing
window.__gameDebug = function() {
  let sumCol = 0, sumRow = 0;
  for (let i = 0; i <= currentStep; i++) {
    sumCol += pathCol[i];
    sumRow += pathRow[i];
  }
  const endCol = sumCol + pathCol[currentStep + 1];
  const endRow = sumRow + pathRow[currentStep + 1];
  return {
    cat: { x: catPosition.x, y: catPosition.y },
    mouse: { x: mousePosition.x, y: mousePosition.y },
    currentStep,
    target: { col: endCol, row: endRow },
    frameCount,
    stop
  };
};

// ─── Game Loop ───────────────────────────────────────────────────

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ─── Start ───────────────────────────────────────────────────────
init();
gameLoop();
