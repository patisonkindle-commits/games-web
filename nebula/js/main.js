import { Game } from './game.js';

function init() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error('Canvas not found'); return; }

    // Set virtual resolution
    canvas.width = 400;
    canvas.height = 720;

    // Scale to fit viewport (mobile portrait)
    function resize() {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const gameRatio = canvas.width / canvas.height;
        let displayW, displayH;

        if (vw / vh < gameRatio) {
            displayW = vw;
            displayH = vw / gameRatio;
        } else {
            displayH = vh;
            displayW = vh * gameRatio;
        }

        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;
    }

    window.addEventListener('resize', resize);
    resize();

    // Prevent default touch behavior
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Start game
    const game = new Game(canvas);
    game.start();

    // Expose for console debugging
    window.__game = game;

    // --- Meta Tree access via long-press on game over ---
    // (Handled inside game.js via the _updateGameOver state machine)

    // DEBUG API
    window.__gameDebug = () => ({
        state: game.state,
        wave: game.waveManager.wave,
        player: {
            x: Math.round(game.player.x),
            y: Math.round(game.player.y),
            hp: game.player.hp,
            shield: game.player.shield,
            level: game.player.level,
        },
        enemies: game.enemies.active.length,
        fps: window.__fps || 0,
        cores: game.meta ? game.meta.getBalance() : 0,
    });
}

// Init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// --- PWA: Register service worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(
            (reg) => console.log('SW registered:', reg.scope),
            (err) => console.log('SW registration failed:', err)
        );
    });
}

// --- FPS counter: increment inside game loop via patched start() ---
window.__fpsCount = 0;
setInterval(() => {
    window.__fps = window.__fpsCount;
    window.__fpsCount = 0;
    const game = window.__game;
    if (game && game.state === 'playing') {
        console.log(`FPS: ${window.__fps} | Wave: ${game.waveManager.wave} | Enemies: ${game.enemies.active.length} | Boss: ${game.enemies.bossActive}`);
    }
}, 1000);
