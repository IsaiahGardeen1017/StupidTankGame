import {
    AmbientLight,
    Box3,
    Color,
    DataTexture,
    DirectionalLight,
    Group,
    Material,
    Matrix4,
    Mesh,
    MeshStandardMaterial,
    NearestFilter,
    Object3D,
    PerspectiveCamera,
    PlaneGeometry,
    Quaternion,
    RepeatWrapping,
    Scene,
    SphereGeometry,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";
import { CameraTuning } from "./CameraTuning";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectSystem } from "./Effects";
import type { HoverGroundVehicle } from "./GameEntities/Vehicle";
import { HudOverlaySystem } from "./HudOverlaySystem";
import type { Simulation } from "./Simulation";
import {
    GlbData,
    type GlbIds,
    type GlbMetadata,
} from "./presets/assets";
import {
    getProjectileColor,
    type ProjectileState,
    ProjectileTypeDefs,
} from "./presets/Projectiles";
import {
    getVehicleDetails,
    type VehicleDetailGuns,
    type VehicleDetails,
    type VehicleDetailHull,
    type VehicleDetailTurret,
} from "./presets/vehicles";
import { randInt } from "./utils";
import { hashFromColor, rgb, rgbFromColor } from "./utils_color";

const GROUND_SIZE = 1000;
const MIN_DIRECTION_LENGTH_SQUARED = 0.0001;
const DESTROYED_VEHICLE_COLOR = new Color("#1b1a18");
const VEHICLE_MODEL_FORWARD_ALIGNMENT_Y = Math.PI;
const CAMERA_LOOK_DISTANCE = 200;

type VehicleRenderState = {
    root: Group;
    materials: MeshStandardMaterial[];
};

type ProjectileRenderState = {
    root: Group;
    materials: MeshStandardMaterial[];
    meshes: Mesh[];
};

type GlbTemplate = {
    metadata: GlbMetadata;
    namedObjects: Map<string, Object3D>;
};

type MountedParentMetadata = {
    gunMountPointIds: string[];
    turretMountPointIds: string[];
};

type AssembledPart = {
    root: Object3D;
    materials: MeshStandardMaterial[];
};

type RelativeTransform = {
    position: Vector3;
    quaternion: Quaternion;
    scale: Vector3;
};

export class ThreeJsEngine {
    private readonly canvas: HTMLCanvasElement;
    private readonly sim: Simulation;
    private readonly renderer: WebGLRenderer;
    private readonly scene = new Scene();
    private readonly cam = new PerspectiveCamera(60, 1, 0.1, 2500);
    private readonly effectSystem: EffectSystem;
    private readonly hudOverlaySystem: HudOverlaySystem;
    private readonly vehicleGroups = new Map<string, VehicleRenderState>();
    private readonly projectileMeshes = new Map<
        string,
        ProjectileRenderState
    >();
    private readonly gltfLoader = new GLTFLoader();
    private readonly glbTemplateCache = new Map<GlbIds, Promise<GlbTemplate>>();
    private cameraYaw = 0;
    private cameraPitchOffset = 0;

