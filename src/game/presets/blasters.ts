import type { ProjectileId } from "../Projectiles";

export type BlasterStats = {
    name: string;
    shootCooldown: number;
    projectile: ProjectileId;
    sound: string;
};

export type BlasterIds = "20mmBlueBlaster";

export const BLASTERS: Record<BlasterIds, BlasterStats> = {
    "20mmBlueBlaster": {
        name: "20 mm Blaster",
        shootCooldown: 100,
        projectile: "20mmBlueBlaster",
        sound: "FIRESPRAY_CANNON.wav",
    },
};
