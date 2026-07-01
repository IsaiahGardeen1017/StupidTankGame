import { Color, Vector3 } from "three";
import type { EffectId } from "./Effects";
import { newId } from "./idGenerator";

export type ProjectileId = "20mmBlueBlaster";

export type ProjectileStats = {
    damage: number;
    hitEffectId: EffectId;
    lifeSeconds: number;
    radius: number;
    muzzleVelocity: number;
    renderColor: string;
    renderRadius: number;
};

export const ProjectileTypeDefs: Record<ProjectileId, ProjectileStats> = {
    "20mmBlueBlaster": {
        damage: 25,
        hitEffectId: "blue20mmHit",
        lifeSeconds: 3.0,
        radius: 0.35,
        muzzleVelocity: 500,
        renderColor: "#00d5ff",
        renderRadius: 0.35,
    },
};

export type ProjectileState = {
    id: string;
    typeId: ProjectileId;
    ownerId: string;
    position: Vector3;
    previousPosition: Vector3;
    velocity: Vector3;
    lifeRemaining: number;
};

export type ProjectileSpawnParams = {
    typeId: ProjectileId;
    ownerId: string;
    position: Vector3;
    direction: Vector3;
    inheritedVelocity?: Vector3;
};

export type ProjectileHit = {
    projectileId: string;
    projectileTypeId: ProjectileId;
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

export function getProjectileColor(typeId: ProjectileId): Color {
    return new Color(ProjectileTypeDefs[typeId].renderColor);
}
