import { Vector2, Vector3 } from "three";
import type { VisualEffectSpawnEvent } from "./Effects";
import { cloneTankStats, HoverGroundVehicle } from "./GameEntities/Vehicle";
import { AiFreigher } from "./GameEntities/AiFreighter";
import {
    createProjectile,
    type ProjectileSpawnParams,
    type ProjectileState,
    ProjectileTypeDefs,
} from "./presets/Projectiles";
import { randInt } from "./utils";
import { Terrain } from "./Terrain";
import { HitboxRegistry } from "./HitboxRegistry";

export class Simulation {
    private readonly playerVehicle: HoverGroundVehicle;
    readonly terrain: Terrain;
    readonly hitboxRegistry = new HitboxRegistry();

    size: number;

    aiVehicles: HoverGroundVehicle[];
    elapsedTime: number;
    private readonly projectiles: ProjectileState[];
    private readonly visualEffectEvents: VisualEffectSpawnEvent[];

    constructor() {
        this.terrain = new Terrain();
        this.playerVehicle = new HoverGroundVehicle(
            "player",
            cloneTankStats,
            this,
        );

        this.size = this.terrain.settings.size;
        this.aiVehicles = [];
        this.projectiles = [];
        this.visualEffectEvents = [];
        this.elapsedTime = 0;

        for (let i = 0; i < 10; i++) {
            this.aiVehicles.push(
                new AiFreigher(
                    this,
                    new Vector3(randInt(-250, 250), 1, randInt(-250, 250)),
                ),
            );
        }

        this.registerDebugHitboxes();
    }

    tick(deltaT: number): void {
        this.elapsedTime += deltaT;
        this.playerVehicle.simulateTick(deltaT, this.elapsedTime);
        for (let i = 0; i < this.aiVehicles.length; i++) {
            this.aiVehicles[i].simulateTick(deltaT, this.elapsedTime);
        }

        this.tickProjectiles(deltaT);
    }

