import { Vector2, Vector3 } from "three";
import { cloneTankStats, HoverGroundVehicle } from "./GameEntities/Vehicle";
import { AiFreigher } from "./GameEntities/AiFreighter";
import {
    createProjectile,
    type ProjectileSpawnParams,
    ProjectileTypeDefs,
    type ProjectileState,
} from "./Projectiles";
import { distanceSqFromPointToSegment2D, randInt } from "./utils";

export class Simulation {
    private readonly playerVehicle: HoverGroundVehicle;

    size: number;

    aiVehicles: HoverGroundVehicle[];
    private readonly projectiles: ProjectileState[];

    constructor(size: number = 1000) {
        this.playerVehicle = new HoverGroundVehicle(
            "player",
            cloneTankStats,
            this,
        );

        this.size = size;
        this.aiVehicles = [];
        this.projectiles = [];

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

        this.tickProjectiles(deltaT);
    }

    setPlayerInput(input: Vector2, yawInput: number, isPrimaryFire: boolean): void {
        this.playerVehicle.setInput(
            new Vector2(input.y, input.x),
            yawInput,
            isPrimaryFire,
        );
    }

    getPlayerVehicle(): HoverGroundVehicle {
        return this.playerVehicle;
    }

    getVehicleList(): HoverGroundVehicle[] {
        return [
            this.playerVehicle,
            ...this.aiVehicles,
        ];
    }

    getProjectileList(): ProjectileState[] {
        return this.projectiles;
    }

    registerProjectile(params: ProjectileSpawnParams): void {
        this.projectiles.push(createProjectile(params));
    }

    private tickProjectiles(deltaT: number): void {
        for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
            const projectile = this.projectiles[i];
            const projectileDef = ProjectileTypeDefs[projectile.typeId];

            projectile.previousPosition.copy(projectile.position);
            projectile.position.add(
                projectile.velocity.clone().multiplyScalar(deltaT),
            );
            projectile.lifeRemaining -= deltaT;

            if (this.resolveProjectileHit(projectile, projectileDef.damage)) {
                this.projectiles.splice(i, 1);
                continue;
            }

            if (
                projectile.lifeRemaining <= 0 ||
                Math.abs(projectile.position.x) > this.size / 2 ||
                Math.abs(projectile.position.z) > this.size / 2
            ) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    private resolveProjectileHit(
        projectile: ProjectileState,
        damage: number,
    ): boolean {
        const shotStart = new Vector2(
            projectile.previousPosition.x,
            projectile.previousPosition.z,
        );
        const shotEnd = new Vector2(
            projectile.position.x,
            projectile.position.z,
        );
        const projectileRadius = ProjectileTypeDefs[projectile.typeId].radius;
        const vehicles = this.getVehicleList();

        for (let i = 0; i < vehicles.length; i += 1) {
            const vehicle = vehicles[i];

            if (vehicle.id === projectile.ownerId || vehicle.isDestroyed()) {
                continue;
            }

            const vehiclePosition = vehicle.getPosition();
            const vehicleCenter = new Vector2(vehiclePosition.x, vehiclePosition.z);
            const hitRadius = projectileRadius + vehicle.getCollisionRadius();
            const distanceSq = distanceSqFromPointToSegment2D(
                vehicleCenter,
                shotStart,
                shotEnd,
            );

            if (distanceSq > hitRadius * hitRadius) {
                continue;
            }

            vehicle.takeDamage({
                projectileId: projectile.id,
                projectileTypeId: projectile.typeId,
                shooterId: projectile.ownerId,
                damage,
            });
            return true;
        }

        return false;
    }
}
