import cloneTankStlUrl from "../assets/Spaceship.stl?url";
import freighterStlUrl from "../assets/Freighter.stl?url";
import { type RGB, rgbFromColor } from "./utils_color";

export type AssetDetails = {
    stlUrl: string;
    flatspinOffset: number;
    length: number; //Meters
    color: RGB;
};

export const Meshes: Record<string, AssetDetails> = {
    "clone-tank": {
        stlUrl: cloneTankStlUrl,
        flatspinOffset: 0,
        length: 8,
        color: rgbFromColor("#9cb1c4"),
    },
    "freighter": {
        stlUrl: freighterStlUrl,
        flatspinOffset: 0,
        length: 15,
        color: rgbFromColor("#7e3423"),
    },
};
