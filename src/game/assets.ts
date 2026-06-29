export type AssetDetails = {
    stlFileName: string;
    flatspinOffset: number;
    length: number; //Meters
};

export const Meshes: Record<string, AssetDetails> = {
    "clone-tank": {
        stlFileName: "Spaceship.stl",
        flatspinOffset: 0,
        length: 20,
    },
};
