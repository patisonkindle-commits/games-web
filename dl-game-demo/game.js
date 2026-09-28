// ============================================================
// Deep Learning in Games — Interactive HTML5 Demo
// Interactive HTML5 Demo
// ============================================================

// --- Configuration ---
const CFG = {
  W: 1200,
  H: 720,
  scene: 0,
  sceneNames: ['NN Structure', 'AI Decision', 'RL Learning', 'Rule vs DL'],
  sceneColors: ['#00e5ff', '#76ff03', '#ff9100', '#ff4081'],
  tabH: 48,
  infoH: 90,
  gameW: 680,
  nnW: 520,
};

// --- Color Palette ---
const P = {
  bg:      '#0a0a14',
  panelBg: '#141428',
  panelBd: '#1e1e3a',
  accent:  '#00e5ff',
  accent2: '#ff4081',
  accent3: '#76ff03',
  accent4: '#ff9100',
  muted:   '#3a3a5c',
  text:    '#e0e0e0',
  textDim: '#6a6a8a',
  grid:    '#1a1a3a',
  wall:    '#2a2a4a',
  wallBd:  '#3a3a6a',
  floor:   '#0e0e20',
  agent:   '#00e5ff',
  ghost:   '#aa44ff',
  coin:    '#ffd600',
  spike:   '#ff1744',
  platform:'#00c853',
  goal:    '#ffd600',
};

// ============================================================
// NEURAL NETWORK ENGINE
// ============================================================
class NeuralNetwork {
  constructor(layerSizes) {
    this.sizes = layerSizes;
    this.weights = [];
    this.biases = [];
    this.activations = [];
    this.zValues = []; // pre-activation
    this.lastFiredEdges = []; // for visualization
    this.init();
  }

  init() {
    this.weights = [];
    this.biases = [];
    for (let i = 0; i < this.sizes.length - 1; i++) {
      const rows = this.sizes[i + 1];
      const cols = this.sizes[i];
      const w = [];
      const b = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          row.push((Math.random() * 2 - 1) * 0.5);
        }
        w.push(row);
        b.push((Math.random() * 2 - 1) * 0.3);
      }
      this.weights.push(w);
      this.biases.push(b);
    }
    this.activations = this.sizes.map(s => new Array(s).fill(0));
    this.zValues = this.sizes.map(s => new Array(s).fill(0));
  }

  sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); }
  relu(x) { return Math.max(0, x); }

  forward(inputs) {
    this.lastFiredEdges = [];
    this.activations[0] = [...inputs];
    this.zValues[0] = [...inputs];

    for (let l = 0; l < this.weights.length; l++) {
      const w = this.weights[l];
      const b = this.biases[l];
      const prev = this.activations[l];
      const next = new Array(this.sizes[l + 1]).fill(0);
      const z = new Array(this.sizes[l + 1]).fill(0);

      for (let j = 0; j < w.length; j++) {
        let sum = b[j];
        for (let k = 0; k < prev.length; k++) {
          sum += w[j][k] * prev[k];
        }
        z[j] = sum;
        // hidden layers: sigmoid, output: softmax or sigmoid
        if (l === this.weights.length - 1) {
          next[j] = sum; // raw logits for output
        } else {
          next[j] = this.sigmoid(sum);
        }
      }

      // softmax on output layer
      if (l === this.weights.length - 1) {
        const maxZ = Math.max(...z);
        const exps = z.map(v => Math.exp(v - maxZ));
        const sumExp = exps.reduce((a, b) => a + b, 0);
        for (let j = 0; j < next.length; j++) {
          next[j] = exps[j] / (sumExp || 1);
        }
      }

      this.zValues[l + 1] = z;
      this.activations[l + 1] = next;

      // Track fired edges (top connections)
      const fired = [];
      for (let j = 0; j < w.length; j++) {
        let maxIdx = 0, maxVal = -Infinity;
        for (let k = 0; k < prev.length; k++) {
          const strength = Math.abs(w[j][k] * prev[k]);
          if (strength > maxVal) { maxVal = strength; maxIdx = k; }
        }
        fired.push({ from: maxIdx, to: j, strength: maxVal });
      }
      this.lastFiredEdges.push(fired);
    }
    return this.activations[this.activations.length - 1];
  }

  randomize() { this.init(); }

  // Set weights from Q-table style update
  adjustWeight(layer, from, to, delta) {
    this.weights[layer][to][from] += delta;
    this.weights[layer][to][from] = Math.max(-2, Math.min(2, this.weights[layer][to][from]));
  }

  copy() {
    const nn = new NeuralNetwork(this.sizes);
    for (let l = 0; l < this.weights.length; l++) {
      for (let j = 0; j < this.weights[l].length; j++) {
        for (let k = 0; k < this.weights[l][j].length; k++) {
          nn.weights[l][j][k] = this.weights[l][j][k];
        }
        nn.biases[l][j] = this.biases[l][j];
      }
    }
    return nn;
  }
}

// ============================================================
// GLOBALS
// ============================================================
let nn, tabs, infoText = '';
let scene1, scene2, scene3, scene4;
let font;
const keys = {};

function preload() {
  // No external assets needed
}

function setup() {
  createCanvas(CFG.W, CFG.H);
  pixelDensity(1);
  textFont('Segoe UI, Sarabun, sans-serif');

  tabs = new TabBar();
  scene1 = new SceneMaze();
  scene2 = new ScenePlatformer();
  scene3 = new SceneRacing();
  scene4 = new SceneCompare();

  // Default NN for scene 1
  nn = new NeuralNetwork([4, 6, 3]);
}

function draw() {
  background(P.bg);

  // Tab bar
  tabs.draw();

  // Scene area
  push();
  translate(0, CFG.tabH);
  switch (CFG.scene) {
    case 0: scene1.update(); scene1.draw(); break;
    case 1: scene2.update(); scene2.draw(); break;
    case 2: scene3.update(); scene3.draw(); break;
    case 3: scene4.update(); scene4.draw(); break;
  }
  pop();

  // Info panel
  drawInfoPanel();
}

function mousePressed() {
  tabs.handleClick(mouseX, mouseY);
  if (CFG.scene === 0) scene1.handleClick(mouseX, mouseY - CFG.tabH);
  if (CFG.scene === 1) scene2.handleClick(mouseX, mouseY - CFG.tabH);
  if (CFG.scene === 2) scene3.handleClick(mouseX, mouseY - CFG.tabH);
  if (CFG.scene === 3) scene4.handleClick(mouseX, mouseY - CFG.tabH);
}

function keyPressed() {
  keys[key] = true;
  if (key >= '1' && key <= '4') {
    CFG.scene = parseInt(key) - 1;
    initScene(CFG.scene);
  }
  // Space = Pause/Play for all scenes
  if (key === ' ') {
    switch (CFG.scene) {
      case 0: scene1.running = !scene1.running; scene1.stepMode = false; break;
      case 1: scene2.running = !scene2.running; break;
      case 2: scene3.togglePause(); break;
      case 3: scene4.running = !scene4.running; break;
    }
  }
  // R = Reset for all scenes
  if (key === 'r' || key === 'R') {
    switch (CFG.scene) {
      case 0: scene1.reset(); break;
      case 1: scene2.reset(); break;
      case 2: scene3.reset(); break;
      case 3: scene4.reset(); break;
    }
  }
}

function keyReleased() {
  keys[key] = false;
}

function initScene(idx) {
  switch (idx) {
    case 0: scene1.reset(); break;
    case 1: scene2.reset(); break;
    case 2: scene3.reset(); break;
    case 3: scene4.reset(); break;
  }
}

// ============================================================
// UI: TAB BAR
// ============================================================
class TabBar {
  constructor() {
    this.h = CFG.tabH;
    this.tabW = CFG.W / 4;
  }

  draw() {
    for (let i = 0; i < 4; i++) {
      const x = i * this.tabW;
      const active = CFG.scene === i;
      noStroke();
      fill(active ? P.panelBg : P.bg);
      rect(x, 0, this.tabW, this.h);

      // Active tab glow/gradient
      if (active) {
        const gc = color(CFG.sceneColors[i]);
        for (let g = 0; g < 20; g++) {
          fill(red(gc), green(gc), blue(gc), map(g, 0, 20, 25, 0));
          noStroke();
          rect(x, g, this.tabW, 1);
        }
        // Top colored border
        fill(CFG.sceneColors[i]);
        rect(x, 0, this.tabW, 3);
      }

      // Bottom border
      fill(active ? CFG.sceneColors[i] : P.muted);
      rect(x, this.h - 3, this.tabW, 3);

      // Number dot
      fill(active ? CFG.sceneColors[i] : P.muted);
      noStroke();
      ellipse(x + 20, this.h / 2, 20, 20);
      fill(active ? P.bg : P.panelBg);
      textAlign(CENTER, CENTER);
      textSize(12);
      textStyle(BOLD);
      text(i + 1, x + 20, this.h / 2 - 1);

      // Label
      fill(active ? '#fff' : P.textDim);
      textSize(14);
      textStyle(active ? BOLD : NORMAL);
      textAlign(LEFT, CENTER);
      text(CFG.sceneNames[i], x + 36, this.h / 2);
      textStyle(NORMAL);
    }
  }

  handleClick(mx, my) {
    if (my > this.h) return;
    const idx = Math.floor(mx / this.tabW);
    if (idx >= 0 && idx < 4) {
      CFG.scene = idx;
      initScene(idx);
    }
  }
}

// ============================================================
// UI: INFO PANEL
// ============================================================
function drawInfoPanel() {
  const y = CFG.H - CFG.infoH;
  noStroke();
  fill(P.panelBg);
  rect(0, y, CFG.W, CFG.infoH);
  fill(P.panelBd);
  rect(0, y, CFG.W, 1);

  // Scene-specific color accent line on left edge
  fill(CFG.sceneColors[CFG.scene]);
  rect(0, y, 4, CFG.infoH);

  // Label
  fill(P.textDim);
  textSize(11);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  text('INFO', 16, y + 10);
  textStyle(NORMAL);

  fill(P.textDim);
  textSize(13);
  textAlign(LEFT, TOP);
  const lines = infoText.split('\n');
  for (let i = 0; i < lines.length && i < 3; i++) {
    text(lines[i], 16, y + 26 + i * 20);
  }

  // Keyboard hints
  fill(P.muted);
  textSize(11);
  textAlign(RIGHT, BOTTOM);
  text('[1-4] Switch scene  |  [Space] Pause/Play  |  [R] Reset', CFG.W - 16, y + CFG.infoH - 10);
}

