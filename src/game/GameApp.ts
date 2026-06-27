import {
    AmbientLight,
    Clock,
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
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { InputController } from "./InputController";
import spaceshipModelUrl from "../assets/Spaceship.stl?url";
import { clamp, randInt } from "./utils";
import { rgb, rgbFromColor } from "./utils_color";
import { Simulation } from "./Simulation";

const GROUND_SIZE = 1000;
const HALF_GROUND_SIZE = GROUND_SIZE / 2;
const PLAYER_SIZE = 8;
const CAMERA_OFFSET = new Vector3(0, 70, 90);

export class GameApp {
    private readonly canvas: HTMLCanvasElement;
    private readonly renderer: WebGLRenderer;
    private readonly scene = new Scene();

    private readonly camera = new PerspectiveCamera(60, 1, 0.1, 2500);
    private readonly clock = new Clock();
    readonly input = new InputController();
    private readonly player: Group;

    private animationFrameId: number | null = null;

    private sim = new Simulation(this);

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.renderer = new WebGLRenderer({
            antialias: true,
            canvas: this.canvas,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.scene.background = new Color("#8ec9ff");

        this.setupScene();
        this.handleResize();

        window.addEventListener("resize", this.handleResize);
    }

    public start(): void {
        this.clock.start();
        this.renderFrame();
    }

    public dispose(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }

        window.removeEventListener("resize", this.handleResize);
        this.input.dispose();
        this.renderer.dispose();
    }

    private readonly handleResize = (): void => {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        this.camera.aspect = width / Math.max(height, 1);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    };

    private readonly renderFrame = (): void => {
        const deltaTime = this.clock.getDelta();

        this.sim.tick(deltaTime);

        this.updateCamera();
        this.renderer.render(this.scene, this.camera);

        this.animationFrameId = window.requestAnimationFrame(this.renderFrame);
    };

    private setupScene(): void {
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

        this.scene.add(this.player);

        this.camera.position.copy(CAMERA_OFFSET);
        this.camera.lookAt(this.sim.getPlayerVehilce().getPosition());
    }

    private updateCamera(): void {
        const playerPosition = this.sim.getPlayerVehilce().getPosition();
        this.camera.position.copy(playerPosition).add(CAMERA_OFFSET);
        this.camera.lookAt(playerPosition);
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
