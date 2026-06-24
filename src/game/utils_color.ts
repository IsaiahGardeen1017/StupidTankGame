export type PackedRGB = number;

export type RGB = {
    type: "rgb";
    r: number;
    g: number;
    b: number;
};

// String means rgb hash
export type ColorValue = RGB | string;
// I might in the future have more color options like hsl

function clampChannel(channel: number): number {
    return Math.max(0, Math.min(255, channel | 0));
}

export function rgbFromColor(color: ColorValue): RGB {
    if (typeof color === "string") {
        const normalized = color.startsWith("#") ? color.slice(1) : color;

        if (normalized.length !== 6) {
            throw new Error(`Invalid RGB hash color: ${color}`);
        }

        const r = Number.parseInt(normalized.slice(0, 2), 16);
        const g = Number.parseInt(normalized.slice(2, 4), 16);
        const b = Number.parseInt(normalized.slice(4, 6), 16);

        if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
            throw new Error(`Invalid RGB hash color: ${color}`);
        }

        return rgb(r, g, b);
    }

    if (color.type === "rgb") {
        return color;
    }

    throw new Error("Unsupported color value");
}

export function hashFromColor(color: ColorValue): string {
    const rgb = rgbFromColor(color);
    return `#${rgb.r.toString(16).padStart(2, "0")}${
        rgb.g
            .toString(16)
            .padStart(2, "0")
    }${rgb.b.toString(16).padStart(2, "0")}`;
}

export function rgb(r: number, g: number, b: number): RGB {
    return {
        type: "rgb",
        r: clampChannel(r),
        g: clampChannel(g),
        b: clampChannel(b),
    };
}