// ============================================================
// HELPER: Draw NN Visualization
// ============================================================
function drawNNVis(nn, cx, cy, w, h, highlightLayer, baseColor) {
  const layers = nn.sizes;
  const nLayers = layers.length;
  const layerSpacing = w / (nLayers - 1);
  const positions = [];

  // Calculate positions
  for (let l = 0; l < nLayers; l++) {
    const x = cx - w / 2 + l * layerSpacing;
    const layerPos = [];
    const n = layers[l];
    const nodeSpacing = Math.min(40, h / (n + 1));
    const startY = cy - (n - 1) * nodeSpacing / 2;
    for (let i = 0; i < n; i++) {
      layerPos.push({ x: x, y: startY + i * nodeSpacing });
    }
    positions.push(layerPos);
  }

  // Draw edges
  for (let l = 0; l < nLayers - 1; l++) {
    const from = positions[l];
    const to = positions[l + 1];
    const wArr = nn.weights[l];
    const isHighlight = (highlightLayer === l || highlightLayer === -1);

    for (let j = 0; j < to.length; j++) {
      for (let k = 0; k < from.length; k++) {
        const weight = wArr[j][k];
        const absW = Math.abs(weight);
        const alpha = isHighlight ? map(absW, 0, 1, 40, 255) : 30;
        const col = weight > 0
          ? baseColor || P.accent
          : P.accent2;
        stroke(red(color(P.muted)), green(color(P.muted)), blue(color(P.muted)), alpha);
        strokeWeight(absW * 3 + 0.3);
        line(from[k].x, from[k].y, to[j].x, to[j].y);
      }
    }
  }

  // Draw neurons
  for (let l = 0; l < nLayers; l++) {
    for (let i = 0; i < positions[l].length; i++) {
      const pos = positions[l][i];
      const act = nn.activations[l] ? nn.activations[l][i] : 0;
      const r = 14;

      // Glow
      const glowAlpha = act * 80;
      noStroke();
      const gc = color(baseColor || P.accent);
      fill(red(gc), green(gc), blue(gc), glowAlpha);
      ellipse(pos.x, pos.y, r * 2.5, r * 2.5);

      // Neuron body
      const bright = Math.floor(act * 200 + 55);
      stroke(P.panelBd);
      strokeWeight(1.5);
      fill(bright * 0.15, bright * 0.15, bright * 0.25);
      ellipse(pos.x, pos.y, r * 2, r * 2);

      // Activation value
      if (layers[l] <= 8) {
        fill(P.text);
        noStroke();
        textSize(9);
        textAlign(CENTER, CENTER);
        text(act.toFixed(2), pos.x, pos.y);
      }
    }
  }

  // Layer labels
  fill(P.textDim);
  noStroke();
  textSize(11);
  textAlign(CENTER, TOP);
  const labels = ['Input', 'Hidden', 'Output'];
  for (let l = 0; l < nLayers; l++) {
    const lbl = l === 0 ? labels[0] : l === nLayers - 1 ? labels[2] : labels[1];
    text(lbl, positions[l][0].x, cy + h / 2 + 10);
  }

  return positions;
}

// ============================================================
// SCENE 1: MAZE NAVIGATOR
// ============================================================
class SceneMaze {
  constructor() {
    this.reset();
  }

  reset() {
    this.mazeW = 21;
    this.mazeH = 21;
    this.maze = this.generateMaze(this.mazeW, this.mazeH);
    this.agentX = 1;
    this.agentY = 1;
    this.agentDir = 0; // 0=right,1=down,2=left,3=up
    this.goalX = this.mazeW - 2;
    this.goalY = this.mazeH - 2;
    this.trail = [];
    this.deadEnds = [];
    this.steps = 0;
    this.dotsCollected = 0;
    this.running = false;
    this.stepMode = false;
    this.stepTimer = 0;
    this.stepInterval = 300; // ms per step
    this.trainSpeed = 1;
    this.speedBtns = [1, 3, 5, 10];
    this.nn = new NeuralNetwork([4, 6, 3]);
    this.lastOutput = [0, 0, 0];
    this.lastInputs = [0, 0, 0, 0];
    this.visited = new Set();
    this.visited.add(`${this.agentX},${this.agentY}`);

    // Place dots
    this.dots = [];
    for (let y = 1; y < this.mazeH; y += 2) {
      for (let x = 1; x < this.mazeW; x += 2) {
        if (this.maze[y][x] === 0 && Math.random() < 0.4) {
          if (!(x === 1 && y === 1) && !(x === this.goalX && y === this.goalY)) {
            this.dots.push({ x, y });
          }
        }
      }
    }

    infoText = 'Scene 1: Maze Navigator — Agent uses NN to navigate from start to Goal\nNN receives wall sensor data, then decides: turn left/right/go straight\nPress [Step] to see Forward Pass one tile at a time';
  }

