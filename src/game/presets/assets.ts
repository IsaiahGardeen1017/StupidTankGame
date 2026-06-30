import { type RGB, rgbFromColor } from "../utils_color";

export type AssetDetails = {
    stlFileName: string;
    flatspinOffset: number;
    length: number; //Meters
    color: RGB;
};

export const Meshes: Record<string, AssetDetails> = {
    "clone-tank": {
        stlFileName: "Spaceship.stl",
        flatspinOffset: 0,
        length: 8,
        color: rgbFromColor("#9cb1c4"),
    },
    "freighter": {
        stlFileName: "Freighter.stl",
        flatspinOffset: 0,
        length: 15,
        color: rgbFromColor("#7e3423"),
    },
};
