/**
 * Pattern Movement — Tiled Environments (Pat Matrix)
 * HTML5 Canvas port of the MonoGame XNA demo.
 *
 * Cat follows a pre-computed pattern path on a 20×20 grid using
 * 8-direction random walk that avoids backtracking.
 * Path is built with Bresenham's line algorithm from 7 segments.
 */

// ─── Constants ───────────────────────────────────────────────────
const kMaxRows = 20;
const kMaxCols = 20;
const kMaxPathLength = 7;
const TILE_SIZE = 32;
const GRID_PX = kMaxCols * TILE_SIZE; // 640
const CANVAS_W = 1024;
const CANVAS_H = 768;
const BG_COLOR = '#4682B4';  // CornflowerBlue approx
const STEP_INTERVAL = 30;   // frames between cat moves

// ─── State ───────────────────────────────────────────────────────
let catPosition = { x: 0, y: 0 };
let mousePosition = { x: 0, y: 0 };
let pathRow = new Array(kMaxPathLength).fill(-1);
let pathCol = new Array(kMaxPathLength).fill(-1);
let pattern = [];          // 2D [row][col] 0 or 1
let markedpattern = [];    // unused in original, kept for parity
let currentStep = 0;
let counter = 0;
let stop = false;
let patternIndexCol = 0;
let patternIndexRow = 0;
let patterStop = false;
let previousRow = 0;
let previousCol = 0;
let oldKeys = {};
let frameCount = 0;
let use4Dir = false; // toggle between 4-direction and 8-direction movement

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

function drawTile(px, py) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = 'rgba(200,200,200,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  ctx.restore();
}

// ─── Pattern / Path Logic (faithful port) ────────────────────────

function buildPatternSegment(startRow, startCol, endRow, endCol, index) {
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

function doPatternSegment() {
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

  let nextCol = patternIndexCol;
  let nextRow = patternIndexRow;
  let deltaRow = endRow - patternIndexRow;
  let deltaCol = endCol - patternIndexCol;
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
    patternIndexCol = nextCol;
    patternIndexRow = nextRow;
    pattern[Math.round(patternIndexRow)][Math.round(patternIndexCol)] = 1;
  } else {
    fraction = deltaCol * 2 - deltaRow;
    if (fraction >= 0 && nextRow !== endRow) {
      nextCol = nextCol + stepCol;
    }
    nextRow = nextRow + stepRow;
    patternIndexCol = nextCol;
    patternIndexRow = nextRow;
    pattern[Math.round(patternIndexRow)][Math.round(patternIndexCol)] = 1;
  }

  if (patternIndexCol === endCol && patternIndexRow === endRow) {
    currentStep++;
    if (currentStep >= kMaxPathLength) {
      currentStep = 0;
      patterStop = true;
    }
  }
}

function followPattern() {
  const row = Math.round(catPosition.y);
  const col = Math.round(catPosition.x);

  let possibleRowPath, possibleColPath, rowOffset, colOffset;
  if (use4Dir) {
    // 4-directional: up, left, right, down
    possibleRowPath = [0, 0, 0, 0];
    possibleColPath = [0, 0, 0, 0];
    rowOffset = [-1, 0, 0, 1];
    colOffset = [0, -1, 1, 0];
  } else {
    // 8-directional: all neighbors
    possibleRowPath = [0, 0, 0, 0, 0, 0, 0, 0];
    possibleColPath = [0, 0, 0, 0, 0, 0, 0, 0];
    rowOffset = [-1, -1, -1, 0, 0, 1, 1, 1];
    colOffset = [-1, 0, 1, -1, 1, -1, 0, 1];
  }
  const totalDirection = rowOffset.length;

  let j = 0;
  for (let i = 0; i < totalDirection; i++) {
    const nr = row + rowOffset[i];
    const nc = col + colOffset[i];
    if (nr >= 0 && nr < kMaxRows && nc >= 0 && nc < kMaxCols) {
      if (pattern[nr][nc] === 1) {
        if (!(nr === previousRow && nc === previousCol)) {
          possibleRowPath[j] = nr;
          possibleColPath[j] = nc;
          j++;
        }
      }
    }
  }

  if (j === 0) return; // nowhere to go

  let randstep;
  let newRow, newCol;
  do {
    randstep = Math.floor(Math.random() * 1000000000) % j;
    previousRow = row;
    previousCol = col;
    newRow = possibleRowPath[randstep];
    newCol = possibleColPath[randstep];
  } while (previousRow === newRow && previousCol === newCol);

  catPosition.x = newCol;
  catPosition.y = newRow;
}

