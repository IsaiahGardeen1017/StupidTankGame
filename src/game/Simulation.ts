import type { GameApp } from "./GameApp";
import { cloneTankStats, HoverGroundVehicle } from "./GameEntities/Vehicle";

export class Simulation {
    gameApp: GameApp;
    private playerVehicle: HoverGroundVehicle;

    constructor(gameApp: GameApp) {
        this.gameApp = gameApp;

        this.playerVehicle = new HoverGroundVehicle("player", cloneTankStats);
    }

    tick(deltaT: number) {
        this.playerVehicle.simulateTick(deltaT);
    }

    handleInput() {
        const playerMovementAxis = this.gameApp.input.getMovementAxes();
        this.playerVehicle.setInput(playerMovementAxis);
    }

    getPlayerVehilce() {
        return this.playerVehicle;
    }
}
