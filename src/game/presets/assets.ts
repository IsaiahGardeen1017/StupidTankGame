export type GlbMetadata = {
    filename: string;
    referenceLengthMeters: number;
    hulls: {
        name: string;
        turretMountPoints: string[];
        gunMountPoints: string[];
    }[];
    turrets: {
        name: string;
        gunMountPoints: string[];
    }[];
    guns: {
        name: string;
    }[];
};
export type GlbIds = "CMTB";

export const GlbData: Record<GlbIds, GlbMetadata> = {
    "CMTB": {
        filename: "CMTB.glb",
        referenceLengthMeters: 8,
        hulls: [{
            name: "Hull",
            turretMountPoints: ["Hardpoint_Turret"],
            gunMountPoints: ["Hardpoint_Left", "Hardpoint_Right"],
        }],
        turrets: [{
            name: "Turret",
            gunMountPoints: ["Hardpoint_Cannon"],
        }],
        guns: [{
            name: "Gun",
        }, {
            name: "Cannon",
        }],
    },
};