  generateMaze(w, h) {
    const maze = Array.from({ length: h }, () => new Array(w).fill(1));

    // Recursive backtracker
    const stack = [];
    const sx = 1, sy = 1;
    maze[sy][sx] = 0;
    stack.push({ x: sx, y: sy });

    while (stack.length > 0) {
      const cur = stack[stack.length - 1];
      const dirs = [
        { dx: 0, dy: -2 }, { dx: 2, dy: 0 },
        { dx: 0, dy: 2 }, { dx: -2, dy: 0 }
      ].sort(() => Math.random() - 0.5);

      let found = false;
      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && maze[ny][nx] === 1) {
          maze[ny][nx] = 0;
          maze[cur.y + d.dy / 2][cur.x + d.dx / 2] = 0;
          stack.push({ x: nx, y: ny });
          found = true;
          break;
        }
      }
      if (!found) stack.pop();
    }
    return maze;
  }

  getSensors() {
    // Direction vectors: right, down, left, up
    const dx = [1, 0, -1, 0];
    const dy = [0, 1, 0, -1];

    const frontBlocked = this.maze[this.agentY + dy[this.agentDir]]
      && this.maze[this.agentY + dy[this.agentDir]][this.agentX + dx[this.agentDir]] === 1 ? 1 : 0;
    const leftDir = (this.agentDir + 3) % 4;
    const leftBlocked = this.maze[this.agentY + dy[leftDir]]
      && this.maze[this.agentY + dy[leftDir]][this.agentX + dx[leftDir]] === 1 ? 1 : 0;
    const rightDir = (this.agentDir + 1) % 4;
    const rightBlocked = this.maze[this.agentY + dy[rightDir]]
      && this.maze[this.agentY + dy[rightDir]][this.agentX + dx[rightDir]] === 1 ? 1 : 0;

    // Goal direction angle (normalized 0-1)
    const gdx = this.goalX - this.agentX;
    const gdy = this.goalY - this.agentY;
    const angle = Math.atan2(gdy, gdx);
    const dirAngle = [0, Math.PI / 2, Math.PI, -Math.PI / 2][this.agentDir];
    let diff = angle - dirAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const goalDir = (diff / Math.PI + 1) / 2; // normalize to 0-1

    return [frontBlocked, leftBlocked, rightBlocked, goalDir];
  }

  update() {
    if (!this.running || this.stepMode) return;

    for (let s = 0; s < this.trainSpeed; s++) {
      this.stepTimer += deltaTime;
      if (this.stepTimer >= this.stepInterval) {
        this.stepTimer = 0;
        this.doStep();
      }
    }
  }

  doStep() {
    const sensors = this.getSensors();
    this.lastInputs = sensors;
    this.lastOutput = this.nn.forward(sensors);

    // argmax
    let bestAct = 0;
    for (let i = 1; i < 3; i++) {
      if (this.lastOutput[i] > this.lastOutput[bestAct]) bestAct = i;
    }

    // Action: 0=straight, 1=turn left, 2=turn right
    if (bestAct === 1) this.agentDir = (this.agentDir + 3) % 4;
    else if (bestAct === 2) this.agentDir = (this.agentDir + 1) % 4;

    // Move forward
    const dx = [1, 0, -1, 0];
    const dy = [0, 1, 0, -1];
    const nx = this.agentX + dx[this.agentDir];
    const ny = this.agentY + dy[this.agentDir];

    if (nx >= 0 && nx < this.mazeW && ny >= 0 && ny < this.mazeH && this.maze[ny][nx] === 0) {
      this.trail.push({ x: this.agentX, y: this.agentY });
      this.agentX = nx;
      this.agentY = ny;
      this.steps++;
      this.visited.add(`${nx},${ny}`);

      // Collect dot
      for (let i = this.dots.length - 1; i >= 0; i--) {
        if (this.dots[i].x === nx && this.dots[i].y === ny) {
          this.dots.splice(i, 1);
          this.dotsCollected++;
          break;
        }
      }
    } else {
      // Hit wall — record dead end
      this.deadEnds.push({ x: this.agentX, y: this.agentY });
      // Turn to find open path
      for (let t = 0; t < 4; t++) {
        this.agentDir = (this.agentDir + 1) % 4;
        const tnx = this.agentX + dx[this.agentDir];
        const tny = this.agentY + dy[this.agentDir];
        if (tnx >= 0 && tnx < this.mazeW && tny >= 0 && tny < this.mazeH && this.maze[tny][tnx] === 0) break;
      }
    }

    // Check goal
    if (this.agentX === this.goalX && this.agentY === this.goalY) {
      this.running = false;
    }
  }

  draw() {
    const areaH = CFG.H - CFG.tabH - CFG.infoH;

    // Left: Maze
    this.drawMaze(0, 0, CFG.gameW, areaH);

    // Right: NN visualization
    this.drawNNPanel(CFG.gameW, 0, CFG.nnW, areaH);

    // Controls
    this.drawControls();
  }

  drawMaze(x, y, w, h) {
    push();
    translate(x, y);

    const tileSize = Math.min(
      (w - 40) / this.mazeW,
      (h - 80) / this.mazeH
    );
    const mazePixelW = tileSize * this.mazeW;
    const mazePixelH = tileSize * this.mazeH;
    const ox = (w - mazePixelW) / 2;
    const oy = (h - 70 - mazePixelH) / 2;

    // Panel border
    noFill();
    stroke(P.panelBd);
    strokeWeight(1);
    rect(0, 0, w, h, 8);
    noStroke();

    // Title
    fill(P.text);
    noStroke();
    textSize(16);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text('🗺 Maze Navigator', w / 2, 10);
    textStyle(NORMAL);

    // Draw maze
    for (let my = 0; my < this.mazeH; my++) {
      for (let mx = 0; mx < this.mazeW; mx++) {
        const px = ox + mx * tileSize;
        const py = oy + my * tileSize;

        if (this.maze[my][mx] === 1) {
          // Wall
          fill(P.wall);
          stroke(P.wallBd);
          strokeWeight(0.5);
          rect(px, py, tileSize, tileSize, 1);
        } else {
          // Floor
          fill(P.floor);
          noStroke();
          rect(px, py, tileSize, tileSize);
        }
      }
    }

    // Draw dead ends
    for (const de of this.deadEnds) {
      fill(255, 50, 50, 60);
      noStroke();
      rect(ox + de.x * tileSize, oy + de.y * tileSize, tileSize, tileSize);
    }

    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = map(i, 0, this.trail.length, 30, 120);
      fill(0, 229, 255, alpha);
      noStroke();
      rect(ox + t.x * tileSize + 2, oy + t.y * tileSize + 2, tileSize - 4, tileSize - 4, 3);
    }

    // Draw dots
    for (const d of this.dots) {
      fill(P.coin);
      noStroke();
      ellipse(ox + d.x * tileSize + tileSize / 2, oy + d.y * tileSize + tileSize / 2, tileSize * 0.3);
    }

    // Draw goal
    fill(P.goal);
    noStroke();
    const goalPulse = Math.sin(millis() * 0.005) * 0.2 + 0.8;
    ellipse(ox + this.goalX * tileSize + tileSize / 2, oy + this.goalY * tileSize + tileSize / 2, tileSize * 0.6 * goalPulse);

    // Draw agent
    const agentPx = ox + this.agentX * tileSize + tileSize / 2;
    const agentPy = oy + this.agentY * tileSize + tileSize / 2;

    // Glow
    noStroke();
    fill(0, 229, 255, 40);
    ellipse(agentPx, agentPy, tileSize * 1.5);

    // Body
    fill(P.agent);
    stroke(255, 255, 255, 100);
    strokeWeight(1.5);
    ellipse(agentPx, agentPy, tileSize * 0.6);

    // Direction indicator
    const dirAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const dirDx = Math.cos(dirAngles[this.agentDir]);
    const dirDy = Math.sin(dirAngles[this.agentDir]);
    fill(255);
    noStroke();
    ellipse(agentPx + dirDx * tileSize * 0.15, agentPy + dirDy * tileSize * 0.15, tileSize * 0.15);

    // Stats
    fill(P.textDim);
    textSize(12);
    textAlign(LEFT, BOTTOM);
    text(`Steps: ${this.steps}  |  Coins: ${this.dotsCollected}  |  Visited: ${this.visited.size}`, 10, h - 10);

    // Status
    if (!this.running && this.steps > 0) {
      if (this.agentX === this.goalX && this.agentY === this.goalY) {
        fill(P.accent3);
        textSize(14);
        textAlign(CENTER, BOTTOM);
        text('🎯 Goal Reached!', w / 2, h - 40);
      }
    }

    pop();
  }

  drawNNPanel(x, y, w, h) {
    push();
    translate(x, y);

    // Background with rounded corners
    fill(P.panelBg);
    noStroke();
    rect(0, 0, w, h, 0, 0, 0, 8);

    // Left border accent
    fill(CFG.sceneColors[CFG.scene]);
    rect(0, 0, 3, h, 0);

    // Title in panel header
    fill(P.text);
    textSize(14);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text('🧠 Neural Network', w / 2, 10);
    textStyle(NORMAL);

    // Draw NN
    const nnCx = w / 2;
    const nnCy = h / 2 - 10;
    drawNNVis(this.nn, nnCx, nnCy, w - 60, h - 120, -1, P.accent);

    // Input labels
    const inputLabels = ['Wall Front', 'Wall Left', 'Wall Right', 'Goal Dir'];
    const positions = [];
    const nLayers = this.nn.sizes.length;
    const layerSpacing = (w - 60) / (nLayers - 1);
    const startY = nnCy - (this.nn.sizes[0] - 1) * Math.min(40, (h - 120) / (this.nn.sizes[0] + 1)) / 2;

    fill(P.textDim);
    textSize(9);
    textAlign(RIGHT, CENTER);
    for (let i = 0; i < inputLabels.length; i++) {
      const ny = startY + i * Math.min(40, (h - 120) / (this.nn.sizes[0] + 1));
      text(inputLabels[i], nnCx - (w - 60) / 2 - 8, ny);
    }

    // Output labels
    const outputLabels = ['Straight', 'Left', 'Right'];
    textAlign(LEFT, CENTER);
    const lastLayerN = this.nn.sizes[nLayers - 1];
    const lastStartY = nnCy - (lastLayerN - 1) * Math.min(40, (h - 120) / (lastLayerN + 1)) / 2;
    for (let i = 0; i < outputLabels.length; i++) {
      const ny = lastStartY + i * Math.min(40, (h - 120) / (lastLayerN + 1));
      text(outputLabels[i], nnCx + (w - 60) / 2 + 8, ny);

      // Highlight chosen action
      if (this.lastOutput[i] === Math.max(...this.lastOutput)) {
        fill(P.accent3);
        textSize(11);
        text('← CHOSEN', nnCx + (w - 60) / 2 + 55, ny);
        fill(P.textDim);
        textSize(9);
      }
    }

    // Input values
    fill(P.accent);
    textSize(10);
    textAlign(RIGHT, CENTER);
    for (let i = 0; i < this.lastInputs.length; i++) {
      const ny = startY + i * Math.min(40, (h - 120) / (this.nn.sizes[0] + 1));
      text(this.lastInputs[i].toFixed(2), nnCx - (w - 60) / 2 - 8, ny + 14);
    }

    // Output values
    textAlign(LEFT, CENTER);
    for (let i = 0; i < this.lastOutput.length; i++) {
      const ny = lastStartY + i * Math.min(40, (h - 120) / (lastLayerN + 1));
      fill(this.lastOutput[i] === Math.max(...this.lastOutput) ? P.accent3 : P.textDim);
      textSize(10);
      text(this.lastOutput[i].toFixed(3), nnCx + (w - 60) / 2 + 8, ny + 14);
    }

    pop();
  }

  drawControls() {
    const areaH = CFG.H - CFG.tabH - CFG.infoH;
    const y = areaH - 50;
    const btnW = 100;
    const btnH = 40;
    const gap = 16;
    const totalW = btnW * 3 + gap * 2;
    const startX = 16;

    const btn1 = { x: startX, y, w: btnW, h: btnH, label: this.running ? '⏸ Stop' : '▶ Start', color: this.running ? P.accent2 : P.accent3 };
    drawBtn(btn1);

    const btn2 = { x: startX + btnW + gap, y, w: btnW, h: btnH, label: '⏭ Step', color: P.accent4 };
    drawBtn(btn2);

    const btn3 = { x: startX + (btnW + gap) * 2, y, w: btnW, h: btnH, label: '🔄 Reset', color: P.accent2 };
    drawBtn(btn3);

    // Speed buttons
    const spdBtnW = 48, spdGap = 8;
    const spdLabels = ['1x', '3x', '5x', 'MAX'];
    const totalSpdW = spdLabels.length * spdBtnW + (spdLabels.length - 1) * spdGap;
    const spdX = CFG.gameW - 16 - totalSpdW;
    fill(P.textDim);
    textSize(12);
    textStyle(BOLD);
    textAlign(RIGHT, CENTER);
    text('Speed:', spdX - 8, y + btnH / 2);
    textStyle(NORMAL);
    for (let i = 0; i < spdLabels.length; i++) {
      const bx = spdX + i * (spdBtnW + spdGap);
      const active = this.trainSpeed === this.speedBtns[i];
      fill(active ? P.accent : P.muted);
      noStroke();
      rect(bx, y, spdBtnW, btnH, 6);
      fill(active ? P.bg : P.textDim);
      textSize(13);
      textStyle(active ? BOLD : NORMAL);
      textAlign(CENTER, CENTER);
      text(spdLabels[i], bx + spdBtnW / 2, y + btnH / 2);
    }
    textStyle(NORMAL);

    this.btns = [btn1, btn2, btn3];
  }

  handleClick(mx, my) {
    if (!this.btns) return;
    for (let i = 0; i < this.btns.length; i++) {
      const b = this.btns[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (i === 0) { this.running = !this.running; this.stepMode = false; }
        if (i === 1) { this.stepMode = true; this.doStep(); this.running = false; }
        if (i === 2) this.reset();
      }
    }
    // Speed buttons
    if (this.speedBtns) {
      const spdBtnW = 48, spdGap = 8;
      const totalSpdW = this.speedBtns.length * spdBtnW + (this.speedBtns.length - 1) * spdGap;
      const spdX = CFG.gameW - 16 - totalSpdW;
      const areaH2 = CFG.H - CFG.tabH - CFG.infoH;
      const y2 = areaH2 - 50;
      for (let i = 0; i < this.speedBtns.length; i++) {
        const bx = spdX + i * (spdBtnW + spdGap);
        if (mx >= bx && mx <= bx + spdBtnW && my >= y2 && my <= y2 + 40) {
          this.trainSpeed = this.speedBtns[i];
        }
      }
    }
  }
}

// ============================================================
// SCENE 2: PLATFORMER RUNNER
// ============================================================
class ScenePlatformer {
  constructor() {
    this.reset();
  }

  reset() {
    this.nn = new NeuralNetwork([5, 6, 2]);
    this.agentX = 100;
    this.agentY = 300;
    this.agentVY = 0;
    this.groundY = 380;
    this.gravity = 0.6;
    this.jumpPower = -10;
    this.isGrounded = true;
    this.speed = 3;
    this.scrollX = 0;
    this.trainSpeed = 1;
    this.speedBtns = [1, 3, 5, 10];

    this.obstacles = [];
    this.coins = [];
    this.score = 0;
    this.distance = 0;
    this.alive = true;
    this.running = false;
    this.spawnTimer = 0;
    this.spawnInterval = 120;
    this.lastJump = false;

    // Generate initial obstacles
    for (let i = 0; i < 20; i++) {
      this.spawnObstacle(600 + i * 300 + Math.random() * 100);
    }
    for (let i = 0; i < 15; i++) {
      this.spawnCoin(500 + i * 250 + Math.random() * 150);
    }

    infoText = 'Scene 2: Platformer Runner — Agent uses NN to decide when to jump over obstacles\nNN receives distance and level of obstacles/coins, then decides [Jump] or [Stay]';
  }

