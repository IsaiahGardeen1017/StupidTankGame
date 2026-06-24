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

const GROUND_SIZE = 1000;
const HALF_GROUND_SIZE = GROUND_SIZE / 2;
const PLAYER_SPEED = 95;
const PLAYER_SIZE = 8;
const CAMERA_OFFSET = new Vector3(0, 70, 90);

export class GameApp {
    private readonly canvas: HTMLCanvasElement;

    private readonly renderer: WebGLRenderer;

    private readonly scene = new Scene();

    private readonly camera = new PerspectiveCamera(60, 1, 0.1, 2500);

    private readonly clock = new Clock();

    private readonly input = new InputController();

    private readonly player: Group;

    private animationFrameId: number | null = null;

    private readonly playerPosition = new Vector3(0, 0, 0);

    private readonly playerVelocity = new Vector3();

    private readonly forwardVector = new Vector3();

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.renderer = new WebGLRenderer({
            antialias: true,
            canvas: this.canvas,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.scene.background = new Color("#8ec9ff");

        this.player = this.createPlayer();

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

        this.updatePlayer(deltaTime);
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
        this.camera.lookAt(this.playerPosition);
    }

    private createPlayer(): Group {
        const playerRoot = new Group();
        playerRoot.position.copy(this.playerPosition);

        const loader = new STLLoader();
        loader.load(
            spaceshipModelUrl,
            (geometry) => {
                geometry.computeVertexNormals();
                geometry.computeBoundingBox();

                const bounds = geometry.boundingBox;

                if (!bounds) {
                    return;
                }

                const size = bounds.getSize(new Vector3());
                const largestDimension = Math.max(size.x, size.y, size.z) || 1;
                const modelScale = PLAYER_SIZE / largestDimension;

                geometry.center();

                const mesh = new Mesh(
                    geometry,
                    new MeshStandardMaterial({ color: "#6f7cff" }),
                );

                mesh.scale.setScalar(modelScale);
                mesh.position.y = (size.y * modelScale) / 2;
                mesh.rotation.x = -Math.PI / 2;
                mesh.castShadow = false;
                mesh.receiveShadow = false;

                playerRoot.add(mesh);
            },
            undefined,
            (error) => {
                console.error("Failed to load spaceship STL model.", error);
            },
        );

        return playerRoot;
    }

    private updatePlayer(deltaTime: number): void {
        const { forward, right } = this.input.getMovementAxes();
        this.playerVelocity.set(right, 0, forward);

        if (this.playerVelocity.lengthSq() > 0) {
            this.playerVelocity.normalize().multiplyScalar(
                PLAYER_SPEED * deltaTime,
            );
            this.playerPosition.add(this.playerVelocity);

            this.playerPosition.x = clamp(
                this.playerPosition.x,
                -HALF_GROUND_SIZE + PLAYER_SIZE / 2,
                HALF_GROUND_SIZE - PLAYER_SIZE / 2,
            );
            this.playerPosition.z = clamp(
                this.playerPosition.z,
                -HALF_GROUND_SIZE + PLAYER_SIZE / 2,
                HALF_GROUND_SIZE - PLAYER_SIZE / 2,
            );

            this.forwardVector.copy(this.playerVelocity).normalize();
            this.player.rotation.y = Math.atan2(
                this.forwardVector.x,
                this.forwardVector.z,
            );
        }

        this.player.position.copy(this.playerPosition);
    }

    private updateCamera(): void {
        this.camera.position.copy(this.playerPosition).add(CAMERA_OFFSET);
        this.camera.lookAt(this.playerPosition);
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
