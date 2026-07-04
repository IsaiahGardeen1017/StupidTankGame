import { string } from "three/tsl";
import { type RGB, rgbFromColor } from "../utils_color";

export type AssetDetails = {
    //stlFileName: string;
    FileName: string;
    flatspinOffset: number;
    length: number; //Meters
    color: RGB;
};

export type GlbMetadata = {
    filename: string;
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
