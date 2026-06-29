import { Vector2, Vector3 } from "three";
import { cloneTankStats, HoverGroundVehicle } from "./GameEntities/Vehicle";
import type { RenderableEntitiy } from "./ThreeJsEngine";
import { AiFreigher } from "./GameEntities/AiFreighter";
import { randInt } from "./utils";

export class Simulation {
    private readonly playerVehicle: HoverGroundVehicle;

    size: number;

    aiVehicles: HoverGroundVehicle[];

    constructor(size: number = 1000) {
        this.playerVehicle = new HoverGroundVehicle(
            "player",
            cloneTankStats,
            this,
        );

        this.size = size;
        this.aiVehicles = [];

        for (let i = 0; i < 10; i++) {
            this.aiVehicles.push(
                new AiFreigher(
                    this,
                    new Vector3(randInt(-250, 250), 1, randInt(-250, 250)),
                ),
            );
        }
    }

    tick(deltaT: number): void {
        this.playerVehicle.simulateTick(deltaT);
        for (let i = 0; i < this.aiVehicles.length; i++) {
            this.aiVehicles[i].simulateTick(deltaT);
        }
    }

    setPlayerInput(input: Vector2, yawInput: number): void {
        this.playerVehicle.setInput(new Vector2(input.y, input.x), yawInput);
    }

    getPlayerVehicle(): HoverGroundVehicle {
        return this.playerVehicle;
    }

    getEntityList(): RenderableEntitiy[] {
        return [this.playerVehicle, ...this.aiVehicles];
    }
}
