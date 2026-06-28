import { Vector2, Vector3 } from "three";
import { newId } from "../idGenerator";

export type HoverGroundVehicleStats = {
    repulserThrustNewtons: number;
    weightKg: number;
    meshId: string; // Determines what STL file is used.
    linearFrictionFactor: number;
};

export const cloneTankStats: HoverGroundVehicleStats = {
    repulserThrustNewtons: 1_000_000,
    weightKg: 50_000,
    meshId: "Spaceship",
    linearFrictionFactor: 10_000,
};

export class HoverGroundVehicle {
    stats: HoverGroundVehicleStats;
    name: string;

    private _inputVector: Vector2;
    private _velocity: Vector3;
    private _position: Vector3;
    id: string;

    constructor(
        name: string,
        stats: HoverGroundVehicleStats,
        position?: Vector3,
    ) {
        this.stats = stats;
        this.name = name;
        this._inputVector = new Vector2(0, 0);
        this._velocity = new Vector3(0, 0, 0);
        this._position = position ? position : new Vector3(0, 0, 0);
        this.id = newId();
    }

    setInput(input: Vector2): void {
        if (input.lengthSq() > 1) {
            this._inputVector = input.clone().normalize();
        } else {
            this._inputVector = input.clone();
        }
    }

    simulateTick(deltaTimeSeconds: number): void {
        const inputThrust2D = this._inputVector.clone().multiplyScalar(
            this.stats.repulserThrustNewtons,
        );
        const inputThrust3D = new Vector3(inputThrust2D.x, 0, inputThrust2D.y);
        const frictionMagnitude = (this._velocity.length()) *
            this.stats.linearFrictionFactor;
        const frictionDirection = this._velocity.clone().normalize().negate();
        const frictionVector = frictionDirection.multiplyScalar(
            frictionMagnitude,
        );
        const totalForces: Vector3 = inputThrust3D.add(frictionVector);
        const acceleration = totalForces.divideScalar(this.stats.weightKg);
        this._velocity.add(acceleration.multiplyScalar(deltaTimeSeconds));
        this._position.add(
            this._velocity.clone().multiplyScalar(deltaTimeSeconds),
        );
        console.log(this._velocity.length());
    }

    getPosition(): Vector3 {
        return this._position;
    }
}
