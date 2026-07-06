/**
 * MetaProgression.js — Permanent upgrade talent tree for Project Nebula.
 *
 * Manages out-of-run upgrades purchased with 'Cores' currency (earned
 * during runs from boss kills and rare scrap drops).
 *
 * Persists to localStorage under key 'nebula_meta'.
 *
 * @module MetaProgression
 */

// ──────────────────────────────────────────────
// Talent tree definition
// ──────────────────────────────────────────────

/** Default cost curve: first level = 2, then level*2 per additional level. */
function defaultCost(level) {
  if (level === 0) return 2; // buying first rank
  return (level + 1) * 2; // level 1→2 costs 4, 2→3 costs 6, etc.
}

/**
 * Standard colour palette for the tree UI.
 */
const COLORS = {
  bg:             '#0b0e1a',
  cardBg:         '#13182b',
  cardBorder:     '#2a3366',
  textPrimary:    '#ffffff',
  textSecondary:  '#8899cc',
  purchased:      '#33ffcc',
  affordable:     '#ffffff',
  locked:         '#4a4a5e',
  backBtn:        '#ff4477',
  coreGold:       '#ffd700',
  dotFilled:      '#33ffcc',
  dotEmpty:       '#4a4a5e',
  scrollbar:      '#2a3366',
  accentCyan:     '#33ffff',
};

/**
 * Icon → simple 1-2 char label used when drawing onto a 400-wide canvas.
 */
const ICONS = {
  moveSpeed:     '⚡',
  magnetRadius:  '🧲',
  startingShield:'🛡',
  startingHp:    '❤',
  scrapMagnet:   '★',
  coreMagnet:    '◆',
  fireRate:      '▶',
  damageBoost:   '⚔',
};

/**
 * Node definitions.
 * Each node has:
 *   id          – unique key used in state and lookups
 *   name        – human-readable short name
 *   description – longer tooltip text
 *   icon        – emoji / short label
 *   maxLevel    – total ranks purchasable
 *   costFn      – function(currentLevel) returning core cost for next rank
 *   color       – highlight tint for the card
 *   apply       – function(currentLevel) => partial modifier object
 */
const TREE = [
  {
    id: 'moveSpeed',
    name: 'Move Speed',
    description: 'Permanent +5% movement speed per rank',
    icon: ICONS.moveSpeed,
    maxLevel: 5,
    costFn: defaultCost,
    color: '#33ffcc',
    apply: (level) => ({ moveSpeedBoost: level * 0.05 }),
  },
  {
    id: 'magnetRadius',
    name: 'Scrap Magnet',
    description: '+15% scrap pickup radius per rank',
    icon: ICONS.magnetRadius,
    maxLevel: 3,
    costFn: defaultCost,
    color: '#33ffff',
    apply: (level) => ({ magnetRadiusBoost: level * 0.15 }),
  },
  {
    id: 'startingShield',
    name: 'Starting Shield',
    description: '+1 shield at start of each run per rank',
    icon: ICONS.startingShield,
    maxLevel: 3,
    costFn: defaultCost,
    color: '#66ccff',
    apply: (level) => ({ startingShields: level }),
  },
  {
    id: 'startingHp',
    name: 'Starting HP',
    description: '+1 max HP at start of each run per rank',
    icon: ICONS.startingHp,
    maxLevel: 2,
    costFn: defaultCost,
    color: '#ff4477',
    apply: (level) => ({ startingHpBonus: level }),
  },
  {
    id: 'scrapMagnet',
    name: 'Auto-Magnet',
    description: 'Automatically collect scrap within 30px',
    icon: ICONS.scrapMagnet,
    maxLevel: 1,
    costFn: () => 10,
    color: '#ffd700',
    apply: (level) => ({ scrapMagnetRange: level > 0 ? 30 : 0 }),
  },
  {
    id: 'coreMagnet',
    name: 'Core Magnet',
    description: 'Cores are attracted from 200px away',
    icon: ICONS.coreMagnet,
    maxLevel: 1,
    costFn: () => 15,
    color: '#ff66aa',
    apply: (level) => ({ coreMagnetRange: level > 0 ? 200 : 0 }),
  },
  {
    id: 'fireRate',
    name: 'Fire Rate',
    description: '-5% fire delay per rank (faster shooting)',
    icon: ICONS.fireRate,
    maxLevel: 3,
    costFn: defaultCost,
    color: '#ffaa33',
    apply: (level) => ({ fireRateMultiplier: 1 - level * 0.05 }),
  },
  {
    id: 'damageBoost',
    name: 'Damage Boost',
    description: '+10% weapon damage per rank',
    icon: ICONS.damageBoost,
    maxLevel: 3,
    costFn: defaultCost,
    color: '#ff3355',
    apply: (level) => ({ damageMultiplier: 1 + level * 0.1 }),
  },
];