    constructor(
        canvas: HTMLCanvasElement,
        sim: Simulation,
        hudContainer: HTMLElement,
    ) {
        this.canvas = canvas;
        this.sim = sim;
        this.renderer = new WebGLRenderer({
            antialias: true,
            canvas: this.canvas,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.effectSystem = new EffectSystem(this.scene);
        this.hudOverlaySystem = new HudOverlaySystem(hudContainer, this.canvas);
        this.getOrCreateVehicleGroup(this.sim.getPlayerVehicle());
        this.setupScene();
    }

    private createVehicleGroup(
        vehicle: HoverGroundVehicle,
    ): VehicleRenderState {
        const vehicleRoot = new Group();
        const vehicleState: VehicleRenderState = {
            root: vehicleRoot,
            materials: [],
        };

        void this.populateVehicleGroup(vehicleRoot, vehicleState, vehicle)
            .catch((error: unknown) => {
                console.error(
                    `Failed to build vehicle model "${vehicle.stats.meshId}".`,
                    error,
                );
            });

        return vehicleState;
    }

    private async populateVehicleGroup(
        vehicleRoot: Group,
        vehicleState: VehicleRenderState,
        vehicle: HoverGroundVehicle,
    ): Promise<void> {
        const vehicleDetails = getVehicleDetails(vehicle.stats.meshId);
        const assemblyRoot = await this.buildVehicleAssembly(vehicleDetails);

        vehicleRoot.clear();
        vehicleRoot.add(assemblyRoot.root);
        vehicleState.materials.splice(
            0,
            vehicleState.materials.length,
            ...assemblyRoot.materials,
        );
    }

    private async buildVehicleAssembly(
        vehicleDetails: VehicleDetails,
    ): Promise<AssembledPart> {
        const root = new Group();
        const materials: MeshStandardMaterial[] = [];
        const hullPart = await this.clonePart(
            vehicleDetails.hull.glb,
            vehicleDetails.hull.objectName,
        );

        root.add(hullPart.root);
        materials.push(...hullPart.materials);

        const hullMetadata = this.getHullMetadata(vehicleDetails.hull);

        for (let i = 0; i < vehicleDetails.hull.guns.length; i += 1) {
            const gunPart = await this.buildMountedGun(
                hullPart.root,
                hullMetadata,
                vehicleDetails.hull.guns[i],
            );
            materials.push(...gunPart.materials);
        }

        for (let i = 0; i < vehicleDetails.hull.turrets.length; i += 1) {
            const turretPart = await this.buildMountedTurret(
                hullPart.root,
                hullMetadata,
                vehicleDetails.hull.turrets[i],
            );
            materials.push(...turretPart.materials);
        }

        root.rotation.y = VEHICLE_MODEL_FORWARD_ALIGNMENT_Y;
        this.centerAssembly(root);

        return {
            root,
            materials,
        };
    }

    private async buildMountedTurret(
        parentRoot: Object3D,
        parentMetadata: MountedParentMetadata,
        turretDef: VehicleDetailTurret,
    ): Promise<AssembledPart> {
        const sourceMountPointId = parentMetadata.turretMountPointIds[0];

        if (!sourceMountPointId) {
            throw new Error(
                `No prototype turret mount point configured for "${turretDef.objectName}".`,
            );
        }

        const targetMountPoint = this.getNamedDescendant(
            parentRoot,
            turretDef.parentMountpointId,
        );
        const turretPart = await this.clonePart(
            turretDef.glb,
            turretDef.objectName,
        );

        this.attachPartToMountPoint(
            turretPart.root,
            targetMountPoint,
            await this.getRelativeTransform(
                turretDef.glb,
                turretDef.objectName,
                sourceMountPointId,
            ),
        );

        const turretMetadata = this.getTurretMetadata(turretDef);

        for (let i = 0; i < turretDef.guns.length; i += 1) {
            const gunPart = await this.buildMountedGun(
                turretPart.root,
                turretMetadata,
                turretDef.guns[i],
            );
            turretPart.materials.push(...gunPart.materials);
        }

        return turretPart;
    }

    private async buildMountedGun(
        parentRoot: Object3D,
        parentMetadata: MountedParentMetadata,
        gunDef: VehicleDetailGuns,
    ): Promise<AssembledPart> {
        const sourceMountPointId = parentMetadata.gunMountPointIds[0];

        if (!sourceMountPointId) {
            throw new Error(
                `No prototype gun mount point configured for "${gunDef.objectName}".`,
            );
        }

        const targetMountPoint = this.getNamedDescendant(
            parentRoot,
            gunDef.parentMountpointId,
        );
        const gunPart = await this.clonePart(gunDef.glb, gunDef.objectName);

        this.attachPartToMountPoint(
            gunPart.root,
            targetMountPoint,
            await this.getRelativeTransform(
                gunDef.glb,
                gunDef.objectName,
                sourceMountPointId,
            ),
        );

        return gunPart;
    }

    private attachPartToMountPoint(
        partRoot: Object3D,
        targetMountPoint: Object3D,
        relativeTransform: RelativeTransform,
    ): void {
        partRoot.position.copy(relativeTransform.position);
        partRoot.quaternion.copy(relativeTransform.quaternion);
        partRoot.scale.copy(relativeTransform.scale);
        targetMountPoint.add(partRoot);
    }

    private async getRelativeTransform(
        glbId: GlbIds,
        objectName: string,
        mountPointId: string,
    ): Promise<RelativeTransform> {
        const template = await this.getGlbTemplate(glbId);
        const sourceObject = this.getNamedTemplateObject(template, objectName);
        const sourceMountPoint = this.getNamedTemplateObject(
            template,
            mountPointId,
        );
        const relativeMatrix = new Matrix4()
            .copy(sourceMountPoint.matrixWorld)
            .invert()
            .multiply(sourceObject.matrixWorld);
        const position = new Vector3();
        const quaternion = new Quaternion();
        const scale = new Vector3();

        relativeMatrix.decompose(position, quaternion, scale);

        return {
            position,
            quaternion,
            scale,
        };
    }

    private async clonePart(
        glbId: GlbIds,
        objectName: string,
    ): Promise<AssembledPart> {
        const template = await this.getGlbTemplate(glbId);
        const sourceObject = this.getNamedTemplateObject(template, objectName);
        const clonedRoot = sourceObject.clone(true);
        const materials: MeshStandardMaterial[] = [];

        clonedRoot.traverse((node: Object3D) => {
            if (!(node instanceof Mesh)) {
                return;
            }

            if (Array.isArray(node.material)) {
                node.material = node.material.map((material) => {
                    const clonedMaterial = this.cloneVehicleMaterial(material);
                    materials.push(clonedMaterial);
                    return clonedMaterial;
                });
                return;
            }

            const clonedMaterial = this.cloneVehicleMaterial(node.material);
            node.material = clonedMaterial;
            materials.push(clonedMaterial);
        });

        return {
            root: clonedRoot,
            materials,
        };
    }

    private cloneVehicleMaterial(material: Material): MeshStandardMaterial {
        if (material instanceof MeshStandardMaterial) {
            return material.clone();
        }

        const fallbackMaterial = new MeshStandardMaterial({
            roughness: 0.7,
            metalness: 0.2,
        });
        const materialWithColor = material as Material & {
            color?: Color;
        };

        if (materialWithColor.color) {
            fallbackMaterial.color.copy(materialWithColor.color);
        }

        return fallbackMaterial;
    }

    private getHullMetadata(hullDef: VehicleDetailHull): MountedParentMetadata {
        const glbMetadata = GlbData[hullDef.glb];
        const hullMetadata = glbMetadata.hulls.find((hull) =>
            hull.name === hullDef.objectName
        );

        if (!hullMetadata) {
            throw new Error(
                `No hull metadata found for "${hullDef.objectName}" in "${hullDef.glb}".`,
            );
        }

        return {
            gunMountPointIds: hullMetadata.gunMountPoints,
            turretMountPointIds: hullMetadata.turretMountPoints,
        };
    }

    private getTurretMetadata(
        turretDef: VehicleDetailTurret,
    ): MountedParentMetadata {
        const glbMetadata = GlbData[turretDef.glb];
        const turretMetadata = glbMetadata.turrets.find((turret) =>
            turret.name === turretDef.objectName
        );

        if (!turretMetadata) {
            throw new Error(
                `No turret metadata found for "${turretDef.objectName}" in "${turretDef.glb}".`,
            );
        }

        return {
            gunMountPointIds: turretMetadata.gunMountPoints,
            turretMountPointIds: [],
        };
    }

    private centerAssembly(root: Group): void {
        root.updateMatrixWorld(true);

        const bounds = new Box3().setFromObject(root);

        for (let i = 0; i < root.children.length; i += 1) {
            root.children[i].position.y -= bounds.min.y;
        }
    }

    private getNamedDescendant(root: Object3D, objectName: string): Object3D {
        const targetObject = root.getObjectByName(objectName);

        if (!targetObject) {
            throw new Error(`Expected mounted object "${objectName}" was not found.`);
        }

        return targetObject;
    }

    private getNamedTemplateObject(
        template: GlbTemplate,
        objectName: string,
    ): Object3D {
        const namedObject = template.namedObjects.get(objectName);

        if (!namedObject) {
            throw new Error(
                `Object "${objectName}" was not found in "${template.metadata.filename}".`,
            );
        }

        return namedObject;
    }

    private getGlbTemplate(glbId: GlbIds): Promise<GlbTemplate> {
        const cachedTemplate = this.glbTemplateCache.get(glbId);

        if (cachedTemplate) {
            return cachedTemplate;
        }

        const templatePromise = new Promise<GlbTemplate>((resolve, reject) => {
            this.gltfLoader.load(
                `${import.meta.env.BASE_URL}assets/${GlbData[glbId].filename}`,
                (gltf) => {
                    gltf.scene.updateMatrixWorld(true);
                    const namedObjects = new Map<string, Object3D>();

                    gltf.scene.traverse((object: Object3D) => {
                        if (
                            object.name.length === 0 ||
                            namedObjects.has(object.name)
                        ) {
                            return;
                        }

                        namedObjects.set(object.name, object);
                    });

                    resolve({
                        metadata: GlbData[glbId],
                        namedObjects,
                    });
                },
                undefined,
                reject,
            );
        });

        this.glbTemplateCache.set(glbId, templatePromise);
        return templatePromise;
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
            for (let i = 0; i < groupState.materials.length; i += 1) {
                groupState.materials[i].dispose();
            }
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
        const playerDirection = this.sim.getPlayerVehicle().getDirection();

        this.cameraYaw = Math.atan2(playerDirection.x, playerDirection.z);
        this.cameraPitchOffset = 0;
        this.updateCamera();
    }

    handleResize(): void {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.cam.aspect = width / Math.max(height, 1);
        this.cam.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    render(deltaTime: number, lookDelta: Vector2): void {
        this.syncSceneObjects();
        const effectEvents = this.sim.drainVisualEffectEvents();
        const cameraSettings = CameraTuning.getSettings();

        for (let i = 0; i < effectEvents.length; i += 1) {
            this.effectSystem.spawn(effectEvents[i]);
        }
        this.effectSystem.update(deltaTime);

        const entities = this.sim.getVehicleList();

        for (let i = 0; i < entities.length; i += 1) {
            const entity = entities[i];
            const entityGroup = this.getOrCreateVehicleGroup(entity);
            const entityPosition = entity.getPosition().clone().add(
                new Vector3(0, 2, 0),
            );
            const entityDirection = entity.getDirection();

            entityGroup.root.position.copy(entityPosition);

            const vehicleDetails = getVehicleDetails(entity.stats.meshId);
            const baseColor = new Color(hashFromColor(vehicleDetails.color));

            for (
                let materialIndex = 0;
                materialIndex < entityGroup.materials.length;
                materialIndex += 1
            ) {
                const material = entityGroup.materials[materialIndex];

                material.color.copy(
                    entity.isDestroyed() ? DESTROYED_VEHICLE_COLOR : baseColor,
                );
                material.emissive.copy(
                    entity.isDestroyed() ? DESTROYED_VEHICLE_COLOR : baseColor,
                );
                material.emissiveIntensity = entity.isDestroyed()
                    ? 0.15
                    : 0.2;
            }

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

        this.cameraYaw -= lookDelta.x * cameraSettings.rotateSensitivity;
        const basePitch = this.getBasePitch(cameraSettings);
        const nextPitch = this.getClampedPitch(
            basePitch + this.cameraPitchOffset -
                lookDelta.y * cameraSettings.tiltSensitivity,
        );

        this.cameraPitchOffset = nextPitch - basePitch;
        this.updateCamera();
        this.hudOverlaySystem.update(this.sim.aiVehicles, this.cam);
        this.renderer.render(this.scene, this.cam);
    }

    dispose(): void {
        this.effectSystem.dispose();
        this.hudOverlaySystem.dispose();
        this.renderer.dispose();
    }

    private updateCamera(): void {
        const cameraSettings = CameraTuning.getSettings();
        const playerPosition = this.sim.getPlayerVehicle().getPosition().clone();
        const horizontalFollowDistance = Math.max(0.01, cameraSettings.distanceBack);
        const cameraPitch = this.getClampedPitch(
            this.getBasePitch(cameraSettings) + this.cameraPitchOffset,
        );
        const orbitOffset = new Vector3(
            Math.sin(this.cameraYaw) * horizontalFollowDistance,
            cameraSettings.height,
            Math.cos(this.cameraYaw) * horizontalFollowDistance,
        );
        const cosPitch = Math.cos(cameraPitch);
        const lookDirection = new Vector3(
            -Math.sin(this.cameraYaw) * cosPitch,
            Math.sin(cameraPitch),
            -Math.cos(this.cameraYaw) * cosPitch,
        );
        const lookTarget = playerPosition.clone();

        this.cam.position.copy(playerPosition).add(orbitOffset);
        lookTarget.copy(this.cam.position).add(
            lookDirection.multiplyScalar(CAMERA_LOOK_DISTANCE),
        );
        if (this.cam.fov !== cameraSettings.fov) {
            this.cam.fov = cameraSettings.fov;
            this.cam.updateProjectionMatrix();
        }
        this.cam.lookAt(lookTarget);
    }

    private getBasePitch(
        cameraSettings: ReturnType<typeof CameraTuning.getSettings>,
    ): number {
        return Math.atan2(
            cameraSettings.aimHeight - cameraSettings.height,
            Math.max(0.01, cameraSettings.distanceBack),
        );
    }

    private getClampedPitch(pitch: number): number {
        const cameraSettings = CameraTuning.getSettings();
        const lowPitch = toRadians(cameraSettings.lowTiltLimitDeg);
        const highPitch = toRadians(cameraSettings.highTiltLimitDeg);

        return Math.min(highPitch, Math.max(lowPitch, pitch));
    }
}

function toRadians(value: number): number {
    return value * (Math.PI / 180);
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
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.needsUpdate = true;

    return texture;
}
