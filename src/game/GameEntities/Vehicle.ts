import { Vector2, Vector3 } from "three";

export type HoverGroundVehicleStats = {
    repulserThrustNewtons: number;
    weightKg: number;
};

export const cloneTankStats: HoverGroundVehicleStats = {
    repulserThrustNewtons: 200_000,
    weightKg: 50_000,
};

export class HoverGroundVehicle {
    stats: HoverGroundVehicleStats;
    name: string;

    private _inputVector: Vector2;

    private _velocity: Vector3;

    private _vehicleDirection: Vector3;

    private _position: Vector3;

    constructor(
        name: string,
        stats: HoverGroundVehicleStats,
        position?: Vector3,
    ) {
        this.stats = stats;
        this.name = name;
        this._inputVector = new Vector2(0, 0);
        this._velocity = new Vector3(0, 0, 0);
        this._vehicleDirection = new Vector3(1, 0, 0);
        this._position = position ? position : new Vector3(0, 0, 0);
    }

    setInput(input: Vector2) {
        if (input.lengthSq() > 1) {
            this._inputVector = input.clone().normalize();
        } else {
            this._inputVector = input;
        }
    }

    setDirection(newDirection: Vector3) {
        this._vehicleDirection = newDirection.clone().normalize();
    }

    simulateTick(tickLengthMs: number) {
        const dt = tickLengthMs / 1000;
        const inputThrust2D = this._inputVector.clone().multiplyScalar(
            this.stats.repulserThrustNewtons,
        );
        const inputThrust3D = new Vector3(inputThrust2D.x, 0, inputThrust2D.y);
        const totalForces: Vector3 = inputThrust3D;
        const acceleration = totalForces.divideScalar(this.stats.weightKg);
        this._velocity.add(acceleration.multiplyScalar(dt));
        this._position.add(this._velocity.clone().multiplyScalar(dt));
    }

    getPosition(): Vector3 {
        return this._position;
    }
}