// ──────────────────────────────────────────────
// MetaProgression class
// ──────────────────────────────────────────────

export default class MetaProgression {
  /**
   * Build the tree index map for O(1) lookups.
   */
  static buildIndex() {
    if (!MetaProgression._index) {
      MetaProgression._index = Object.create(null);
      for (const node of TREE) {
        MetaProgression._index[node.id] = node;
      }
    }
    return MetaProgression._index;
  }

  /**
   * Retrieve a node definition by id.
   */
  static getNode(id) {
    const idx = MetaProgression.buildIndex();
    return idx[id] || null;
  }

  /**
   * @param {object} [initialState] – override default state (testing).
   */
  constructor(initialState) {
    MetaProgression.buildIndex();

    /** Map<nodeId, purchasedLevel> */
    this.purchased = Object.create(null);

    /** Cores currently available to spend. */
    this.cores = 0;

    /** Total cores earned over all time (lifetime). */
    this.totalCoresEarned = 0;

    /** Scroll offset for the talent tree UI (pixels). */
    this.scrollOffset = 0;

    /** Maximum scroll offset (computed during render). */
    this.maxScroll = 0;

    /** If true, meta screen is visible. */
    this.visible = false;

    if (initialState) {
      this._hydrate(initialState);
    } else {
      this.load();
    }
  }

  // ── state helpers ───────────────────────────

  /**
   * Merge a raw state object into this instance.
   * @param {object} raw
   */
  _hydrate(raw) {
    if (raw.purchased && typeof raw.purchased === 'object') {
      // ensure every known node id has a numeric value
      for (const node of TREE) {
        const v = raw.purchased[node.id];
        this.purchased[node.id] = typeof v === 'number' ? Math.max(0, v) : 0;
      }
    } else {
      for (const node of TREE) this.purchased[node.id] = 0;
    }
    this.cores = typeof raw.cores === 'number' ? Math.max(0, raw.cores) : 0;
    this.totalCoresEarned =
      typeof raw.totalCoresEarned === 'number'
        ? Math.max(0, raw.totalCoresEarned)
        : this.cores; // best-effort initial tally
  }

  /**
   * Serialise current state to a plain object.
   * @returns {object}
   */
  _serialise() {
    return {
      purchased: { ...this.purchased },
      cores: this.cores,
      totalCoresEarned: this.totalCoresEarned,
    };
  }

  // ── persistence ─────────────────────────────

  /**
   * Save current state to localStorage.
   */
  save() {
    try {
      const data = JSON.stringify(this._serialise());
      localStorage.setItem('nebula_meta', data);
    } catch (e) {
      console.warn('[MetaProgression] Failed to save:', e);
    }
  }

  /**
   * Load state from localStorage, merging sensible defaults for any missing keys.
   */
  load() {
    try {
      const raw = localStorage.getItem('nebula_meta');
      if (raw) {
        const parsed = JSON.parse(raw);
        this._hydrate(parsed);
      } else {
        // First run — initialise default state and persist it
        this._hydrate({ purchased: {}, cores: 0, totalCoresEarned: 0 });
        this.save();
      }
    } catch (e) {
      console.warn('[MetaProgression] Failed to load, using defaults:', e);
      this._hydrate({ purchased: {}, cores: 0, totalCoresEarned: 0 });
    }
  }

  /**
   * Wipe all progress (debug / new-game).
   */
  reset() {
    this._hydrate({ purchased: {}, cores: 0, totalCoresEarned: 0 });
    this.save();
  }

  // ── query methods ───────────────────────────

  /**
   * How many ranks have been purchased for the given node id?
   * @param {string} id
   * @returns {number}
   */
  getPurchased(id) {
    return this.purchased[id] || 0;
  }

  /**
   * Cost (in cores) to purchase the next rank of the given node.
   * @param {string} id
   * @param {number} [currentLevel] – defaults to actual purchased level
   * @returns {number} core cost, or -1 if node is maxed / unknown
   */
  getCost(id, currentLevel) {
    const node = MetaProgression.getNode(id);
    if (!node) return -1;
    const level = typeof currentLevel === 'number' ? currentLevel : this.getPurchased(id);
    if (level >= node.maxLevel) return -1; // already maxed
    return node.costFn(level);
  }

  /**
   * Check whether the node's next rank can be afforded right now.
   * @param {string} id
   * @returns {boolean}
   */
  canAfford(id) {
    const cost = this.getCost(id);
    if (cost < 0) return false;
    return this.cores >= cost;
  }

