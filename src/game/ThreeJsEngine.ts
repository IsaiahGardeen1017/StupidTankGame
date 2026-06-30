import {
    AmbientLight,
    Box3,
    Color,
    DataTexture,
    DirectionalLight,
    Group,
    Mesh,
    MeshStandardMaterial,
    NearestFilter,
    PerspectiveCamera,
    PlaneGeometry,
    RepeatWrapping,
    Scene,
    SphereGeometry,
    Vector3,
    WebGLRenderer,
} from "three";
import { Meshes } from "./presets/assets";
import type { HoverGroundVehicle } from "./GameEntities/Vehicle";
import type { Simulation } from "./Simulation";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { randInt } from "./utils";
import { hashFromColor, rgb, rgbFromColor } from "./utils_color";
import {
    getProjectileColor,
    type ProjectileState,
    ProjectileTypeDefs,
} from "./Projectiles";

const CAMERA_FOLLOW_DISTANCE = 30;
const CAMERA_FOLLOW_HEIGHT = 10;
const GROUND_SIZE = 1000;
const MIN_DIRECTION_LENGTH_SQUARED = 0.0001;
const DESTROYED_VEHICLE_COLOR = new Color("#1b1a18");

type VehicleRenderState = {
    root: Group;
    material: MeshStandardMaterial;
};

type ProjectileRenderState = {
    root: Group;
    materials: MeshStandardMaterial[];
    meshes: Mesh[];
};

export class ThreeJsEngine {
    private readonly canvas: HTMLCanvasElement;
    private readonly sim: Simulation;
    private readonly renderer: WebGLRenderer;
    private readonly scene = new Scene();
    private readonly cam = new PerspectiveCamera(60, 1, 0.1, 2500);
    private readonly vehicleGroups = new Map<string, VehicleRenderState>();
    private readonly projectileMeshes = new Map<
        string,
        ProjectileRenderState
    >();