  spawnObstacle(x) {
    const isDouble = Math.random() < 0.2;
    if (isDouble) {
      // Both lanes blocked — must jump
      this.obstacles.push({ x, y: this.groundY - 30, w: 30, h: 30, type: 'double' });
      this.obstacles.push({ x, y: this.groundY - 80, w: 30, h: 30, type: 'double' });
    } else {
      const isHigh = Math.random() < 0.4;
      this.obstacles.push({
        x,
        y: isHigh ? this.groundY - 60 : this.groundY - 30,
        w: 25, h: 25,
        type: isHigh ? 'high' : 'low'
      });
    }
  }

  spawnCoin(x) {
    this.coins.push({ x, y: this.groundY - 50 - Math.random() * 60, collected: false });
  }

  getInputs() {
    const lookAhead = 200;
    let minObsDist = 1, minObsSameLevel = 0;
    let minCoinDist = 1, minCoinHigh = 0;

    for (const o of this.obstacles) {
      const dist = (o.x - this.scrollX - this.agentX) / lookAhead;
      if (dist > -0.1 && dist < minObsDist) {
        minObsDist = Math.max(0, dist);
        minObsSameLevel = (Math.abs(o.y + o.h - this.groundY) < 15) ? 1 : 0;
      }
    }

    for (const c of this.coins) {
      if (c.collected) continue;
      const dist = (c.x - this.scrollX - this.agentX) / lookAhead;
      if (dist > -0.1 && dist < minCoinDist) {
        minCoinDist = Math.max(0, dist);
        minCoinHigh = (c.y < this.groundY - 40) ? 1 : 0;
      }
    }

    return [minObsDist, minObsSameLevel, minCoinDist, minCoinHigh, this.isGrounded ? 1 : 0];
  }

  update() {
    if (!this.running || !this.alive) return;

    for (let s = 0; s < this.trainSpeed; s++) {
      if (!this.alive) break;

      // Get NN decision
      const inputs = this.getInputs();
      const output = this.nn.forward(inputs);
      const shouldJump = output[0] > output[1] && this.isGrounded;

      if (shouldJump) {
        this.agentVY = this.jumpPower;
        this.isGrounded = false;
        this.lastJump = true;
      } else {
        this.lastJump = false;
      }

      // Physics
      this.agentVY += this.gravity;
      this.agentY += this.agentVY;

      if (this.agentY >= this.groundY) {
        this.agentY = this.groundY;
        this.agentVY = 0;
        this.isGrounded = true;
      }

      // Scroll world
      this.scrollX += this.speed;
      this.distance += this.speed;

      // Spawn new obstacles
      this.spawnTimer++;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const lastX = this.obstacles.length > 0 ? Math.max(...this.obstacles.map(o => o.x)) : this.agentX;
        this.spawnObstacle(lastX + 200 + Math.random() * 200);
        this.spawnCoin(lastX + 150 + Math.random() * 250);
      }

      // Collision check
      const ax = this.agentX;
      const ay = this.agentY;
      const aw = 20, ah = 30;

      for (const o of this.obstacles) {
        if (o.x - this.scrollX + o.w < ax - 10) continue;
        if (o.x - this.scrollX > ax + aw + 10) continue;
        const ox = o.x - this.scrollX;
        if (ax + aw > ox && ax < ox + o.w && ay + ah > o.y && ay < o.y + o.h) {
          this.alive = false;
          this.running = false;
        }
      }

      // Coin collection
      for (const c of this.coins) {
        if (c.collected) continue;
        const cx = c.x - this.scrollX;
        if (Math.abs(ax + aw / 2 - cx) < 25 && Math.abs(ay + ah / 2 - c.y) < 25) {
          c.collected = true;
          this.score += 10;
        }
      }

      // Clean old offscreen
      this.obstacles = this.obstacles.filter(o => o.x - this.scrollX > -50);
      this.coins = this.coins.filter(c => c.x - this.scrollX > -50);
    }
  }

  draw() {
    const areaH = CFG.H - CFG.tabH - CFG.infoH;

    // Game area (left)
    this.drawGame(0, 0, CFG.gameW, areaH);

    // NN panel (right)
    this.drawNNPanel(CFG.gameW, 0, CFG.nnW, areaH);

    // Controls
    this.drawControls();
  }

  drawGame(x, y, w, h) {
    push();
    translate(x, y);

    // Sky gradient
    for (let i = 0; i < h - 70; i++) {
      const t = i / (h - 70);
      stroke(lerpColor(color('#0a0a2e'), color('#1a1a4e'), t));
      line(0, i, w, i);
    }

    // Panel border
    noFill();
    stroke(P.panelBd);
    strokeWeight(1);
    rect(0, 0, w, h, 8);
    noStroke();

    // Title
    fill(P.text);
    noStroke();
    textSize(16);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text('🏃 Platformer Runner', w / 2, 10);
    textStyle(NORMAL);

    // Ground
    fill('#1a3a1a');
    noStroke();
    rect(0, this.groundY + 30, w, h - this.groundY - 30);
    fill('#2a5a2a');
    rect(0, this.groundY + 28, w, 3);

    // Draw obstacles
    for (const o of this.obstacles) {
      const ox = o.x - this.scrollX;
      if (ox < -30 || ox > w + 30) continue;
      noStroke();
      if (o.type === 'high') {
        fill('#ff6d00');
        rect(ox, o.y, o.w, o.h, 3);
        // Spike pattern
        fill('#ff1744');
        triangle(ox + o.w / 2, o.y - 8, ox + 3, o.y, ox + o.w - 3, o.y);
      } else if (o.type === 'double') {
        fill('#ff1744');
        rect(ox, o.y, o.w, o.h, 2);
        // X mark
        stroke('#fff');
        strokeWeight(2);
        line(ox + 4, o.y + 4, ox + o.w - 4, o.y + o.h - 4);
        line(ox + o.w - 4, o.y + 4, ox + 4, o.y + o.h - 4);
        noStroke();
      } else {
        fill('#ff1744');
        rect(ox, o.y, o.w, o.h, 2);
      }
    }

    // Draw coins
    for (const c of this.coins) {
      if (c.collected) continue;
      const cx = c.x - this.scrollX;
      if (cx < -20 || cx > w + 20) continue;
      const pulse = Math.sin(millis() * 0.008 + c.x) * 2;
      fill(P.coin);
      noStroke();
      ellipse(cx, c.y + pulse, 16, 16);
      fill('#fff');
      textSize(8);
      textAlign(CENTER, CENTER);
      text('$', cx, c.y + pulse);
    }

    // Draw agent
    const agentPx = this.agentX;
    const agentPy = this.agentY;

    // Glow
    noStroke();
    fill(0, 229, 255, this.lastJump ? 80 : 40);
    ellipse(agentPx + 10, agentPy + 15, 55, 55);

    // Body (larger, more prominent)
    fill(P.agent);
    stroke(255, 255, 255, 120);
    strokeWeight(2);
    rect(agentPx - 4, agentPy - 4, 28, 38, 6);

    // Eyes (larger)
    fill(255);
    noStroke();
    ellipse(agentPx + 3, agentPy + 10, 7, 7);
    ellipse(agentPx + 17, agentPy + 10, 7, 7);
    fill('#0a0a14');
    ellipse(agentPx + 4, agentPy + 11, 3, 3);
    ellipse(agentPx + 18, agentPy + 11, 3, 3);

    // Jump trail
    if (!this.isGrounded) {
      fill(0, 229, 255, 40);
      noStroke();
      for (let i = 1; i <= 3; i++) {
        ellipse(agentPx + 10, agentPy + 30 + i * 8, 8 - i * 2, 8 - i * 2);
      }
    }

    // Stats
    fill(P.text);
    noStroke();
    textSize(13);
    textAlign(LEFT, TOP);
    text(`Score: ${this.score}`, 15, 40);
    text(`Distance: ${Math.floor(this.distance / 10)}m`, 15, 58);

    // GAME OVER overlay
    if (!this.alive) {
      fill(0, 0, 0, 150);
      noStroke();
      rect(0, 0, w, h - 70);

      fill(P.spike);
      textSize(32);
      textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text('GAME OVER', w / 2, h / 2 - 40);

      fill(P.text);
      textSize(14);
      textStyle(NORMAL);
      text(`Score: ${this.score}  |  Distance: ${Math.floor(this.distance / 10)}m`, w / 2, h / 2);

      // Reset button in overlay
      const goBtnW = 120, goBtnH = 40;
      const goBtnX = w / 2 - goBtnW / 2;
      const goBtnY = h / 2 + 25;
      this.gameOverBtn = { x: goBtnX, y: goBtnY, w: goBtnW, h: goBtnH };

      const goHover = mouseX >= goBtnX && mouseX <= goBtnX + goBtnW &&
                      (mouseY - CFG.tabH) >= goBtnY && (mouseY - CFG.tabH) <= goBtnY + goBtnH;
      fill(goHover ? P.accent3 : P.panelBg);
      stroke(P.accent3);
      strokeWeight(2);
      rect(goBtnX, goBtnY, goBtnW, goBtnH, 8);
      fill(goHover ? P.bg : P.accent3);
      noStroke();
      textSize(14);
      textStyle(BOLD);
      textAlign(CENTER, CENTER);
      text('🔄 Reset', w / 2, goBtnY + goBtnH / 2);
      textStyle(NORMAL);
    } else {
      this.gameOverBtn = null;
    }

    pop();
  }

  drawNNPanel(x, y, w, h) {
    push();
    translate(x, y);

    fill(P.panelBg);
    noStroke();
    rect(0, 0, w, h, 0, 0, 0, 8);

    fill(CFG.sceneColors[CFG.scene]);
    rect(0, 0, 3, h, 0);

    fill(P.text);
    textSize(14);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text('🧠 Neural Network', w / 2, 10);
    textStyle(NORMAL);

    drawNNVis(this.nn, w / 2, h / 2 - 20, w - 60, h - 140, -1, P.accent3);

    // Labels
    const inputLabels = ['obs dist', 'obs level', 'coin dist', 'coin high', 'grounded'];
    const nL = this.nn.sizes.length;
    const lSp = (w - 60) / (nL - 1);
    const nS0 = this.nn.sizes[0];
    const nSp0 = Math.min(40, (h - 140) / (nS0 + 1));
    const sY = h / 2 - 20 - (nS0 - 1) * nSp0 / 2;

    fill(P.textDim);
    textSize(9);
    textAlign(RIGHT, CENTER);
    for (let i = 0; i < inputLabels.length; i++) {
      text(inputLabels[i], w / 2 - (w - 60) / 2 - 8, sY + i * nSp0);
    }

    const outLabels = ['Jump', 'Stay'];
    const nSL = this.nn.sizes[nL - 1];
    const nSpL = Math.min(40, (h - 140) / (nSL + 1));
    const sYL = h / 2 - 20 - (nSL - 1) * nSpL / 2;

    textAlign(LEFT, CENTER);
    for (let i = 0; i < outLabels.length; i++) {
      text(outLabels[i], w / 2 + (w - 60) / 2 + 8, sYL + i * nSpL);
    }

    // Decision highlight
    if (this.nn.activations.length > 0) {
      const outAct = this.nn.activations[this.nn.activations.length - 1];
      const chosen = outAct[0] > outAct[1] ? 0 : 1;
      fill(P.accent3);
      textSize(11);
      text(chosen === 0 ? ' ← JUMP!' : ' ← STAY', w / 2 + (w - 60) / 2 + 60, sYL + chosen * nSpL);
    }

    pop();
  }

  drawControls() {
    const areaH = CFG.H - CFG.tabH - CFG.infoH;
    const y = areaH - 50;
    const btnW = 100;
    const btnH = 40;
    const gap = 16;
    const totalW = btnW * 2 + gap;
    const startX = 16;

    const btn1 = { x: startX, y, w: btnW, h: btnH, label: this.running ? '⏸ Stop' : '▶ Start', color: this.running ? P.accent2 : P.accent3 };
    drawBtn(btn1);

    const btn3 = { x: startX + btnW + gap, y, w: btnW, h: btnH, label: '🔄 Reset', color: P.accent2 };
    drawBtn(btn3);

    // Speed buttons
    const spdBtnW = 48, spdGap = 8;
    const spdLabels = ['1x', '3x', '5x', 'MAX'];
    const totalSpdW = spdLabels.length * spdBtnW + (spdLabels.length - 1) * spdGap;
    const spdX = CFG.gameW - 16 - totalSpdW;
    fill(P.textDim);
    textSize(12);
    textStyle(BOLD);
    textAlign(RIGHT, CENTER);
    text('Speed:', spdX - 8, y + btnH / 2);
    textStyle(NORMAL);
    for (let i = 0; i < spdLabels.length; i++) {
      const bx = spdX + i * (spdBtnW + spdGap);
      const active = this.trainSpeed === this.speedBtns[i];
      fill(active ? P.accent3 : P.muted);
      noStroke();
      rect(bx, y, spdBtnW, btnH, 6);
      fill(active ? P.bg : P.textDim);
      textSize(13);
      textStyle(active ? BOLD : NORMAL);
      textAlign(CENTER, CENTER);
      text(spdLabels[i], bx + spdBtnW / 2, y + btnH / 2);
    }
    textStyle(NORMAL);

    this.btns = [btn1, btn3];
  }

  handleClick(mx, my) {
    if (!this.btns) return;
    // Check game over reset button
    if (this.gameOverBtn && !this.alive) {
      const gb = this.gameOverBtn;
      if (mx >= gb.x && mx <= gb.x + gb.w && my >= gb.y && my <= gb.y + gb.h) {
        this.reset();
        return;
      }
    }
    for (let i = 0; i < this.btns.length; i++) {
      const b = this.btns[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (i === 0) this.running = !this.running;
        if (i === 1) this.reset();
      }
    }
    // Speed buttons
    if (this.speedBtns) {
      const spdBtnW2 = 48, spdGap2 = 8;
      const totalSpdW2 = this.speedBtns.length * spdBtnW2 + (this.speedBtns.length - 1) * spdGap2;
      const spdX2 = CFG.gameW - 16 - totalSpdW2;
      const areaH2 = CFG.H - CFG.tabH - CFG.infoH;
      const y2 = areaH2 - 50;
      for (let i = 0; i < this.speedBtns.length; i++) {
        const bx = spdX2 + i * (spdBtnW2 + spdGap2);
        if (mx >= bx && mx <= bx + spdBtnW2 && my >= y2 && my <= y2 + 40) {
          this.trainSpeed = this.speedBtns[i];
        }
      }
    }
  }
}

