import cloneTankStlUrl from "../assets/Spaceship.stl?url";
import freighterStlUrl from "../assets/Freighter.stl?url";

export type AssetDetails = {
    stlUrl: string;
    flatspinOffset: number;
    length: number; //Meters
};

export const Meshes: Record<string, AssetDetails> = {
    "clone-tank": {
        stlUrl: cloneTankStlUrl,
        flatspinOffset: 0,
        length: 8,
    },
    "freighter": {
        stlUrl: freighterStlUrl,
        flatspinOffset: 0,
        length: 15,
    },
};
