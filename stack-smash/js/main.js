import { Game } from './game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

const scoreDisplay = document.getElementById('score-display');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');

function gameLoop() {
    game.update();
    game.render();
    
    // UI Sync
    if (game.state === 'playing') {
        let txt = game.score.toString();
        if (game.perfectCount > 1) {
            txt += `\nPERFECT x${game.perfectCount}`;
        }
        scoreDisplay.innerText = txt;
    }

    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', () => {
    if (game.state === 'playing') {
        game.land();
    } else if (game.state === 'menu') {
        startScreen.style.display = 'none';
        game.reset();
        game.state = 'playing';
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    canvas.click();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameoverScreen.style.display = 'none';
    game.reset();
});

document.getElementById('ad-btn').addEventListener('click', () => {
    alert('AdSense Rewarded Video Placeholder');
    // Logic to continue game after ad
});

window.addEventListener('resize', () => game.resize());
gameLoop();
