import { Vector3 } from "three";

export type Boulder = {
    position: Vector3;
    radius: number;
    height: number;
    rotation: number;
};

export type TerrainSettings = {
    seed: number;
    size: number;
    chunkCount: number;
    chunkSegments: number;
    heightAmplitude: number;
    boulderCount: number;
};

export const DEFAULT_TERRAIN_SETTINGS: TerrainSettings = {
    seed: 731_927,
    size: 8_000,
    chunkCount: 8,
    chunkSegments: 32,
    heightAmplitude: 72,
    boulderCount: 160,
};

const NORMAL_SAMPLE_DISTANCE = 2;

export class Terrain {
    readonly settings: TerrainSettings;
    readonly boulders: Boulder[];

    constructor(settings: TerrainSettings = DEFAULT_TERRAIN_SETTINGS) {
        this.settings = { ...settings };
        this.boulders = this.createBoulders();
    }

    getHeightAt(x: number, z: number): number {
        const broadHills = this.fractalNoise(x, z, 850, 4, 0.52);
        const rollingDetail = this.fractalNoise(x + 18_000, z - 9_000, 260, 3, 0.45);
        const rawHeight = (broadHills * 0.78 + rollingDetail * 0.22) *
            this.settings.heightAmplitude;
        const distanceFromStart = Math.hypot(x, z);
        const startBlend = smoothstep(90, 320, distanceFromStart);
        return rawHeight * startBlend;
    }

    getNormalAt(x: number, z: number, target = new Vector3()): Vector3 {
        const step = NORMAL_SAMPLE_DISTANCE;
        const left = this.getHeightAt(x - step, z);
        const right = this.getHeightAt(x + step, z);
        const back = this.getHeightAt(x, z - step);
        const front = this.getHeightAt(x, z + step);
        return target.set(left - right, step * 2, back - front).normalize();
    }

    clampToBounds(position: Vector3, margin = 0): void {
        const extent = Math.max(0, this.settings.size / 2 - margin);
        position.x = Math.max(-extent, Math.min(extent, position.x));
        position.z = Math.max(-extent, Math.min(extent, position.z));
    }

    private fractalNoise(
        x: number,
        z: number,
        baseScale: number,
        octaves: number,
        persistence: number,
    ): number {
        let value = 0;
        let amplitude = 1;
        let totalAmplitude = 0;
        let scale = baseScale;

        for (let octave = 0; octave < octaves; octave += 1) {
            value += this.valueNoise(x / scale, z / scale, octave) * amplitude;
            totalAmplitude += amplitude;
            amplitude *= persistence;
            scale *= 0.5;
        }
        return value / totalAmplitude;
    }

    private valueNoise(x: number, z: number, octave: number): number {
        const x0 = Math.floor(x);
        const z0 = Math.floor(z);
        const tx = smootherstep(x - x0);
        const tz = smootherstep(z - z0);
        const a = this.hash(x0, z0, octave);
        const b = this.hash(x0 + 1, z0, octave);
        const c = this.hash(x0, z0 + 1, octave);
        const d = this.hash(x0 + 1, z0 + 1, octave);
        return lerp(lerp(a, b, tx), lerp(c, d, tx), tz) * 2 - 1;
    }

    private hash(x: number, z: number, octave: number): number {
        let value = Math.imul(x, 374_761_393) +
            Math.imul(z, 668_265_263) +
            Math.imul(this.settings.seed + octave, 1_274_126_177);
        value = Math.imul(value ^ (value >>> 13), 1_274_126_177);
        return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_295;
    }

    private createBoulders(): Boulder[] {
        const result: Boulder[] = [];
        const random = createSeededRandom(this.settings.seed ^ 0x5f3759df);
        const extent = this.settings.size / 2 - 80;
        const minimumSpacing = 55;
        const maxAttempts = this.settings.boulderCount * 30;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            if (result.length >= this.settings.boulderCount) break;
            const x = lerp(-extent, extent, random());
            const z = lerp(-extent, extent, random());
            if (Math.hypot(x, z) < 220) continue;

            const radius = lerp(30, 100, Math.pow(random(), 1.7));
            const isTooClose = result.some((boulder) =>
                Math.hypot(x - boulder.position.x, z - boulder.position.z) <
                    minimumSpacing + radius + boulder.radius
            );
            if (isTooClose) continue;

            result.push({
                position: new Vector3(x, this.getHeightAt(x, z), z),
                radius,
                height: radius * lerp(1.1, 2.0, random()),
                rotation: random() * Math.PI * 2,
            });
        }
        return result;
    }
}

function createSeededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    };
}

function lerp(a: number, b: number, amount: number): number {
    return a + (b - a) * amount;
}

function smootherstep(value: number): number {
    return value * value * value * (value * (value * 6 - 15) + 10);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
    const amount = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return amount * amount * (3 - 2 * amount);
}
