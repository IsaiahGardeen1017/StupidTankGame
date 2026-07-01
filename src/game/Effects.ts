import {
    BoxGeometry,
    Group,
    MathUtils,
    Mesh,
    MeshStandardMaterial,
    Scene,
    SphereGeometry,
    Vector3,
} from "three";

export type EffectId = "blue20mmHit" | "vehicleDeathExplosion";

export type VisualEffectSpawnEvent = {
    effectId: EffectId;
    position: Vector3;
    direction?: Vector3;
};

type SphereFlashDef = {
    color: string; // Base tint applied to the flash mesh and its emissive glow.
    startScale: number; // Initial world-space size multiplier when the flash spawns.
    endScale: number; // Final world-space size multiplier reached by the end of the effect.
    startOpacity: number; // Opacity at spawn time.
    endOpacity: number; // Opacity at the end of the flash lifetime.
    emissiveIntensity: number; // Strength of the emissive light-like glow.
};

type CubeBurstDef = {
    color: string; // Base tint applied to each cube particle and its emissive glow.
    count: number; // Number of cube particles emitted by this burst.
    size: number; // Base cube size before start/end scale multipliers are applied.
    startScale: number; // Particle scale multiplier at spawn time.
    endScale: number; // Particle scale multiplier at the end of the effect.
    startOpacity: number; // Particle opacity at spawn time.
    endOpacity: number; // Particle opacity at the end of the effect.
    speedMin: number; // Minimum launch speed assigned to emitted particles.
    speedMax: number; // Maximum launch speed assigned to emitted particles.
    gravity: number; // Downward acceleration applied to particles over time.
    drag: number; // Per-second velocity damping that slows particles down.
    outwardBias: number; // How strongly particle motion is pushed toward the supplied effect direction.
    verticalBias: number; // Extra upward lift added to the launch direction before normalization.
};

type EffectDef = {
    lifetime: number;
    sphereFlashes: SphereFlashDef[];
    cubeBursts: CubeBurstDef[];
};

const SHARED_FLASH_GEOMETRY = new SphereGeometry(1, 10, 10);
const SHARED_CUBE_GEOMETRY = new BoxGeometry(1, 1, 1);

const EFFECT_DEFS: Record<EffectId, EffectDef> = {
    blue20mmHit: {
        lifetime: 1.0,
        sphereFlashes: [
            /*
            {
                color: "#d6f7ff",
                startScale: 0.35,
                endScale: 1.4,
                startOpacity: 0.95,
                endOpacity: 0,
                emissiveIntensity: 2.8,
            },
            */
        ],
        cubeBursts: [
            {
                color: "#6fdfff",
                count: 6,
                size: 0.22,
                startScale: 1,
                endScale: 0.25,
                startOpacity: 0.9,
                endOpacity: 0,
                speedMin: 15,
                speedMax: 30,
                gravity: 28,
                drag: 4,
                outwardBias: 2.5,
                verticalBias: 0.3,
            },
        ],
    },
    vehicleDeathExplosion: {
        lifetime: 0.5,
        sphereFlashes: [
            {
                color: "#fff1a8",
                startScale: 1.5,
                endScale: 8,
                startOpacity: 0.95,
                endOpacity: 0,
                emissiveIntensity: 2.4,
            },
            {
                color: "#ff9248",
                startScale: 2.2,
                endScale: 10.5,
                startOpacity: 0.6,
                endOpacity: 0,
                emissiveIntensity: 1.3,
            },
        ],
        cubeBursts: [
            {
                color: "#ff8000",
                count: 14,
                size: 2.0,
                startScale: 1,
                endScale: 1,
                startOpacity: 0.9,
                endOpacity: 0,
                speedMin: 20,
                speedMax: 30,
                gravity: 24,
                drag: 2.2,
                outwardBias: 3.5,
                verticalBias: 0.65,
            },
        ],
    },
};

type SphereFlashState = {
    def: SphereFlashDef;
    mesh: Mesh;
    material: MeshStandardMaterial;
};

type CubeParticleState = {
    def: CubeBurstDef;
    mesh: Mesh;
    material: MeshStandardMaterial;
    velocity: Vector3;
};

type EffectInstance = {
    age: number;
    lifetime: number;
    root: Group;
    flashes: SphereFlashState[];
    particles: CubeParticleState[];
};

export class EffectSystem {
    private readonly scene: Scene;
    private readonly activeEffects: EffectInstance[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
    }

