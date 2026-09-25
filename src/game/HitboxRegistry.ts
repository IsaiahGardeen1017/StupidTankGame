import { Vector3 } from "three";

export type DebugHitbox = {
    id: string;
    center: Vector3;
    size: Vector3;
    color?: string;
};

export type HitboxProvider = () => readonly DebugHitbox[];

export class HitboxRegistry {
    private readonly providers = new Map<string, HitboxProvider>();

    registerSource(sourceId: string, provider: HitboxProvider): () => void {
        if (this.providers.has(sourceId)) {
            throw new Error(`Hitbox source "${sourceId}" is already registered.`);
        }

        this.providers.set(sourceId, provider);
        return () => {
            if (this.providers.get(sourceId) === provider) {
                this.providers.delete(sourceId);
            }
        };
    }

    getHitboxes(): DebugHitbox[] {
        const hitboxes: DebugHitbox[] = [];
        for (const provider of this.providers.values()) {
            hitboxes.push(...provider());
        }
        return hitboxes;
    }
}
