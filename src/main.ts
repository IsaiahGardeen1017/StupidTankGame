import './style.css';
import { AudioManager } from './game/AudioManager';
import { GameApp } from './game/GameApp';
import { GlobalDebugScreen } from './game/GlobalDebugScreen';
import { GlobalOptionsPanel } from './game/GlobalOptionsPanel';

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
const gameShell = appRoot.querySelector<HTMLDivElement>('.game-shell');

if (!canvas) {
  throw new Error('Game canvas element was not found.');
}

if (!gameShell) {
  throw new Error('Game shell element was not found.');
}

GlobalDebugScreen.initialize(gameShell);
GlobalOptionsPanel.initialize(gameShell);
void AudioManager.initialize();

const game = new GameApp(canvas, gameShell);
game.start();