// ============================================================
// SCENE 3: RACING CAR (RL Learning)
// ============================================================
class SceneRacing {
  constructor() {
    this.reset();
  }

  reset() {
    this.nn = new NeuralNetwork([5, 8, 5]);
    this.bestNN = null;
    this.bestScore = -Infinity;

    // Car state
    this.carX = 0;
    this.carY = 0;
    this.carAngle = 0;
    this.carSpeed = 0;
    this.maxSpeed = 4;
    this.accel = 0.15;
    this.friction = 0.98;
    this.steerAmount = 0.05;

    // Track: simple oval
    this.trackCx = 300;
    this.trackCy = 230;
    this.trackRx = 220;
    this.trackRy = 160;
    this.trackWidth = 50;

    // Sensors
    this.sensorAngles = [-0.6, -0.3, 0, 0.3, 0.6];
    this.sensorLength = 120;
    this.sensorHits = new Array(5).fill(1);

    // Learning
    this.episode = 0;
    this.episodeReward = 0;
    this.totalReward = 0;
    this.rewardHistory = [];
    this.running = false;
    this.paused = false;
    this.trainSpeed = 1;
    this.stepTimer = 0;
    this.stepInterval = 16;
    this.lapCount = 0;
    this.lapDist = 0;
    this.lastLapDist = 0;
    this.totalDist = 0;

    // Q-learning simplified
    this.qTable = {};
    this.lr = 0.1;
    this.gamma = 0.95;
    this.epsilon = 1.0;
    this.epsilonDecay = 0.995;
    this.minEpsilon = 0.05;

    // Ghost
    this.ghostPath = [];

    // Init car position
    this.resetCar();

    infoText = 'Scene 3: Racing Car — RL Learning\nAI learns to drive around the track via Reinforcement Learning: try → get reward → adjust weights\nPress [▶ Learn] and watch the reward curve gradually improve | [Space] Stop | [R] Reset';
  }

  resetCar() {
    // Start at bottom of oval, facing right
    this.carX = this.trackCx;
    this.carY = this.trackCy + this.trackRy;
    this.carAngle = 0;
    this.carSpeed = 1;
    this.episodeReward = 0;
    this.lapDist = 0;
  }

  getTrackDistance(x, y) {
    // Distance around the track (parametric angle)
    const dx = (x - this.trackCx) / this.trackRx;
    const dy = (y - this.trackCy) / this.trackRy;
    return Math.atan2(dy, dx);
  }

  isOnTrack(x, y) {
    const dx = (x - this.trackCx) / this.trackRx;
    const dy = (y - this.trackCy) / this.trackRy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Track is a ring: inner ~0.6, outer ~1.2
    const halfW = this.trackWidth / (this.trackRx + this.trackRy) * 2;
    return dist > 0.55 - halfW && dist < 1.25 + halfW;
  }

  castSensor(angle) {
    const a = this.carAngle + angle;
    for (let d = 10; d < this.sensorLength; d += 5) {
      const sx = this.carX + Math.cos(a) * d;
      const sy = this.carY + Math.sin(a) * d;
      if (!this.isOnTrack(sx, sy)) {
        return d / this.sensorLength;
      }
    }
    return 1;
  }

  updateSensors() {
    for (let i = 0; i < this.sensorAngles.length; i++) {
      this.sensorHits[i] = this.castSensor(this.sensorAngles[i]);
    }
  }

  getInputs() {
    this.updateSensors();
    const curvature = Math.sin(this.carAngle) * 0.5; // simplified
    return [
      ...this.sensorHits,
    ];
  }

  getStateKey(inputs) {
    // Discretize for Q-table
    return inputs.map(v => Math.round(v * 5) / 5).join(',');
  }

  qLearn(state, action, reward, nextState) {
    const sKey = this.getStateKey(state);
    const nsKey = this.getStateKey(nextState);

    if (!this.qTable[sKey]) this.qTable[sKey] = new Array(5).fill(0);
    if (!this.qTable[nsKey]) this.qTable[nsKey] = new Array(5).fill(0);

    const maxQ = Math.max(...this.qTable[nsKey]);
    const oldQ = this.qTable[sKey][action];
    const newQ = oldQ + this.lr * (reward + this.gamma * maxQ - oldQ);
    this.qTable[sKey][action] = newQ;

    // Also adjust NN weights to approximate Q-table
    const delta = (newQ - oldQ) * 0.01;
    for (let l = 0; l < this.nn.weights.length; l++) {
      for (let j = 0; j < this.nn.weights[l].length; j++) {
        for (let k = 0; k < this.nn.weights[l][j].length; k++) {
          this.nn.weights[l][j][k] += delta * (Math.random() * 0.5 + 0.5);
          this.nn.weights[l][j][k] = Math.max(-2, Math.min(2, this.nn.weights[l][j][k]));
        }
      }
    }
  }