    setPlayerInput(
        input: Vector2,
        yawInput: number,
        isPrimaryFire: boolean,
    ): void {
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

    drainVisualEffectEvents(): VisualEffectSpawnEvent[] {
        return this.visualEffectEvents.splice(
            0,
            this.visualEffectEvents.length,
        );
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

            const terrainHit = this.findTerrainHit(
                projectile.previousPosition,
                projectile.position,
            );
            if (terrainHit) {
                projectile.position.copy(terrainHit);
            }

            if (this.resolveProjectileHit(projectile, projectileDef.damage)) {
                this.projectiles.splice(i, 1);
                continue;
            }

            if (this.resolveProjectileBoulderHit(projectile) || terrainHit) {
                this.visualEffectEvents.push({
                    effectId: projectileDef.hitEffectId,
                    position: projectile.position.clone(),
                    direction: projectile.velocity.clone().normalize(),
                });
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

    private registerDebugHitboxes(): void {
        this.hitboxRegistry.registerSource("vehicles", () =>
            this.getVehicleList().map((vehicle) => {
                const radius = vehicle.getCollisionRadius();
                const center = vehicle.getPosition().clone();
                center.y += radius * 0.35;
                return {
                    id: `vehicle:${vehicle.id}`,
                    center,
                    size: new Vector3(radius * 2, radius * 2, radius * 2),
                    color: "#00e5ff",
                };
            })
        );
        this.hitboxRegistry.registerSource("boulders", () =>
            this.terrain.boulders.map((boulder, index) => {
                const collisionRadius = Math.max(
                    boulder.radius,
                    boulder.height * 0.45,
                );
                const center = boulder.position.clone();
                center.y += boulder.height * 0.4;
                return {
                    id: `boulder:${index}`,
                    center,
                    size: new Vector3(
                        collisionRadius * 2,
                        collisionRadius * 2,
                        collisionRadius * 2,
                    ),
                    color: "#ffad33",
                };
            })
        );
        this.hitboxRegistry.registerSource("projectiles", () =>
            this.projectiles.map((projectile) => {
                const radius = ProjectileTypeDefs[projectile.typeId].radius;
                return {
                    id: `projectile:${projectile.id}`,
                    center: projectile.position.clone(),
                    size: new Vector3(radius * 2, radius * 2, radius * 2),
                    color: "#ff335f",
                };
            })
        );
    }

    resolveVehicleBoulderCollisions(
        position: Vector3,
        velocity: Vector3,
        vehicleRadius: number,
    ): void {
        for (const boulder of this.terrain.boulders) {
            const offsetX = position.x - boulder.position.x;
            const offsetZ = position.z - boulder.position.z;
            const distance = Math.hypot(offsetX, offsetZ);
            const minimumDistance = vehicleRadius + boulder.radius;
            if (distance >= minimumDistance) continue;

            const normalX = distance > 0.001 ? offsetX / distance : 1;
            const normalZ = distance > 0.001 ? offsetZ / distance : 0;
            position.x += normalX * (minimumDistance - distance);
            position.z += normalZ * (minimumDistance - distance);

            const inwardSpeed = velocity.x * normalX + velocity.z * normalZ;
            if (inwardSpeed < 0) {
                velocity.x -= normalX * inwardSpeed * 1.15;
                velocity.z -= normalZ * inwardSpeed * 1.15;
            }
        }
    }

    private findTerrainHit(start: Vector3, end: Vector3): Vector3 | null {
        const distance = start.distanceTo(end);
        const steps = Math.max(1, Math.min(128, Math.ceil(distance / 4)));
        const sample = new Vector3();

        for (let step = 1; step <= steps; step += 1) {
            sample.lerpVectors(start, end, step / steps);
            const terrainHeight = this.terrain.getHeightAt(sample.x, sample.z);
            if (sample.y <= terrainHeight) {
                sample.y = terrainHeight;
                return sample.clone();
            }
        }
        return null;
    }

    private resolveProjectileBoulderHit(projectile: ProjectileState): boolean {
        for (const boulder of this.terrain.boulders) {
            const center = boulder.position.clone();
            center.y += boulder.height * 0.4;
            const radius = Math.max(boulder.radius, boulder.height * 0.45) +
                ProjectileTypeDefs[projectile.typeId].radius;
            if (
                distanceSqFromPointToSegment3D(
                    center,
                    projectile.previousPosition,
                    projectile.position,
                ) <= radius * radius
            ) return true;
        }
        return false;
    }

    private resolveProjectileHit(
        projectile: ProjectileState,
        damage: number,
    ): boolean {
        const projectileRadius = ProjectileTypeDefs[projectile.typeId].radius;
        const vehicles = this.getVehicleList();

        for (let i = 0; i < vehicles.length; i += 1) {
            const vehicle = vehicles[i];

            if (vehicle.id === projectile.ownerId) {
                continue;
            }

            const vehiclePosition = vehicle.getPosition();
            const vehicleCenter = vehiclePosition.clone();
            vehicleCenter.y += vehicle.getCollisionRadius() * 0.35;
            const hitRadius = projectileRadius + vehicle.getCollisionRadius();
            const distanceSq = distanceSqFromPointToSegment3D(
                vehicleCenter,
                projectile.previousPosition,
                projectile.position,
            );

            if (distanceSq > hitRadius * hitRadius) {
                continue;
            }

            this.visualEffectEvents.push({
                effectId: ProjectileTypeDefs[projectile.typeId].hitEffectId,
                position: projectile.position.clone(),
                direction: projectile.velocity.clone().normalize(),
            });
            if (vehicle.isDestroyed()) {
                return true;
            }

            const wasDestroyed = vehicle.isDestroyed();
            vehicle.takeDamage({
                projectileId: projectile.id,
                projectileTypeId: projectile.typeId,
                shooterId: projectile.ownerId,
                damage,
            });
            if (!wasDestroyed && vehicle.isDestroyed()) {
                const deathEffectPosition = vehicle.getPosition().clone();
                deathEffectPosition.y += vehicle.getCollisionRadius() * 0.35;
                this.visualEffectEvents.push({
                    effectId: vehicle.stats.deathEffectId,
                    position: deathEffectPosition,
                    direction: projectile.velocity.clone().normalize(),
                });
            }
            return true;
        }

        return false;
    }
}

function distanceSqFromPointToSegment3D(
    point: Vector3,
    segmentStart: Vector3,
    segmentEnd: Vector3,
): number {
    const segment = segmentEnd.clone().sub(segmentStart);
    const lengthSq = segment.lengthSq();
    if (lengthSq <= Number.EPSILON) {
        return point.distanceToSquared(segmentStart);
    }

    const amount = Math.max(0, Math.min(
        1,
        point.clone().sub(segmentStart).dot(segment) / lengthSq,
    ));
    return point.distanceToSquared(
        segmentStart.clone().add(segment.multiplyScalar(amount)),
    );
}