  /**
   * Attempt to purchase the next rank of a node.
   * Returns `true` on success, `false` if maxed or cannot afford.
   *
   * Side-effect: persists to localStorage automatically.
   *
   * @param {string} id
   * @returns {boolean}
   */
  purchase(id) {
    const node = MetaProgression.getNode(id);
    if (!node) return false;

    const currentLevel = this.getPurchased(id);
    if (currentLevel >= node.maxLevel) return false;

    const cost = node.costFn(currentLevel);
    if (this.cores < cost) return false;

    // Deduct cores and increment rank
    this.cores -= cost;
    this.purchased[id] = currentLevel + 1;

    this.save();
    return true;
  }

      /** @returns {number} spendable core balance */
    getBalance() {
        return this.cores;
    }

/**
   * Add freshly-earned cores to the wallet.
   * Updates both spendable balance and lifetime tally.
   *
   * @param {number} amount – cores earned this run
   */
  earnCores(amount) {
    if (amount <= 0) return;
    this.cores += amount;
    this.totalCoresEarned += amount;
    this.save();
  }

  /**
   * Build and return a flat modifiers object summarising every active bonus.
   * This is consumed by the game's player stat pipeline on run start.
   *
   * @returns {object}
   */
  getAppliedModifiers() {
    const mods = {
      moveSpeedBoost: 0,
      magnetRadiusBoost: 0,
      startingShields: 0,
      startingHpBonus: 0,
      scrapMagnetRange: 0,
      coreMagnetRange: 0,
      fireRateMultiplier: 1,
      damageMultiplier: 1,
    };

    for (const node of TREE) {
      const level = this.getPurchased(node.id);
      if (level > 0) {
        const partial = node.apply(level);
        Object.assign(mods, partial);
      }
    }

    return mods;
  }

  // ── UI rendering ────────────────────────────

  /**
   * Draw the talent tree screen.
   * Layout assumes a 400-wide portrait canvas.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} canvasW
   * @param {number} canvasH
   */
  render(ctx, canvasW, canvasH) {
    const W = canvasW;
    const H = canvasH;

    // ── background ─────────────────────────────
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // ── title ──────────────────────────────────
    ctx.fillStyle = COLORS.coreGold;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('✦ TALENT TREE ✦', W / 2, 10);

    // ── core balance bar ───────────────────────
    ctx.fillStyle = COLORS.cardBg;
    ctx.fillRect(10, 36, W - 20, 26);

    ctx.fillStyle = COLORS.coreGold;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`◆ ${this.cores} cores`, 20, 49);

    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '10px monospace';
    ctx.fillText(`lifetime: ${this.totalCoresEarned}`, W - 20, 49);

    // ── scrollable card list ───────────────────
    const cardX = 10;
    const cardW = W - 20;
    const cardH = 64;
    const cardGap = 6;
    const startY = 74; // top of first card (below title + balance)

    // Compute total content height for scroll bounds
    const contentH = TREE.length * (cardH + cardGap) - cardGap;
    const viewH = H - startY - 10;
    this.maxScroll = Math.max(0, contentH - viewH);