  chooseAction(inputs) {
    const sKey = this.getStateKey(inputs);

    // Epsilon-greedy
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * 5);
    }

    if (!this.qTable[sKey]) return 2; // default: straight
    let best = 0;
    for (let i = 1; i < 5; i++) {
      if (this.qTable[sKey][i] > this.qTable[sKey][best]) best = i;
    }
    return best;
  }

  update() {
    if (!this.running || this.paused) return;

    for (let s = 0; s < this.trainSpeed; s++) {
      this.stepTimer += deltaTime;
      if (this.stepTimer < this.stepInterval) break;
      this.stepTimer = 0;
      this.doStep();
    }
  }

  doStep() {
    const inputs = this.getInputs();
    const action = this.chooseAction(inputs);

    // Action: 0=straight, 1=slight right, 2=hard right, 3=slight left, 4=hard left
    const steerMap = [0, 0.03, 0.06, -0.03, -0.06];
    this.carAngle += steerMap[action];

    // Accelerate
    this.carSpeed += this.accel;
    this.carSpeed = Math.min(this.carSpeed, this.maxSpeed);

    // Move
    const newX = this.carX + Math.cos(this.carAngle) * this.carSpeed;
    const newY = this.carY + Math.sin(this.carAngle) * this.carSpeed;

    // Reward calculation
    let reward = 0;

    if (this.isOnTrack(newX, newY)) {
      this.carX = newX;
      this.carY = newY;
      reward = 0.1 + this.carSpeed * 0.05; // reward for moving fast on track
      this.totalDist += this.carSpeed;

      // Check lap progress
      const newAngle = this.getTrackDistance(newX, newY);
      this.lapDist += Math.abs(newAngle - this.lastLapDist);
      if (this.lapDist > Math.PI * 1.8) {
        // Completed a lap!
        this.lapCount++;
        reward += 10;
        this.lapDist = 0;
      }
      this.lastLapDist = newAngle;
    } else {
      // Off track — penalty
      reward = -2;
      this.carSpeed *= 0.5;
      // Push back on track
      this.carX -= Math.cos(this.carAngle) * this.carSpeed * 3;
      this.carY -= Math.sin(this.carAngle) * this.carSpeed * 3;
    }

    this.episodeReward += reward;

    // Q-learning update
    const nextInputs = this.getInputs();
    this.qLearn(inputs, action, reward, nextInputs);

    // Run NN forward for visualization
    this.nn.forward(inputs);

    // Track max Q for weight visualization
    if (this.episodeReward > this.bestScore) {
      this.bestScore = this.episodeReward;
      this.bestNN = this.nn.copy();
    }

    // Ghost path
    if (this.lapCount > 0) {
      this.ghostPath.push({ x: this.carX, y: this.carY });
      if (this.ghostPath.length > 500) this.ghostPath.shift();
    }

    // Episode end (max steps or too many penalties)
    if (this.totalDist > 5000 || this.episodeReward < -50) {
      this.endEpisode();
    }
  }

  endEpisode() {
    this.rewardHistory.push(this.episodeReward);
    if (this.rewardHistory.length > 100) this.rewardHistory.shift();

    this.episode++;
    this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
    this.totalReward += this.episodeReward;
    this.resetCar();
    this.totalDist = 0;
    this.lastLapDist = this.getTrackDistance(this.carX, this.carY);
  }

  togglePause() { this.paused = !this.paused; }

  draw() {
    const areaH = CFG.H - CFG.tabH - CFG.infoH;

    this.drawTrack(0, 0, CFG.gameW, areaH);
    this.drawNNPanel(CFG.gameW, 0, CFG.nnW, areaH);
    this.drawControls();
  }

  drawTrack(x, y, w, h) {
    push();
    translate(x, y);

    // Panel border
    noFill();
    stroke(P.panelBd);
    strokeWeight(1);
    rect(0, 0, w, h, 8);
    noStroke();

    // Title
    fill(P.text);
    noStroke();
    textSize(16);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text('🏎 Racing — RL Learning', w / 2, 10);
    textStyle(NORMAL);

    // Draw track
    const cx = this.trackCx;
    const cy = this.trackCy;

    // Track background (dark)
    noFill();
    stroke(P.wall);
    strokeWeight(this.trackWidth + 10);
    strokeCap(ROUND);
    ellipse(cx, cy, this.trackRx * 2, this.trackRy * 2);

    // Track surface
    stroke('#2a2a3a');
    strokeWeight(this.trackWidth);
    ellipse(cx, cy, this.trackRx * 2, this.trackRy * 2);

    // Center line (dashed)
    stroke(P.muted);
    strokeWeight(1);
    drawingContext.setLineDash([8, 8]);
    ellipse(cx, cy, this.trackRx * 2, this.trackRy * 2);
    drawingContext.setLineDash([]);

    // Ghost path
    if (this.ghostPath.length > 1) {
      stroke(255, 255, 255, 20);
      strokeWeight(2);
      noFill();
      beginShape();
      for (const p of this.ghostPath) {
        vertex(p.x, p.y);
      }
      endShape();
    }

    // Sensor rays
    for (let i = 0; i < this.sensorAngles.length; i++) {
      const a = this.carAngle + this.sensorAngles[i];
      const hitDist = this.sensorHits[i] * this.sensorLength;
      const sx = this.carX + Math.cos(a) * hitDist;
      const sy = this.carY + Math.sin(a) * hitDist;

      stroke(0, 229, 255, 60);
      strokeWeight(1);
      line(this.carX, this.carY, sx, sy);

      // Hit point
      noStroke();
      fill(0, 229, 255, 150);
      ellipse(sx, sy, 4, 4);
    }

    // Car
    push();
    translate(this.carX, this.carY);
    rotate(this.carAngle);

    // Car body
    noStroke();
    fill(P.agent);
    rect(-10, -6, 20, 12, 3);

    // Headlight
    fill(255, 255, 200, 150);
    ellipse(10, 0, 4, 6);
    pop();

    // Stats
    fill(P.text);
    noStroke();
    textSize(12);
    textAlign(LEFT, TOP);
    text(`Episode: ${this.episode}  |  Epsilon: ${this.epsilon.toFixed(3)}`, 15, h - 55);
    text(`Laps: ${this.lapCount}  |  Reward: ${this.episodeReward.toFixed(1)}`, 15, h - 38);
    text(`Best: ${this.bestScore.toFixed(1)}  |  Speed: ${this.trainSpeed}x`, 15, h - 21);

    pop();
  }

  drawNNPanel(x, y, w, h) {
    push();
    translate(x, y);

    fill(P.panelBg);
    noStroke();
    rect(0, 0, w, h, 0, 0, 0, 8);

    fill(CFG.sceneColors[CFG.scene]);
    rect(0, 0, 3, h, 0);

    // NN visualization (top half)
    fill(P.text);
    textSize(14);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text('🧠 Neural Network Weights', w / 2, 10);
    textStyle(NORMAL);

    drawNNVis(this.nn, w / 2, h * 0.3, w - 40, h * 0.35, -1, P.accent4);

    // Sensor labels
    const sLabels = ['L-far', 'L-near', 'Front', 'R-near', 'R-far'];
    fill(P.textDim);
    textSize(9);
    textAlign(RIGHT, CENTER);
    const nSp0 = Math.min(30, (h * 0.35) / 6);
    for (let i = 0; i < sLabels.length; i++) {
      text(sLabels[i], w / 2 - (w - 40) / 2 - 5, h * 0.3 - 2 * nSp0 + i * nSp0);
    }

    // Action labels
    const aLabels = ['Straight', 'Slight R', 'Hard R', 'Slight L', 'Hard L'];
    textAlign(LEFT, CENTER);
    const nSL = this.nn.sizes[this.nn.sizes.length - 1];
    const nSpL = Math.min(30, (h * 0.35) / 6);
    const sYL = h * 0.3 - 2 * nSpL;
    for (let i = 0; i < aLabels.length; i++) {
      text(aLabels[i], w / 2 + (w - 40) / 2 + 5, sYL + i * nSpL);
    }

    // Reward curve (bottom half)
    const graphY = h * 0.6;
    const graphH = h * 0.35;
    const graphX = 30;
    const graphW = w - 60;

    fill(P.text);
    textSize(12);
    textAlign(CENTER, TOP);
    text('📈 Reward Curve', w / 2, graphY);

    if (this.rewardHistory.length > 1) {
      // Axes
      stroke(P.muted);
      strokeWeight(1);
      line(graphX, graphY + 20, graphX, graphY + graphH);
      line(graphX, graphY + graphH, graphX + graphW, graphY + graphH);

      // Find range
      const minR = Math.min(...this.rewardHistory);
      const maxR = Math.max(...this.rewardHistory);
      const range = Math.max(maxR - minR, 1);

      // Draw curve
      stroke(P.accent4);
      strokeWeight(2);
      noFill();
      beginShape();
      for (let i = 0; i < this.rewardHistory.length; i++) {
        const px = graphX + (i / (this.rewardHistory.length - 1)) * graphW;
        const py = graphY + graphH - 20 - ((this.rewardHistory[i] - minR) / range) * (graphH - 30);
        vertex(px, py);
      }
      endShape();

      // Moving average
      if (this.rewardHistory.length > 5) {
        stroke(P.accent3);
        strokeWeight(2);
        beginShape();
        for (let i = 4; i < this.rewardHistory.length; i++) {
          let sum = 0;
          for (let j = i - 4; j <= i; j++) sum += this.rewardHistory[j];
          const avg = sum / 5;
          const px = graphX + (i / (this.rewardHistory.length - 1)) * graphW;
          const py = graphY + graphH - 20 - ((avg - minR) / range) * (graphH - 30);
          vertex(px, py);
        }
        endShape();
      }

      // Labels
      fill(P.textDim);
      noStroke();
      textSize(9);
      textAlign(RIGHT, TOP);
      text(maxR.toFixed(0), graphX - 3, graphY + 20);
      text(minR.toFixed(0), graphX - 3, graphY + graphH - 15);
    } else {
      fill(P.textDim);
      textSize(11);
      textAlign(CENTER, CENTER);
      text('Press "Learn" to start RL training', w / 2, graphY + graphH / 2);
    }

    pop();
  }

  drawControls() {
    const areaH = CFG.H - CFG.tabH - CFG.infoH;
    const y = areaH - 50;
    const btnW = 100;
    const btnH = 40;
    const gap = 16;
    const totalW = btnW * 2 + gap;
    const startX = 16;

    const btn1 = { x: startX, y, w: btnW, h: btnH,
      label: this.running ? '⏸ Stop' : '▶ Learn',
      color: this.running ? P.accent2 : P.accent3 };
    drawBtn(btn1);

    const btn2 = { x: startX + btnW + gap, y, w: btnW, h: btnH,
      label: '🔄 Reset', color: P.accent2 };
    drawBtn(btn2);

    // Speed buttons — clearly labeled
    const speedLabels = ['1x', '3x', '5x', 'MAX'];
    const speeds = [1, 3, 5, 10];
    const spdBtnW = 48;
    const spdGap = 8;
    const totalSpdW = speeds.length * spdBtnW + (speeds.length - 1) * spdGap;
    const spdX = CFG.gameW - 16 - totalSpdW;

    fill(P.textDim);
    textSize(12);
    textStyle(BOLD);
    textAlign(RIGHT, CENTER);
    text('Speed:', spdX - 8, y + btnH / 2);
    textStyle(NORMAL);

    for (let i = 0; i < speeds.length; i++) {
      const bx = spdX + i * (spdBtnW + spdGap);
      const active = this.trainSpeed === speeds[i];
      fill(active ? P.accent4 : P.muted);
      noStroke();
      rect(bx, y, spdBtnW, btnH, 6);
      fill(active ? P.bg : P.textDim);
      textSize(13);
      textStyle(active ? BOLD : NORMAL);
      textAlign(CENTER, CENTER);
      text(speedLabels[i], bx + spdBtnW / 2, y + btnH / 2);
    }
    textStyle(NORMAL);

    // Prominent episode counter
    fill(P.accent4);
    textSize(14);
    textStyle(BOLD);
    textAlign(CENTER, TOP);
    text(`EP ${this.episode}`, CFG.gameW / 2, y - 18);
    textStyle(NORMAL);

    this.btns = [btn1, btn2];
    this.speedBtns = speeds;
  }

  handleClick(mx, my) {
    if (!this.btns) return;
    for (let i = 0; i < this.btns.length; i++) {
      const b = this.btns[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (i === 0) this.running = !this.running;
        if (i === 1) this.reset();
      }
    }

    // Speed buttons
    if (this.speedBtns) {
      const areaH2 = CFG.H - CFG.tabH - CFG.infoH;
      const spdBtnW = 48, spdGap = 8;
      const totalSpdW = this.speedBtns.length * spdBtnW + (this.speedBtns.length - 1) * spdGap;
      const spdX = CFG.gameW - 16 - totalSpdW;
      const y2 = areaH2 - 50;
      for (let i = 0; i < this.speedBtns.length; i++) {
        const bx = spdX + i * (spdBtnW + spdGap);
        if (mx >= bx && mx <= bx + spdBtnW && my >= y2 && my <= y2 + 40) {
          this.trainSpeed = this.speedBtns[i];
        }
      }
    }
  }
}

