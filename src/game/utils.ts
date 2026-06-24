

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function randInt(min: number, max: number): number;
export function randInt(max: number): number;
export function randInt(minOrMax: number, max?: number): number {
    const min = max === undefined ? 0 : minOrMax;
    const upperBound = max === undefined ? minOrMax : max;

    return Math.floor(Math.random() * (upperBound - min + 1)) + min;
}