// ─── Initialization ──────────────────────────────────────────────

function init() {
  // Initialize pattern arrays
  pattern = [];
  for (let r = 0; r < kMaxRows; r++) {
    pattern[r] = new Array(kMaxCols).fill(0);
  }
  markedpattern = [];
  for (let r = 0; r < kMaxRows; r++) {
    markedpattern[r] = new Array(kMaxCols).fill(0);
  }

  // Random initial positions (original uses random.Next(10) for both)
  catPosition.x = Math.floor(Math.random() * 10);
  catPosition.y = Math.floor(Math.random() * 10);
  mousePosition.x = Math.floor(Math.random() * 10);
  mousePosition.y = Math.floor(Math.random() * 10);

  // Build the 7 path segments (same as original)
  buildPatternSegment(3, 2, 16, 2, 0);
  buildPatternSegment(16, 2, 16, 11, 1);
  buildPatternSegment(16, 11, 9, 11, 2);
  buildPatternSegment(9, 11, 9, 2, 3);
  buildPatternSegment(9, 2, 9, 6, 4);
  buildPatternSegment(9, 6, 3, 6, 5);
  buildPatternSegment(3, 6, 3, 2, 6);

  // Cat starts at first path point
  catPosition.x = pathCol[0];
  catPosition.y = pathRow[0];

  // Clear pattern, set start, then trace
  for (let r = 0; r < kMaxRows; r++)
    for (let c = 0; c < kMaxCols; c++)
      pattern[r][c] = 0;

  pattern[Math.round(pathRow[0])][Math.round(pathCol[0])] = 1;
  patternIndexCol = pathCol[0];
  patternIndexRow = pathRow[0];
  currentStep = 0;
  patterStop = false;

  // Trace the full pattern path using Bresenham
  while (!patterStop) {
    doPatternSegment();
  }
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
  if (e.key === '2' && !oldKeys['2']) {
    use4Dir = !use4Dir;
  }
  oldKeys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
  oldKeys[e.key] = false;
});

// ─── Update ──────────────────────────────────────────────────────

function update() {
  // Cat moves every STEP_INTERVAL frames (same as counter % 30 == 0)
  if (frameCount % STEP_INTERVAL === 0 && !stop) {
    followPattern();
  }
  frameCount++;
  if (frameCount > 59) frameCount = 0;
}

// ─── Draw ────────────────────────────────────────────────────────

function draw() {
  // Clear
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Draw grid lines (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let r = 0; r <= kMaxRows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * TILE_SIZE);
    ctx.lineTo(GRID_PX, r * TILE_SIZE);
    ctx.stroke();
  }
  for (let c = 0; c <= kMaxCols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * TILE_SIZE, 0);
    ctx.lineTo(c * TILE_SIZE, GRID_PX);
    ctx.stroke();
  }

  // Draw pattern tiles
  for (let c = 0; c < kMaxCols; c++) {
    for (let r = 0; r < kMaxRows; r++) {
      if (pattern[r][c] === 1) {
        drawTile(c * TILE_SIZE, r * TILE_SIZE);
      }
    }
  }

  // Draw cat and mouse (scaled 0.25 in original → TILE_SIZE/32 = 1.0 here since we draw at TILE_SIZE)
  // Original: catPosition * 32 with scale 0.25 → effective 8px. We draw at full TILE_SIZE for visibility.
  drawCat(catPosition.x * TILE_SIZE, catPosition.y * TILE_SIZE);
  drawMouse(mousePosition.x * TILE_SIZE, mousePosition.y * TILE_SIZE);

  // HUD text (matching original Draw positions)
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('Cat pos X,y ' + catPosition.x + ',' + catPosition.y, 800, 20);
  ctx.fillText('Mouse pos X,y ' + mousePosition.x + ',' + mousePosition.y, 800, 40);
  ctx.fillStyle = use4Dir ? '#4ecdc4' : '#ffd93d';
  ctx.fillText('Mode: ' + (use4Dir ? '4-dir' : '8-dir') + ' (press 2)', 800, 60);
  ctx.restore();
}

// ─── Game Loop ───────────────────────────────────────────────────

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ─── Start ───────────────────────────────────────────────────────
init();
gameLoop();