// ============================================================
// SCENE 4: RULE vs DEEP LEARNING
// ============================================================
class SceneCompare {
  constructor() {
    this.reset();
  }

  reset() {
    this.nn = new NeuralNetwork([5, 8, 3]);

    // Rule-based agent state
    this.rule = {
      x: 80, y: 0, lane: 0, // 0=top, 1=bottom
      score: 0, alive: true, survivalTime: 0, deaths: 0,
      scrollX: 0, obstacles: [], coins: [],
      spawnTimer: 0
    };

    // NN agent state
    this.ai = {
      x: 80, y: 0, lane: 0,
      score: 0, alive: true, survivalTime: 0, deaths: 0,
      scrollX: 0, obstacles: [], coins: [],
      spawnTimer: 0
    };

    this.running = false;
    this.gameTimer = 0;
    this.maxTime = 30 * 60; // 30 seconds at 60fps
    this.trainSpeed = 1;
    this.speedBtns = [1, 3, 5, 10];

    this.initObstacles(this.rule);
    this.initObstacles(this.ai);
    this.alive = true;

    infoText = 'Scene 4: Rule-based vs Deep Learning — Compare 2 AI approaches\nLeft: Rule-based (hardcoded rules) vs Right: Deep Learning (NN learned)\nPress [▶ Start] to compare — see which scenarios Rule-based can\'t handle';
  }

  initObstacles(agent) {
    agent.obstacles = [];
    agent.coins = [];
    for (let i = 0; i < 30; i++) {
      this.spawnObstacleFor(agent, 400 + i * 250);
      if (Math.random() < 0.5) {
        agent.coins.push({
          x: 350 + i * 250 + Math.random() * 100,
          lane: Math.floor(Math.random() * 2),
          collected: false
        });
      }
    }
  }

  spawnObstacleFor(agent, x) {
    // Types: tall (must switch lane), low (pass through), double (both lanes, must jump), pattern (alternating)
    const r = Math.random();
    let type, lane;
    if (r < 0.3) {
      type = 'tall';
      lane = Math.floor(Math.random() * 2);
    } else if (r < 0.5) {
      type = 'low';
      lane = Math.floor(Math.random() * 2);
    } else if (r < 0.7) {
      type = 'double';
      lane = -1; // both lanes
    } else {
      type = 'pattern';
      lane = Math.floor(Math.random() * 2);
    }
    agent.obstacles.push({ x, type, lane, passed: false });
  }

  ruleBasedAction(agent) {
    // Find nearest obstacle ahead
    let nearest = null;
    let nearDist = Infinity;
    for (const o of agent.obstacles) {
      const dist = o.x - agent.scrollX;
      if (dist > 0 && dist < nearDist) {
        nearDist = dist;
        nearest = o;
      }
    }

    if (!nearest) return 'stay';

    if (nearDist < 120) {
      if (nearest.type === 'tall') {
        // Must switch lane
        if (nearest.lane === agent.lane) {
          return nearest.lane === 0 ? 'down' : 'up';
        }
        return 'stay';
      }
      if (nearest.type === 'double') {
        // Both lanes — rule-based CAN'T handle this!
        // It just stays and dies
        return 'stay';
      }
      if (nearest.type === 'low') {
        return 'stay'; // can pass through
      }
      if (nearest.type === 'pattern') {
        // Pattern: checks current obstacle but not the next one
        if (nearest.lane === agent.lane) {
          return nearest.lane === 0 ? 'down' : 'up';
        }
        return 'stay';
      }
    }

    // Check coins (simple: go towards coin in different lane)
    for (const c of agent.coins) {
      if (c.collected) continue;
      const dist = c.x - agent.scrollX;
      if (dist > 0 && dist < 150 && c.lane !== agent.lane) {
        return c.lane === 0 ? 'up' : 'down';
      }
    }

    return 'stay';
  }

  nnBasedAction(agent) {
    // Get inputs
    let nearObsDist = 1, nearObsType = 0, nearObsLane = -1;
    let nearCoinDist = 1, nearCoinLane = -1;

    for (const o of agent.obstacles) {
      const dist = (o.x - agent.scrollX) / 200;
      if (dist > -0.1 && dist < nearObsDist && dist > 0) {
        nearObsDist = dist;
        nearObsType = o.type === 'tall' ? 0.33 : o.type === 'double' ? 0.66 : o.type === 'pattern' ? 1 : 0;
        nearObsLane = o.lane;
      }
    }

    for (const c of agent.coins) {
      if (c.collected) continue;
      const dist = (c.x - agent.scrollX) / 200;
      if (dist > -0.1 && dist < nearCoinDist && dist > 0) {
        nearCoinDist = dist;
        nearCoinLane = c.lane;
      }
    }

    const inputs = [
      nearObsDist,
      nearObsType,
      nearObsLane >= 0 ? nearObsLane : 0.5,
      nearCoinDist,
      nearCoinLane >= 0 ? nearCoinLane : 0.5
    ];

    const output = this.nn.forward(inputs);
    let best = 0;
    for (let i = 1; i < 3; i++) {
      if (output[i] > output[best]) best = i;
    }
    return best === 0 ? 'up' : best === 1 ? 'down' : 'stay';
  }

  updateAgent(agent, isRule) {
    if (!this.running || !agent.alive) return;

    agent.survivalTime++;
    agent.scrollX += 2.5;

    // Get action
    const action = isRule ? this.ruleBasedAction(agent) : this.nnBasedAction(agent);

    if (action === 'up' && agent.lane > 0) agent.lane--;
    if (action === 'down' && agent.lane < 1) agent.lane++;

    // Y position based on lane
    const targetY = agent.lane === 0 ? 140 : 260;
    agent.y += (targetY - agent.y) * 0.15;

    // Collision
    for (const o of agent.obstacles) {
      const dist = o.x - agent.scrollX;
      if (dist > -15 && dist < 25 && !o.passed) {
        let hit = false;
        if (o.type === 'tall' && o.lane === agent.lane) hit = true;
        if (o.type === 'double') hit = true; // both lanes
        if (o.type === 'pattern' && o.lane === agent.lane) hit = true;
        // low: no hit

        if (hit) {
          agent.alive = false;
          agent.deaths++;
          // Respawn after delay
          setTimeout(() => {
            agent.alive = true;
            agent.lane = 0;
            agent.y = 140;
          }, 1000);
        }
        if (dist < -15) o.passed = true;
      }
    }

    // Coin collection
    for (const c of agent.coins) {
      if (c.collected) continue;
      const dist = c.x - agent.scrollX;
      if (dist > -15 && dist < 25 && c.lane === agent.lane) {
        c.collected = true;
        agent.score += 10;
      }
    }

    // Spawn more
    agent.spawnTimer++;
    if (agent.spawnTimer > 100) {
      agent.spawnTimer = 0;
      const lastX = agent.obstacles.length > 0 ? Math.max(...agent.obstacles.map(o => o.x)) : agent.scrollX + 400;
      this.spawnObstacleFor(agent, lastX + 200 + Math.random() * 150);
      agent.coins.push({
        x: lastX + 150 + Math.random() * 200,
        lane: Math.floor(Math.random() * 2),
        collected: false
      });
    }
  }

  update() {
    if (!this.running) return;

    for (let s = 0; s < this.trainSpeed; s++) {
      if (!this.running) break;
      this.gameTimer++;
      this.updateAgent(this.rule, true);
      this.updateAgent(this.ai, false);

      // Auto-stop after maxTime
      if (this.gameTimer >= this.maxTime) {
        this.running = false;
      }
    }
  }

  draw() {
    const areaH = CFG.H - CFG.tabH - CFG.infoH;
    const halfW = CFG.W / 2;

    // Rule-based (left)
    this.drawRunner(0, 0, halfW, areaH, this.rule, '📋 Rule-based AI', P.accent2, true);

    // NN-based (right)
    this.drawRunner(halfW, 0, halfW, areaH, this.ai, '🧠 Deep Learning AI', P.accent3, false);

    // Center divider line
    stroke(P.muted);
    strokeWeight(3);
    line(halfW, 0, halfW, areaH);

    // Dashed glow on divider
    const gc4 = color(P.accent4);
    drawingContext.setLineDash([4, 8]);
    stroke(red(gc4), green(gc4), blue(gc4), 100);
    strokeWeight(1);
    line(halfW, 0, halfW, areaH);
    drawingContext.setLineDash([]);
    noStroke();

    // VS badge
    fill(P.bg);
    stroke(P.accent4);
    strokeWeight(2);
    ellipse(halfW, areaH / 2, 50, 50);
    fill(P.accent4);
    noStroke();
    textSize(16);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('VS', halfW, areaH / 2);
    textStyle(NORMAL);

    // Controls
    this.drawControls();
  }

