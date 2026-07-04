import { string } from "three/tsl";
import { type RGB, rgbFromColor } from "../utils_color";
import type { GlbIds } from "./assets";
import type { BlasterIds } from "./blasters";

export type VehicleDetails = {
    glb: GlbIds[];
    vechicleClassName: string;

    color: RGB;
    hull: VehicleDetailHull;
};

export type VehicleDetailHull = {
    glb: GlbIds;
    objectName: string;
    guns: VehicleDetailGuns[];
    turrets: VehicleDetailTurret[];
};

export type VehicleDetailGuns = {
    glb: GlbIds;
    objectName: string;
    parentMountpointId: string;
    blaster: BlasterIds;
};
export type VehicleDetailTurret = {
    glb: GlbIds;
    objectName: string;
    parentMountpointId: string;
    guns: VehicleDetailGuns[];
};

export type VehicleTypes = "CMTB" | "freighter";

export const Defined_Vehicles: Record<VehicleTypes, VehicleDetails> = {
    "freighter": {
        glb: ["CMTB"],
        vechicleClassName: "CMTB",
        color: rgbFromColor("#9cb1c4"),
        hull: {
            glb: "CMTB",
            objectName: "Hull",
            guns: [],
            turrets: [],
        },
    },
    "CMTB": {
        glb: ["CMTB"],
        vechicleClassName: "CMTB",
        color: rgbFromColor("#9cb1c4"),
        hull: {
            glb: "CMTB",
            objectName: "Hull",
            guns: [{
                glb: "CMTB",
                objectName: "Gun",
                parentMountpointId: "Hardpoint_Left",
                blaster: "20mmBlueBlaster",
            }, {
                glb: "CMTB",
                objectName: "Gun",
                parentMountpointId: "Hardpoint_Right",
                blaster: "20mmBlueBlaster",
            }],
            turrets: [{
                glb: "CMTB",
                objectName: "Turret",
                parentMountpointId: "Hardpoint_Turret",
                guns: [{
                    glb: "CMTB",
                    objectName: "Cannon",
                    parentMountpointId: "Hardpoint_Cannon",
                    blaster: "CmctMainCannon",
                }],
            }],
        },
    },
};
