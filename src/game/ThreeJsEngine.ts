import {
    AmbientLight,
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
    Vector3,
    WebGLRenderer,
} from "three";
import type { HoverGroundVehicle } from "./GameEntities/Vehicle";
import type { Simulation } from "./Simulation";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { randInt } from "./utils";
import { rgb, rgbFromColor } from "./utils_color";

export type RenderableEntitiy = HoverGroundVehicle;

const CAMERA_OFFSET = new Vector3(0, 10, 30);
const GROUND_SIZE = 1000;

export class ThreeJsEngine {
    private readonly canvas: HTMLCanvasElement;
    private readonly sim: Simulation;
    private readonly renderer: WebGLRenderer;
    private readonly scene = new Scene();
    private readonly cam = new PerspectiveCamera(60, 1, 0.1, 2500);
    private readonly playerGroup: Group;

    constructor(canvas: HTMLCanvasElement, sim: Simulation) {
        this.canvas = canvas;
        this.sim = sim;
        this.renderer = new WebGLRenderer({
            antialias: true,
            canvas: this.canvas,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.playerGroup = this.createPlayer();
        this.setupScene();
    }

    private createPlayer(): Group {
        const simmedPlayer = this.sim.getPlayerVehicle();
        const playerRoot = new Group();

        const loader = new STLLoader();

        loader.load(
            this.getMeshUrl(simmedPlayer),
            (geometry) => {
                geometry.computeVertexNormals();
                geometry.computeBoundingBox();

                const bounds = geometry.boundingBox;

                if (!bounds) {
                    return;
                }

                const size = bounds.getSize(new Vector3());
                const largestDimension = Math.max(size.x, size.y, size.z) || 1;
                const modelScale = 8 / largestDimension;

                geometry.center();

                const mesh = new Mesh(
                    geometry,
                    new MeshStandardMaterial({ color: "#85c0ea" }),
                );

                mesh.scale.setScalar(modelScale);
                mesh.position.y = (size.y * modelScale) / 2;
                mesh.rotation.x = -Math.PI / 2;

                playerRoot.add(mesh);
            },
            undefined,
            (error) => {
                console.error("Failed to load spaceship STL model.", error);
            },
        );

        return playerRoot;
    }

    private getMeshUrl(vehicle: HoverGroundVehicle): string {
        return `/assets/${vehicle.stats.meshId}.stl`;
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

        this.scene.add(this.playerGroup);

        this.cam.position.copy(CAMERA_OFFSET);
        this.cam.lookAt(this.sim.getPlayerVehicle().getPosition());
    }

    handleResize(): void {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.cam.aspect = width / Math.max(height, 1);
        this.cam.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    render(): void {
        const playerVehicle = this.sim.getPlayerVehicle();
        const playerPosition = playerVehicle.getPosition().clone().add(
            new Vector3(0, 2, 0),
        );
        this.playerGroup.position.copy(playerPosition);

        this.cam.position.copy(playerPosition).add(CAMERA_OFFSET);
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

    const baseColor = rgbFromColor("#2d5d27");
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