    constructor(canvas: HTMLCanvasElement, sim: Simulation) {
        this.canvas = canvas;
        this.sim = sim;
        this.renderer = new WebGLRenderer({
            antialias: true,
            canvas: this.canvas,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.getOrCreateVehicleGroup(this.sim.getPlayerVehicle());
        this.setupScene();
    }

    private createVehicleGroup(
        vehicle: HoverGroundVehicle,
    ): VehicleRenderState {
        const vehicleRoot = new Group();
        const meshDetails = Meshes[vehicle.stats.meshId];
        const vehicleMaterial = new MeshStandardMaterial({
            color: hashFromColor(meshDetails?.color ?? "#85c0ea"),
            roughness: 0.7,
            metalness: 0.2,
        });

        if (!meshDetails) {
            console.error(
                `No mesh metadata found for meshId "${vehicle.stats.meshId}".`,
            );
            return {
                root: vehicleRoot,
                material: vehicleMaterial,
            };
        }

        const loader = new STLLoader();

        loader.load(
            this.getMeshUrl(vehicle),
            (geometry) => {
                geometry.computeVertexNormals();
                geometry.center();

                const mesh = new Mesh(
                    geometry,
                    vehicleMaterial,
                );
                const flatspinRoot = new Group();

                mesh.rotation.x = -Math.PI / 2;
                flatspinRoot.rotation.y = meshDetails.flatspinOffset;
                flatspinRoot.add(mesh);

                const unscaledBounds = new Box3().setFromObject(flatspinRoot);
                const unscaledSize = unscaledBounds.getSize(new Vector3());
                const frontToBackLength = Math.max(unscaledSize.z, 0.0001);
                const modelScale = meshDetails.length / frontToBackLength;

                flatspinRoot.scale.setScalar(modelScale);

                const scaledBounds = new Box3().setFromObject(flatspinRoot);
                flatspinRoot.position.y = -scaledBounds.min.y;

                vehicleRoot.add(flatspinRoot);
            },
            undefined,
            (error) => {
                console.error(
                    `Failed to load STL model "${meshDetails.stlFileName}".`,
                    error,
                );
            },
        );

        return {
            root: vehicleRoot,
            material: vehicleMaterial,
        };
    }

    private getOrCreateVehicleGroup(
        vehicle: HoverGroundVehicle,
    ): VehicleRenderState {
        const existingGroup = this.vehicleGroups.get(vehicle.id);

        if (existingGroup) {
            return existingGroup;
        }

        const newGroup = this.createVehicleGroup(vehicle);
        this.vehicleGroups.set(vehicle.id, newGroup);
        return newGroup;
    }

    private getOrCreateProjectileMesh(
        projectile: ProjectileState,
    ): ProjectileRenderState {
        const existingMesh = this.projectileMeshes.get(projectile.id);

        if (existingMesh) {
            return existingMesh;
        }

        const projectileDef = ProjectileTypeDefs[projectile.typeId];
        const projectileColor = getProjectileColor(projectile.typeId);
        const projectileRoot = new Group();
        const projectileMaterial = new MeshStandardMaterial({
            color: projectileColor,
            emissive: projectileColor,
            emissiveIntensity: 1.5,
            roughness: 0.2,
            metalness: 0,
        });
        const projectileMesh = new Mesh(
            new SphereGeometry(projectileDef.renderRadius, 12, 12),
            projectileMaterial,
        );
        projectileRoot.add(projectileMesh);

        const projectileState = {
            root: projectileRoot,
            materials: [projectileMaterial],
            meshes: [projectileMesh],
        };
        this.projectileMeshes.set(projectile.id, projectileState);
        return projectileState;
    }

    private syncSceneObjects(): void {
        const vehicles = this.sim.getVehicleList();
        const projectiles = this.sim.getProjectileList();
        const activeVehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
        const activeProjectileIds = new Set(
            projectiles.map((projectile) => projectile.id),
        );

        for (let i = 0; i < vehicles.length; i += 1) {
            const entityGroup = this.getOrCreateVehicleGroup(vehicles[i]).root;

            if (entityGroup.parent !== this.scene) {
                this.scene.add(entityGroup);
            }
        }

        for (let i = 0; i < projectiles.length; i += 1) {
            const projectileMesh =
                this.getOrCreateProjectileMesh(projectiles[i]).root;

            if (projectileMesh.parent !== this.scene) {
                this.scene.add(projectileMesh);
            }
        }

        this.vehicleGroups.forEach((groupState, id) => {
            if (activeVehicleIds.has(id)) {
                return;
            }

            this.scene.remove(groupState.root);
            groupState.material.dispose();
            this.vehicleGroups.delete(id);
        });
        this.projectileMeshes.forEach((projectileState, id) => {
            if (activeProjectileIds.has(id)) {
                return;
            }

            this.scene.remove(projectileState.root);

            for (let i = 0; i < projectileState.meshes.length; i += 1) {
                projectileState.meshes[i].geometry.dispose();
            }
            for (let i = 0; i < projectileState.materials.length; i += 1) {
                projectileState.materials[i].dispose();
            }

            this.projectileMeshes.delete(id);
        });
    }

    private getMeshUrl(vehicle: HoverGroundVehicle): string {
        const meshDetails = Meshes[vehicle.stats.meshId];

        if (!meshDetails) {
            throw new Error(
                `No mesh metadata found for meshId "${vehicle.stats.meshId}".`,
            );
        }

        return `/src/assets/${meshDetails.stlFileName}`;
    }
    private setupScene(): void {
        this.scene.background = new Color("#8ec9ff");
        const ambientLight = new AmbientLight("#ffffff", 2.1);
        this.scene.add(ambientLight);

        const sunLight = new DirectionalLight("#fff6d6", 2.8);
        sunLight.position.set(180, 260, 120);
        this.scene.add(sunLight);

        const ground = new Mesh(
            new PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 1, 1),
            new MeshStandardMaterial({ map: createGroundTexture() }),
        );
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        this.syncSceneObjects();

        const playerPosition = this.sim.getPlayerVehicle().getPosition();
        const playerDirection = this.sim.getPlayerVehicle().getDirection()
            .clone()
            .setY(0)
            .normalize();
        const cameraOffset = playerDirection.multiplyScalar(
            CAMERA_FOLLOW_DISTANCE,
        );
        cameraOffset.y = CAMERA_FOLLOW_HEIGHT;

        this.cam.position.copy(playerPosition).add(cameraOffset);
        this.cam.lookAt(playerPosition);
    }

    handleResize(): void {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.cam.aspect = width / Math.max(height, 1);
        this.cam.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    render(): void {
        this.syncSceneObjects();

        const entities = this.sim.getVehicleList();

        for (let i = 0; i < entities.length; i += 1) {
            const entity = entities[i];
            const entityGroup = this.getOrCreateVehicleGroup(entity);
            const entityPosition = entity.getPosition().clone().add(
                new Vector3(0, 2, 0),
            );
            const entityDirection = entity.getDirection();

            entityGroup.root.position.copy(entityPosition);

            const meshDetails = Meshes[entity.stats.meshId];
            const baseColor = new Color(hashFromColor(meshDetails.color));

            entityGroup.material.color.copy(
                entity.isDestroyed() ? DESTROYED_VEHICLE_COLOR : baseColor,
            );
            entityGroup.material.emissive.copy(
                entity.isDestroyed() ? DESTROYED_VEHICLE_COLOR : baseColor,
            );
            entityGroup.material.emissiveIntensity = entity.isDestroyed()
                ? 0.15
                : 0.2;

            if (entityDirection.lengthSq() > MIN_DIRECTION_LENGTH_SQUARED) {
                entityGroup.root.rotation.y = Math.atan2(
                    entityDirection.x,
                    entityDirection.z,
                );
            }
        }

        const projectiles = this.sim.getProjectileList();

        for (let i = 0; i < projectiles.length; i += 1) {
            const projectile = projectiles[i];
            const projectileMesh = this.getOrCreateProjectileMesh(projectile);
            projectileMesh.root.position.copy(projectile.position);
            projectileMesh.root.lookAt(
                projectile.position.clone().add(projectile.velocity),
            );
        }

        const playerVehicle = this.sim.getPlayerVehicle();
        const playerPosition = playerVehicle.getPosition().clone().add(
            new Vector3(0, 2, 0),
        );
        const playerDirection = playerVehicle.getDirection();

        const cameraOffset = playerDirection.clone().setY(0).normalize()
            .multiplyScalar(CAMERA_FOLLOW_DISTANCE);
        cameraOffset.y = CAMERA_FOLLOW_HEIGHT;

        this.cam.position.copy(playerPosition).add(cameraOffset);
        this.cam.lookAt(playerPosition);
        this.renderer.render(this.scene, this.cam);
    }

    dispose(): void {
        this.renderer.dispose();
    }
}

function createGroundTexture(): DataTexture {
    const tileSize = 64;
    const pixels = new Uint8Array(tileSize * tileSize * 4);

    const baseColor = rgbFromColor("#6e531d");
    const variance = 5;
    const pixelationScale = 8;

    const getVarient = () => {
        return rgb(
            randInt(baseColor.r - variance, baseColor.r + variance),
            randInt(baseColor.g - variance, baseColor.g + variance),
            randInt(baseColor.b - variance, baseColor.b + variance),
        );
    };

    for (let y = 0; y < tileSize; y += 1) {
        for (let x = 0; x < tileSize; x += 1) {
            const pixelIndex = (y * tileSize + x) * 4;
            const color = getVarient();

            pixels[pixelIndex] = color.r;
            pixels[pixelIndex + 1] = color.g;
            pixels[pixelIndex + 2] = color.b;
            pixels[pixelIndex + 3] = 255;
        }
    }

    const texture = new DataTexture(pixels, tileSize, tileSize);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(
        Math.floor(64 / pixelationScale),
        Math.floor(64 / pixelationScale),
    );
    //texture.repeat.set(32, 32);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.needsUpdate = true;

    return texture;
}
