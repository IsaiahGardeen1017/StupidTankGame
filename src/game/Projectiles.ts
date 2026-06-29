import { Color, Vector3 } from "three";
import { newId } from "./idGenerator";

export type ProjectileTypeId = "blaster" | "mass-driver";

export type ProjectileTypeDef = {
    damage: number;
    lifeSeconds: number;
    radius: number;
    muzzleVelocity: number;
    renderColor: string;
    renderRadius: number;
};

export const ProjectileTypeDefs: Record<ProjectileTypeId, ProjectileTypeDef> = {
    "blaster": {
        damage: 25,
        lifeSeconds: 3.0,
        radius: 0.5,
        muzzleVelocity: 500,
        renderColor: "#00d5ff",
        renderRadius: 0.5,
    },
    "mass-driver": {
        damage: 100,
        lifeSeconds: 2.5,
        radius: 1.1,
        muzzleVelocity: 320,
        renderColor: "#dce4ef",
        renderRadius: 0.22,
    },
};

export type ProjectileState = {
    id: string;
    typeId: ProjectileTypeId;
    ownerId: string;
    position: Vector3;
    previousPosition: Vector3;
    velocity: Vector3;
    lifeRemaining: number;
};

export type ProjectileSpawnParams = {
    typeId: ProjectileTypeId;
    ownerId: string;
    position: Vector3;
    direction: Vector3;
    inheritedVelocity?: Vector3;
};

export type ProjectileHit = {
    projectileId: string;
    projectileTypeId: ProjectileTypeId;
    shooterId: string;
    damage: number;
};

export function createProjectile(
    params: ProjectileSpawnParams,
): ProjectileState {
    const def = ProjectileTypeDefs[params.typeId];
    const shotDirection = params.direction.clone().setY(0).normalize();
    const inheritedVelocity = params.inheritedVelocity?.clone() ??
        new Vector3(0, 0, 0);

    return {
        id: newId(),
        typeId: params.typeId,
        ownerId: params.ownerId,
        position: params.position.clone(),
        previousPosition: params.position.clone(),
        velocity: shotDirection.multiplyScalar(def.muzzleVelocity)
            .add(inheritedVelocity),
        lifeRemaining: def.lifeSeconds,
    };
}

export function getProjectileColor(typeId: ProjectileTypeId): Color {
    return new Color(ProjectileTypeDefs[typeId].renderColor);
}
