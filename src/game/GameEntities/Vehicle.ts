import { Vector2, Vector3 } from "three";
import { newId } from "../idGenerator";
import { GlobalDebugScreen } from "../GlobalDebugScreen";
import { calculateMomentOfIntertia } from "../utils";

export type HoverGroundVehicleStats = {
    repulserThrustNewtons: number;
    weightKg: number;
    meshId: string; // Determines what STL file is used.
    linearFrictionFactor: number;
    momentOfInertia: number;
    yawTorqueNewtonMeters: number;
    yawFriction: number;
};

export const cloneTankStats: HoverGroundVehicleStats = {
    repulserThrustNewtons: 1_000_000,
    weightKg: 50_000,
    meshId: "clone-tank",
    linearFrictionFactor: 10_000,
    momentOfInertia: calculateMomentOfIntertia("clone-tank", 50_000),
    yawTorqueNewtonMeters: 2_000_000,
    yawFriction: 1_000_000,
};

export class HoverGroundVehicle {
    stats: HoverGroundVehicleStats;
    name: string;

    private _positionInputVector: Vector2;
    private _yawInput: number;
    private _velocity: Vector3;
    private _position: Vector3;
    private _direction: Vector3;
    private _yawAngularVelocity: number;
    id: string;

    constructor(
        name: string,
        stats: HoverGroundVehicleStats,
        position?: Vector3,
    ) {
        this.stats = stats;
        this.name = name;
        this._positionInputVector = new Vector2(0, 0);
        this._velocity = new Vector3(0, 0, 0);
        this._yawInput = 0;
        this._yawAngularVelocity = 0;
        this._position = position ? position : new Vector3(0, 0, 0);
        this._direction = new Vector3(0, 0, 1);
        this.id = newId();
    }

    setInput(movementVector: Vector2, yawInput: number): void {
        if (movementVector.lengthSq() > 1) {
            this._positionInputVector = movementVector.clone().normalize();
        } else {
            this._positionInputVector = movementVector.clone();
        }

        const rotationVal = yawInput < -1 ? -1 : (yawInput > 1 ? 1 : yawInput);
        this._yawInput = rotationVal;
    }

    simulateTick(deltaT: number): void {
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
        GlobalDebugScreen.show("input", this._positionInputVector);
        GlobalDebugScreen.show("speed", this._velocity.length());
        GlobalDebugScreen.show("position", this._position);

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
        GlobalDebugScreen.show("direction", this._direction);
        GlobalDebugScreen.show("rotationFriction", rotationFriction);
        GlobalDebugScreen.show(
            "rotationalAcceleration",
            rotationalAcceleration,
        );
        GlobalDebugScreen.show("yawSpeed", this._yawAngularVelocity);
    }

    getPosition(): Vector3 {
        return this._position;
    }

    getDirection(): Vector3 {
        return this._direction;
    }
}