  drawRunner(x, y, w, h, agent, title, agentColor, isRule) {
    push();
    translate(x, y);

    // Background
    fill(P.floor);
    noStroke();
    rect(0, 0, w, h);

    // Title
    fill(agentColor);
    textSize(14);
    textAlign(CENTER, TOP);
    text(title, w / 2, 8);

    // Lane backgrounds
    fill('#0e0e24');
    rect(20, 120, w - 40, 60, 5);
    rect(20, 240, w - 40, 60, 5);

    // Lane labels
    fill(P.textDim);
    textSize(10);
    textAlign(LEFT, CENTER);
    text('LANE 1', 25, 150);
    text('LANE 2', 25, 270);

    // Draw obstacles
    for (const o of agent.obstacles) {
      const ox = o.x - agent.scrollX;
      if (ox < -30 || ox > w + 30) continue;

      if (o.type === 'tall') {
        const oy = o.lane === 0 ? 125 : 245;
        fill(P.spike);
        noStroke();
        rect(ox, oy, 25, 50, 3);
        // Warning stripes
        fill(255, 255, 255, 40);
        for (let s = 0; s < 50; s += 12) {
          rect(ox, oy + s, 25, 4);
        }
      } else if (o.type === 'double') {
        fill('#ff1744');
        noStroke();
        rect(ox, 125, 25, 50, 3);
        rect(ox, 245, 25, 50, 3);
        // X pattern
        stroke('#fff');
        strokeWeight(2);
        line(ox + 3, 128, ox + 22, 172);
        line(ox + 22, 128, ox + 3, 172);
        line(ox + 3, 248, ox + 22, 292);
        line(ox + 22, 248, ox + 3, 292);
        noStroke();
      } else if (o.type === 'low') {
        const oy = o.lane === 0 ? 155 : 275;
        fill('#4caf50');
        noStroke();
        rect(ox, oy, 25, 15, 2);
      } else if (o.type === 'pattern') {
        const oy = o.lane === 0 ? 125 : 245;
        fill('#ff9100');
        noStroke();
        rect(ox, oy, 25, 50, 3);
        // Zigzag
        stroke('#fff');
        strokeWeight(1);
        for (let s = 0; s < 50; s += 10) {
          line(ox, oy + s, ox + 12, oy + s + 5);
          line(ox + 12, oy + s + 5, ox + 25, oy + s + 10);
        }
        noStroke();
      }
    }

    // Draw coins
    for (const c of agent.coins) {
      if (c.collected) continue;
      const cx = c.x - agent.scrollX;
      if (cx < -15 || cx > w + 15) continue;
      const cy = c.lane === 0 ? 150 : 270;
      fill(P.coin);
      noStroke();
      ellipse(cx, cy, 14, 14);
      fill('#000');
      textSize(7);
      textAlign(CENTER, CENTER);
      text('$', cx, cy);
    }

    // Draw agent
    if (agent.alive) {
      const ax = agent.x;
      const ay = agent.y || 150;

      // Glow
      noStroke();
      const gc2 = color(P.muted);
      fill(red(gc2), green(gc2), blue(gc2), 0);
      fill(agentColor);
      noStroke();
      const gc3 = color(agentColor);
      fill(red(gc3), green(gc3), blue(gc3), 30);
      ellipse(ax + 12, ay + 25, 50, 50);

      // Body
      fill(agentColor);
      stroke(255, 255, 255, 80);
      strokeWeight(1.5);
      rect(ax, ay, 24, 50, 6);

      // Face
      fill(255);
      noStroke();
      ellipse(ax + 8, ay + 18, 6, 6);
      ellipse(ax + 16, ay + 18, 6, 6);
      fill(P.bg);
      ellipse(ax + 9, ay + 19, 3, 3);
      ellipse(ax + 17, ay + 19, 3, 3);
    } else {
      // Death indicator
      fill(P.spike);
      noStroke();
      textSize(30);
      textAlign(CENTER, CENTER);
      text('💀', agent.x + 12, 200);
    }

    // Stats panel at bottom (shifted up to avoid overlap with controls)
    fill(0, 0, 0, 100);
    noStroke();
    rect(10, h - 110, w - 20, 55, 6);

    fill(agentColor);
    textSize(11);
    textStyle(BOLD);
    textAlign(LEFT, TOP);
    text('SCORE', 20, h - 104);
    textStyle(NORMAL);
    fill(P.text);
    textSize(14);
    textStyle(BOLD);
    text(`${agent.score}`, 20, h - 90);

    fill(agentColor);
    textSize(11);
    textStyle(BOLD);
    text('DEATHS', 100, h - 104);
    textStyle(NORMAL);
    fill(P.text);
    textSize(14);
    textStyle(BOLD);
    text(`${agent.deaths}`, 100, h - 90);

    fill(agentColor);
    textSize(11);
    textStyle(BOLD);
    text('SURVIVAL', 180, h - 104);
    textStyle(NORMAL);
    fill(P.text);
    textSize(14);
    textStyle(BOLD);
    text(`${(agent.survivalTime / 60).toFixed(1)}s`, 180, h - 90);
    textStyle(NORMAL);

    // Legend
    fill(P.textDim);
    textSize(9);
    textAlign(LEFT, TOP);
    const legY = 330;
    fill(P.spike);
    rect(w - 130, legY, 10, 10, 2);
    fill(P.textDim);
    text('= Tall (must switch lane)', w - 115, legY);

    fill('#ff1744');
    rect(w - 130, legY + 15, 10, 10, 2);
    fill(P.textDim);
    text('= Double (both lanes)', w - 115, legY + 15);

    fill('#4caf50');
    rect(w - 130, legY + 30, 10, 10, 2);
    fill(P.textDim);
    text('= Low (passable)', w - 115, legY + 30);

    fill('#ff9100');
    rect(w - 130, legY + 45, 10, 10, 2);
    fill(P.textDim);
    text('= Pattern (zigzag)', w - 115, legY + 45);

    pop();
  }

  drawControls() {
    const areaH = CFG.H - CFG.tabH - CFG.infoH;
    const y = areaH - 50;
    const btnW = 100;
    const btnH = 40;
    const gap = 16;
    const totalW = btnW * 2 + gap;
    const startX = 16;

    const btn1 = { x: startX, y, w: btnW, h: btnH,
      label: this.running ? '⏸ Stop' : '▶ Start',
      color: this.running ? P.accent2 : P.accent3 };
    drawBtn(btn1);

    const btn2 = { x: startX + btnW + gap, y, w: btnW, h: btnH,
      label: '🔄 Reset', color: P.accent2 };
    drawBtn(btn2);

    // Speed buttons
    const spdBtnW = 48, spdGap = 8;
    const spdLabels = ['1x', '3x', '5x', 'MAX'];
    const totalSpdW = spdLabels.length * spdBtnW + (spdLabels.length - 1) * spdGap;
    const spdX = CFG.W - 16 - totalSpdW;
    fill(P.textDim);
    textSize(12);
    textStyle(BOLD);
    textAlign(RIGHT, CENTER);
    text('Speed:', spdX - 8, y + btnH / 2);
    textStyle(NORMAL);
    for (let i = 0; i < spdLabels.length; i++) {
      const bx = spdX + i * (spdBtnW + spdGap);
      const active = this.trainSpeed === this.speedBtns[i];
      fill(active ? P.accent4 : P.muted);
      noStroke();
      rect(bx, y, spdBtnW, btnH, 6);
      fill(active ? P.bg : P.textDim);
      textSize(13);
      textStyle(active ? BOLD : NORMAL);
      textAlign(CENTER, CENTER);
      text(spdLabels[i], bx + spdBtnW / 2, y + btnH / 2);
    }
    textStyle(NORMAL);

    this.btns = [btn1, btn2];
  }

  handleClick(mx, my) {
    if (!this.btns) return;
    // Check game over reset button
    if (this.gameOverBtn && !this.alive) {
      const gb = this.gameOverBtn;
      if (mx >= gb.x && mx <= gb.x + gb.w && my >= gb.y && my <= gb.y + gb.h) {
        this.reset();
        return;
      }
    }
    for (let i = 0; i < this.btns.length; i++) {
      const b = this.btns[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (i === 0) this.running = !this.running;
        if (i === 1) this.reset();
      }
    }
    // Speed buttons
    if (this.speedBtns) {
      const spdBtnW = 48, spdGap = 8;
      const totalSpdW = this.speedBtns.length * spdBtnW + (this.speedBtns.length - 1) * spdGap;
      const spdX = CFG.W - 16 - totalSpdW;
      const areaH2 = CFG.H - CFG.tabH - CFG.infoH;
      const y2 = areaH2 - 50;
      for (let i = 0; i < this.speedBtns.length; i++) {
        const bx = spdX + i * (spdBtnW + spdGap);
        if (mx >= bx && mx <= bx + spdBtnW && my >= y2 && my <= y2 + 40) {
          this.trainSpeed = this.speedBtns[i];
        }
      }
    }
  }
}

// ============================================================
// UI HELPER: Button
// ============================================================
function drawBtn(b) {
  // Convert screen mouseY to scene coordinates (buttons drawn in translated context)
  const sceneMY = mouseY - CFG.tabH;
  const hover = mouseX >= b.x && mouseX <= b.x + b.w && sceneMY >= b.y && sceneMY <= b.y + b.h;
  const pressed = hover && mouseIsPressed;
  const sc = pressed ? 0.95 : 1.0;

  push();
  translate(b.x + b.w / 2, b.y + b.h / 2);
  scale(sc);
  translate(-(b.x + b.w / 2), -(b.y + b.h / 2));

  // Hover glow
  if (hover) {
    noStroke();
    const gc = color(b.color);
    fill(red(gc), green(gc), blue(gc), 35);
    ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w + 20, b.h + 20);
  }

  // Button body
  fill(hover ? b.color : P.panelBg);
  stroke(b.color);
  strokeWeight(1.5);
  rect(b.x, b.y, b.w, b.h, 8);

  // Text with shadow
  noStroke();
  fill(0, 0, 0, 80);
  textSize(14);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(b.label, b.x + b.w / 2 + 1, b.y + b.h / 2 + 1);
  fill(hover ? P.bg : b.color);
  text(b.label, b.x + b.w / 2, b.y + b.h / 2);
  textStyle(NORMAL);

  pop();
}