    spawn(event: VisualEffectSpawnEvent): void {
        const def = EFFECT_DEFS[event.effectId];
        const root = new Group();
        root.position.copy(event.position);

        const flashes = def.sphereFlashes.map((flashDef) => {
            const material = new MeshStandardMaterial({
                color: flashDef.color,
                emissive: flashDef.color,
                emissiveIntensity: flashDef.emissiveIntensity,
                transparent: true,
                opacity: flashDef.startOpacity,
                roughness: 0.35,
                metalness: 0,
                depthWrite: false,
            });
            const mesh = new Mesh(SHARED_FLASH_GEOMETRY, material);
            mesh.scale.setScalar(flashDef.startScale);
            root.add(mesh);

            return {
                def: flashDef,
                mesh,
                material,
            };
        });

        const particles: CubeParticleState[] = [];
        for (
            let burstIndex = 0;
            burstIndex < def.cubeBursts.length;
            burstIndex += 1
        ) {
            const burstDef = def.cubeBursts[burstIndex];

            for (
                let particleIndex = 0;
                particleIndex < burstDef.count;
                particleIndex += 1
            ) {
                const material = new MeshStandardMaterial({
                    color: burstDef.color,
                    emissive: burstDef.color,
                    emissiveIntensity: 0.75,
                    transparent: true,
                    opacity: burstDef.startOpacity,
                    roughness: 0.5,
                    metalness: 0,
                });
                const mesh = new Mesh(SHARED_CUBE_GEOMETRY, material);
                mesh.scale.setScalar(burstDef.size * burstDef.startScale);
                mesh.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                );

                const velocity = this.createParticleVelocity(
                    event.direction,
                    burstDef,
                );
                root.add(mesh);
                particles.push({
                    def: burstDef,
                    mesh,
                    material,
                    velocity,
                });
            }
        }

        const effect = {
            age: 0,
            lifetime: def.lifetime,
            root,
            flashes,
            particles,
        };

        this.activeEffects.push(effect);
        this.scene.add(root);
    }

    update(deltaTime: number): void {
        for (let i = this.activeEffects.length - 1; i >= 0; i -= 1) {
            const effect = this.activeEffects[i];
            effect.age += deltaTime;
            const t = Math.min(effect.age / effect.lifetime, 1);

            for (
                let flashIndex = 0;
                flashIndex < effect.flashes.length;
                flashIndex += 1
            ) {
                const flash = effect.flashes[flashIndex];
                const scale = MathUtils.lerp(
                    flash.def.startScale,
                    flash.def.endScale,
                    t,
                );
                flash.mesh.scale.setScalar(scale);
                flash.material.opacity = MathUtils.lerp(
                    flash.def.startOpacity,
                    flash.def.endOpacity,
                    t,
                );
            }

            for (
                let particleIndex = 0;
                particleIndex < effect.particles.length;
                particleIndex += 1
            ) {
                const particle = effect.particles[particleIndex];
                particle.velocity.multiplyScalar(
                    Math.max(0, 1 - particle.def.drag * deltaTime),
                );
                particle.velocity.y -= particle.def.gravity * deltaTime;
                particle.mesh.position.addScaledVector(
                    particle.velocity,
                    deltaTime,
                );
                particle.mesh.rotation.x += deltaTime * 8;
                particle.mesh.rotation.y += deltaTime * 6;

                const particleScale = MathUtils.lerp(
                    particle.def.startScale,
                    particle.def.endScale,
                    t,
                );
                particle.mesh.scale.setScalar(
                    particle.def.size * particleScale,
                );
                particle.material.opacity = MathUtils.lerp(
                    particle.def.startOpacity,
                    particle.def.endOpacity,
                    t,
                );
            }

            if (effect.age < effect.lifetime) {
                continue;
            }

            this.disposeEffect(effect);
            this.activeEffects.splice(i, 1);
        }
    }

    dispose(): void {
        for (let i = 0; i < this.activeEffects.length; i += 1) {
            this.disposeEffect(this.activeEffects[i]);
        }
        this.activeEffects.length = 0;
    }

    private createParticleVelocity(
        direction: Vector3 | undefined,
        burstDef: CubeBurstDef,
    ): Vector3 {
        const forward = direction?.clone().normalize() ?? new Vector3(0, 1, 0);
        const randomDirection = new Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
        ).normalize();
        const blendedDirection = randomDirection.multiplyScalar(
            1 - burstDef.outwardBias,
        ).add(
            forward.multiplyScalar(burstDef.outwardBias),
        );

        blendedDirection.y += burstDef.verticalBias;
        if (blendedDirection.lengthSq() < 0.0001) {
            blendedDirection.set(0, 1, 0);
        }
        blendedDirection.normalize();

        return blendedDirection.multiplyScalar(
            MathUtils.lerp(burstDef.speedMin, burstDef.speedMax, Math.random()),
        );
    }

    private disposeEffect(effect: EffectInstance): void {
        this.scene.remove(effect.root);

        for (let i = 0; i < effect.flashes.length; i += 1) {
            effect.flashes[i].material.dispose();
        }

        for (let i = 0; i < effect.particles.length; i += 1) {
            effect.particles[i].material.dispose();
        }
    }
}
