import './style.css';
import { GameApp } from './game/GameApp';

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('App root element was not found.');
}

appRoot.innerHTML = `
  <div class="game-shell">
    <canvas class="game-canvas" aria-label="Three.js game viewport"></canvas>
    <div class="hud">
      <h1>Stupid Tank Game</h1>
      <p>WASD to drive the spaceship.</p>
    </div>
  </div>
`;

const canvas = appRoot.querySelector<HTMLCanvasElement>('.game-canvas');

if (!canvas) {
  throw new Error('Game canvas element was not found.');
}

const game = new GameApp(canvas);
game.start();
