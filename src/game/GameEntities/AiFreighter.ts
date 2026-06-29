import { Vector2, type Vector3 } from "three";
import type { Simulation } from "../Simulation";
import { calculateMomentOfIntertia, randInt } from "../utils";
import { HoverGroundVehicle, type HoverGroundVehicleStats } from "./Vehicle";

export const freighterStats: HoverGroundVehicleStats = {
    repulserThrustNewtons: 500_000,
    weightKg: 150_000,
    meshId: "freighter",
    linearFrictionFactor: 15_000,
    momentOfInertia: calculateMomentOfIntertia("freighter", 150_000),
    yawTorqueNewtonMeters: 2_000_000,
    yawFriction: 1_000_000,
};

export class AiFreigher extends HoverGroundVehicle {
    tickNum: number;
    constructor(sim: Simulation, pos: Vector3) {
        super(`ai-freigher-${randInt(100000)}`, freighterStats, sim, pos);
        this.tickNum = 0;
        this._positionInputVector = new Vector2(Math.random(), Math.random());
    }

    setInput(_movementVector: Vector2, _yawInput: number): void {}

    simulateTick(deltaT: number) {
        if (this.tickNum % 500 === 0) {
            this._positionInputVector = new Vector2(
                Math.random(),
                Math.random(),
            );
        }
        super.simulateTick(deltaT);
    }
}
