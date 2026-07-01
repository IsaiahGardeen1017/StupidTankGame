import { Vector2, type Vector3 } from "three";
import type { Simulation } from "../Simulation";
import type { ProjectileHit } from "../Projectiles";
import { calculateMomentOfIntertia, randInt } from "../utils";
import { HoverGroundVehicle, type HoverGroundVehicleStats } from "./Vehicle";

export const freighterStats: HoverGroundVehicleStats = {
    repulserThrustNewtons: 500000,
    weightKg: 150000,
    meshId: "freighter",
    linearFrictionFactor: 15000,
    momentOfInertia: calculateMomentOfIntertia("freighter", 150000),
    yawTorqueNewtonMeters: 2000000,
    yawFriction: 1000000,
    collisionRadius: 7.5,
    deathEffectId: "vehicleDeathExplosion",
    maxHealth: 10,
    primaryWeaponTypeId: "20mmBlueBlaster",
};

export class AiFreigher extends HoverGroundVehicle {
    tickNum: number;
    isDead = false;
    constructor(sim: Simulation, pos: Vector3) {
        super(`ai-freigher-${randInt(100000)}`, freighterStats, sim, pos);
        this.tickNum = 0;
        this._positionInputVector = new Vector2(Math.random(), Math.random());
    }

    setInput(
        _movementVector: Vector2,
        _yawInput: number,
        _isPrimaryFire = false,
    ): void {}

    simulateTick(deltaT: number, elapsedTime: number) {
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
        super.simulateTick(deltaT, elapsedTime);
    }

    takeDamage(hit: ProjectileHit) {
        super.takeDamage(hit);
        this.isDead = this.isDestroyed();
    }
}
