import { Meshes } from "./assets";
import { Vector2 } from "three";

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

export function calculateMomentOfIntertia(
    meshId: string,
    weightKg: number,
): number {
    const meshDetails = Meshes[meshId];

    if (!meshDetails) {
        throw new Error(`No mesh metadata found for meshId "${meshId}".`);
    }

    const length = Math.max(meshDetails.length, 0);
    const width = length / 2;
    const massKg = Math.max(weightKg, 0);

    // Approximate the vehicle as a rectangular body rotating around its center
    // on the ground-plane up axis.
    return (massKg * ((length * length) + (width * width))) / 12;
}

export function distanceSqFromPointToSegment2D(
    point: Vector2,
    segmentStart: Vector2,
    segmentEnd: Vector2,
): number {
    const segment = segmentEnd.clone().sub(segmentStart);
    const segmentLengthSq = segment.lengthSq();

    if (segmentLengthSq <= Number.EPSILON) {
        return point.distanceToSquared(segmentStart);
    }

    const fromStartToPoint = point.clone().sub(segmentStart);
    const t = clamp(
        fromStartToPoint.dot(segment) / segmentLengthSq,
        0,
        1,
    );
    const closestPoint = segmentStart.clone().add(segment.multiplyScalar(t));

    return point.distanceToSquared(closestPoint);
}
