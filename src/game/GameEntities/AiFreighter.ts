import { Vector2, type Vector3 } from "three";
import type { Simulation } from "../Simulation";
import type { ProjectileHit } from "../Projectiles";
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
    collisionRadius: 7.5,
    maxHealth: 25,
};

export class AiFreigher extends HoverGroundVehicle {
    tickNum: number;
    isDead = false;
    constructor(sim: Simulation, pos: Vector3) {
        super(`ai-freigher-${randInt(100000)}`, freighterStats, sim, pos);
        this.tickNum = 0;
        this._positionInputVector = new Vector2(Math.random(), Math.random());
    }

    setInput(_movementVector: Vector2, _yawInput: number, _isPrimaryFire = false): void {}

    simulateTick(deltaT: number) {
        if (this.isDead) {
            return;
        }
        if (this.tickNum % 500 === 0) {
            this._positionInputVector = new Vector2(
                Math.random(),
                Math.random(),
            );
        }
        this.tickNum += 1;
        super.simulateTick(deltaT);
    }

    takeDamage(hit: ProjectileHit) {
        super.takeDamage(hit);
        this.isDead = true;
    }
}
