import {
    BoxGeometry,
    Group,
    Mesh,
    MeshBasicMaterial,
    type Scene,
} from "three";
import type { DebugHitbox } from "./HitboxRegistry";

const DEFAULT_HITBOX_COLOR = "#00e5ff";

export class DebugHitboxRenderer {
    private readonly root = new Group();
    private readonly geometry = new BoxGeometry(1, 1, 1);
    private readonly meshes = new Map<string, Mesh>();
    private readonly materials = new Map<string, MeshBasicMaterial>();

    constructor(scene: Scene) {
        this.root.name = "Debug hitboxes";
        this.root.visible = false;
        scene.add(this.root);
    }

    update(hitboxes: readonly DebugHitbox[], isVisible: boolean): void {
        this.root.visible = isVisible;
        if (!isVisible) return;

        const activeIds = new Set<string>();
        for (const hitbox of hitboxes) {
            activeIds.add(hitbox.id);
            const mesh = this.getOrCreateMesh(hitbox);
            mesh.position.copy(hitbox.center);
            mesh.scale.copy(hitbox.size);
        }

        for (const [id, mesh] of this.meshes) {
            if (activeIds.has(id)) continue;
            this.root.remove(mesh);
            this.meshes.delete(id);
        }
    }

    dispose(): void {
        this.root.removeFromParent();
        this.geometry.dispose();
        for (const material of this.materials.values()) material.dispose();
        this.materials.clear();
        this.meshes.clear();
    }

    private getOrCreateMesh(hitbox: DebugHitbox): Mesh {
        const existing = this.meshes.get(hitbox.id);
        if (existing) return existing;

        const color = hitbox.color ?? DEFAULT_HITBOX_COLOR;
        let material = this.materials.get(color);
        if (!material) {
            material = new MeshBasicMaterial({
                color,
                depthWrite: false,
                opacity: 0.24,
                transparent: true,
                wireframe: false,
            });
            this.materials.set(color, material);
        }

        const mesh = new Mesh(this.geometry, material);
        mesh.renderOrder = 1000;
        this.root.add(mesh);
        this.meshes.set(hitbox.id, mesh);
        return mesh;
    }
}
