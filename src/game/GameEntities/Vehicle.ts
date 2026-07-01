import { Vector2, Vector3 } from "three";
import { AudioManager } from "../AudioManager";
import type { EffectId } from "../Effects";
import { newId } from "../idGenerator";
import { GlobalDebugScreen } from "../GlobalDebugScreen";
import { calculateMomentOfIntertia } from "../utils";
import type { Simulation } from "../Simulation";
import type { ProjectileHit } from "../Projectiles";
import { type BlasterIds, BLASTERS } from "../presets/blasters";

export type HudDisplayInfo = {
    name: string;
    health: {
        current: number;
        max: number;
    };
    isVisible: boolean;
};

export type HoverGroundVehicleStats = {
    repulserThrustNewtons: number;
    weightKg: number;
    meshId: string; // Determines what STL file is used.
    linearFrictionFactor: number;
    momentOfInertia: number;
    yawTorqueNewtonMeters: number;
    yawFriction: number;
    collisionRadius: number;
    deathEffectId: EffectId;
    maxHealth: number;
    primaryWeaponTypeId: BlasterIds;
};

export const cloneTankStats: HoverGroundVehicleStats = {
    repulserThrustNewtons: 1_000_000,
    weightKg: 50_000,
    meshId: "clone-tank",
    linearFrictionFactor: 10_000,
    momentOfInertia: calculateMomentOfIntertia("clone-tank", 50_000),
    yawTorqueNewtonMeters: 2_000_000,
    yawFriction: 1_000_000,
    collisionRadius: 4,
    deathEffectId: "vehicleDeathExplosion",
    maxHealth: 100,
    primaryWeaponTypeId: "20mmBlueBlaster",
};

export class HoverGroundVehicle {
    stats: HoverGroundVehicleStats;
    name: string;

    protected _positionInputVector: Vector2;
    protected _yawInput: number;
    protected _velocity: Vector3;
    protected _position: Vector3;
    protected _direction: Vector3;
    protected _yawAngularVelocity: number;
    protected readonly _sim: Simulation;
    protected _health: number;
    private _isPrimaryFireRequested: boolean;
    private _lastShot = -1000;
    id: string;

    constructor(
        name: string,
        stats: HoverGroundVehicleStats,
        sim: Simulation,
        position?: Vector3,
    ) {
        this.stats = stats;
        this.name = name;
        this._sim = sim;
        this._positionInputVector = new Vector2(0, 0);
        this._velocity = new Vector3(0, 0, 0);
        this._yawInput = 0;
        this._yawAngularVelocity = 0;
        this._position = position ? position : new Vector3(0, 0, 0);
        this._direction = new Vector3(0, 0, 1);
        this._health = stats.maxHealth;
        this._isPrimaryFireRequested = false;
        this.id = newId();
    }

    setInput(
        movementVector: Vector2,
        yawInput: number,
        isPrimaryFire = false,
    ): void {
        if (movementVector.lengthSq() > 1) {
            this._positionInputVector = movementVector.clone().normalize();
        } else {
            this._positionInputVector = movementVector.clone();
        }

        const rotationVal = yawInput < -1 ? -1 : (yawInput > 1 ? 1 : yawInput);
        this._yawInput = rotationVal;
        this._isPrimaryFireRequested = isPrimaryFire;
    }

    simulateTick(deltaT: number, elapsedTime: number): void {
        if (this.isDestroyed()) {
            return;
        }

        //Calculate Forces
        const forwardDirection = this._direction.clone().setY(0).normalize();
        const rightDirection = new Vector3().crossVectors(
            new Vector3(0, 1, 0),
            forwardDirection,
        ).normalize();
        const inputThrust3D = rightDirection.multiplyScalar(
            this._positionInputVector.x,
        ).add(
            forwardDirection.multiplyScalar(-this._positionInputVector.y),
        ).multiplyScalar(this.stats.repulserThrustNewtons);
        const frictionMagnitude = (this._velocity.length()) *
            this.stats.linearFrictionFactor;
        const frictionDirection = this._velocity.clone().normalize().negate();
        const frictionVector = frictionDirection.multiplyScalar(
            frictionMagnitude,
        );
        const totalForces: Vector3 = inputThrust3D.add(frictionVector);

        //Update position
        const acceleration = totalForces.divideScalar(this.stats.weightKg);
        this._velocity.add(acceleration.multiplyScalar(deltaT));
        this._position.add(
            this._velocity.clone().multiplyScalar(deltaT),
        );
        GlobalDebugScreen.show(`${this.id} position`, this._position);

        //Alter Rotation
        const rotationalAcceleration = this._yawInput *
            (this.stats.yawTorqueNewtonMeters / this.stats.momentOfInertia);
        const rotationFriction = this._yawAngularVelocity *
            (this.stats.yawFriction / this.stats.momentOfInertia);
        this._yawAngularVelocity +=
            (rotationalAcceleration - rotationFriction) * deltaT;
        const yawDelta = this._yawAngularVelocity * deltaT;
        this._direction.applyAxisAngle(new Vector3(0, 1, 0), yawDelta)
            .setY(0)
            .normalize();

        if (this._isPrimaryFireRequested) {
            this.tryFirePrimary(elapsedTime);
        }
    }

    getPosition(): Vector3 {
        return this._position;
    }

    getDirection(): Vector3 {
        return this._direction;
    }

    getCollisionRadius(): number {
        return this.stats.collisionRadius;
    }

    isDestroyed(): boolean {
        return this._health <= 0;
    }

    getHealth(): number {
        return this._health;
    }

    getHudDisplay(): HudDisplayInfo {
        return {
            name: this.name,
            health: {
                current: this.getHealth(),
                max: this.stats.maxHealth,
            },
            isVisible: !this.isDestroyed(),
        };
    }

    protected tryFirePrimary(elapsedTime: number): boolean {
        const weaponTypeId = this.stats.primaryWeaponTypeId;

        const cooldown =
            BLASTERS[this.stats.primaryWeaponTypeId].shootCooldown / 1000;
        if (this.stats.meshId === "clone-tank") {
            GlobalDebugScreen.show("cooldown", cooldown);
            GlobalDebugScreen.show("lastshot", this._lastShot);
            GlobalDebugScreen.show("elapsed", elapsedTime);
            GlobalDebugScreen.show(
                `detail`,
                `${this._lastShot} + ${cooldown} (${
                    this._lastShot + cooldown
                })< ${elapsedTime}`,
            );
        }
        if ((this._lastShot + cooldown) > elapsedTime) {
            return false;
        }

        const shotDirection = this._direction.clone().setY(0).normalize()
            .negate();
        const muzzlePosition = this._position.clone().add(
            shotDirection.clone().multiplyScalar(
                this.stats.collisionRadius + 0.9,
            ),
        );
        muzzlePosition.y = Math.max(muzzlePosition.y, 1.5);

        this._sim.registerProjectile({
            typeId: weaponTypeId,
            ownerId: this.id,
            position: muzzlePosition,
            direction: shotDirection,
            inheritedVelocity: this._velocity,
        });
        void AudioManager.playSound(BLASTERS[weaponTypeId].sound, {
            volume: 0.55,
            playbackRateJitter: 0.04,
        });
        this._lastShot = elapsedTime;

        return true;
    }

    takeDamage(hit: ProjectileHit): void {
        this._health = Math.max(0, this._health - hit.damage);
    }
}
