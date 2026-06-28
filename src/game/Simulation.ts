import { Vector2 } from "three";
import { cloneTankStats, HoverGroundVehicle } from "./GameEntities/Vehicle";
import type { RenderableEntitiy } from "./ThreeJsEngine";

export class Simulation {
    private readonly playerVehicle: HoverGroundVehicle;

    constructor() {
        this.playerVehicle = new HoverGroundVehicle("player", cloneTankStats);
    }

    tick(deltaT: number): void {
        this.playerVehicle.simulateTick(deltaT);
    }

    setPlayerInput(input: Vector2): void {
        this.playerVehicle.setInput(new Vector2(input.y, input.x));
    }

    getPlayerVehicle(): HoverGroundVehicle {
        return this.playerVehicle;
    }

    getEntityList(): RenderableEntitiy[] {
        return [this.playerVehicle];
    }
}
