import type { GameApp } from "./GameApp";

export class Simulation {
    gameApp: GameApp;

    constructor(gameApp: GameApp) {
        this.gameApp = gameApp;
    }
}
