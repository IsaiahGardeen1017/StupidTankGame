import type { ProjectileId } from "./Projectiles";
import type { SoundId } from "./sounds";

export type BlasterStats = {
    name: string;
    shootCooldown: number;
    projectile: ProjectileId;
    sound: SoundId;
};

export type BlasterIds = "20mmBlueBlaster" | "CmctMainCannon";

export const BLASTERS: Record<BlasterIds, BlasterStats> = {
    "20mmBlueBlaster": {
        name: "20 mm Blaster",
        shootCooldown: 100,
        projectile: "20mmBlueBlaster",
        sound: "DEATHTROOPER_RIFLE",
    },
    "CmctMainCannon": {
        name: "CMBT Main Cannon",
        shootCooldown: 2000,
        projectile: "20mmBlueBlaster",
        sound: "TIE_CANNON",
    },
};