    // Clamp scroll
    if (this.scrollOffset > this.maxScroll) this.scrollOffset = this.maxScroll;
    if (this.scrollOffset < 0) this.scrollOffset = 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, startY, W, H - startY);
    ctx.clip();

    for (let i = 0; i < TREE.length; i++) {
      const node = TREE[i];
      const level = this.getPurchased(node.id);
      const maxed = level >= node.maxLevel;
      const cost = maxed ? -1 : node.costFn(level);
      const canAfford = cost >= 0 && this.cores >= cost;
      const purchased = level > 0;

      const y = startY + i * (cardH + cardGap) - this.scrollOffset;

      // Skip cards entirely off-screen
      if (y + cardH < startY || y > H) continue;

      // ── card background ──────────────────────
      ctx.fillStyle = purchased
        ? '#1a2a30'
        : canAfford
          ? COLORS.cardBg
          : '#12151f';
      ctx.fillRect(cardX, y, cardW, cardH);

      // ── card border (purchased → bright, affordable → normal, locked → dim) ─
      ctx.strokeStyle = purchased
        ? node.color
        : canAfford
          ? COLORS.cardBorder
          : '#1f2235';
      ctx.lineWidth = purchased ? 2 : 1;
      ctx.strokeRect(cardX, y, cardW, cardH);

      // ── icon ─────────────────────────────────
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = purchased ? node.color : canAfford ? COLORS.textPrimary : COLORS.locked;
      ctx.fillText(node.icon, cardX + 28, y + cardH / 2);

      // ── name ─────────────────────────────────
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = purchased ? node.color : canAfford ? COLORS.textPrimary : COLORS.locked;
      ctx.fillText(node.name, cardX + 52, y + 8);

      // ── description ──────────────────────────
      ctx.font = '9px monospace';
      ctx.fillStyle = purchased ? '#88bbaa' : canAfford ? COLORS.textSecondary : '#3a3a4e';
      ctx.fillText(node.description, cardX + 52, y + 24);

      // ── level dots ───────────────────────────
      const dotSize = 6;
      const dotGap = 4;
      const dotY = y + cardH - 14;
      const dotStartX = cardX + 52;

      for (let d = 0; d < node.maxLevel; d++) {
        ctx.beginPath();
        ctx.arc(dotStartX + d * (dotSize + dotGap), dotY, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = d < level ? COLORS.dotFilled : COLORS.dotEmpty;
        ctx.fill();
      }

      // ── cost badge ───────────────────────────
      const badgeX = cardX + cardW - 10;
      const badgeY = y + 8;

      if (maxed) {
        ctx.fillStyle = COLORS.purchased;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('MAX', badgeX, badgeY + 4);
      } else {
        ctx.fillStyle = canAfford ? COLORS.coreGold : COLORS.locked;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`◆${cost}`, badgeX, badgeY + 4);
      }

      // ── owned count (if purchased) ───────────
      if (purchased && !maxed) {
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${level}/${node.maxLevel}`, badgeX, y + cardH - 6);
      }
    }

    ctx.restore();

    // ── scrollbar ──────────────────────────────
    if (this.maxScroll > 0) {
      const sbW = 4;
      const sbX = W - sbW - 2;
      const sbMinH = 30;
      const sbTrackH = viewH;
      const sbH = Math.max(sbMinH, (viewH / (contentH + viewH)) * sbTrackH);
      const sbY = startY + (this.scrollOffset / this.maxScroll) * (sbTrackH - sbH);

      ctx.fillStyle = 'rgba(42,51,102,0.4)';
      ctx.fillRect(sbX, startY, sbW, sbTrackH);

      ctx.fillStyle = COLORS.scrollbar;
      ctx.fillRect(sbX, sbY, sbW, sbH);
    }

    // ── back button ────────────────────────────
    const btnW = 100;
    const btnH = 34;
    const btnX = (W - btnW) / 2;
    const btnY = H - btnH - 8;

    ctx.fillStyle = COLORS.backBtn;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('← BACK', btnX + btnW / 2, btnY + btnH / 2);

    // Store button rect for hit-testing in handleTap
    this._backBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    // Store card rects for hit-testing
    this._cardRects = [];
    for (let i = 0; i < TREE.length; i++) {
      const y = startY + i * (cardH + cardGap) - this.scrollOffset;
      this._cardRects.push({
        id: TREE[i].id,
        x: cardX,
        y,
        w: cardW,
        h: cardH,
        index: i,
      });
    }
  }

  // ── touch handling ──────────────────────────

  /**
   * Handle a tap / click at the given canvas coordinates.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} canvasW
   * @param {number} canvasH
   * @returns {string|null} action string — 'purchase:<id>' | 'back' | null
   */
  handleTap(x, y, canvasW, canvasH) {
    // Ignore if not visible
    if (!this.visible) return null;

    // ── back button ────────────────────────────
    if (this._backBtnRect) {
      const b = this._backBtnRect;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.visible = false;
        return 'back';
      }
    }

    // ── card hits ──────────────────────────────
    if (this._cardRects) {
      for (const rect of this._cardRects) {
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
          const node = MetaProgression.getNode(rect.id);
          if (!node) continue;
          const level = this.getPurchased(rect.id);
          if (level >= node.maxLevel) continue; // maxed — no action
          const cost = node.costFn(level);
          if (this.cores < cost) continue; // can't afford — no action
          return `purchase:${rect.id}`;
        }
      }
    }

    return null;
  }

  /**
   * Programmatically perform a purchase action returned by handleTap.
   * Useful for wiring up tap results in the main loop.
   *
   * @param {string} action
   * @returns {boolean} whether a purchase occurred
   */
  performAction(action) {
    if (!action || typeof action !== 'string') return false;
    if (action === 'back') return false; // handled by handleTap setting visible=false

    const prefix = 'purchase:';
    if (action.startsWith(prefix)) {
      const id = action.slice(prefix.length);
      return this.purchase(id);
    }
    return false;
  }
}
