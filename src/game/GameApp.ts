import {
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { InputController } from './InputController';

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

  private readonly player: Mesh;

  private animationFrameId: number | null = null;

  private readonly playerPosition = new Vector3(0, PLAYER_SIZE / 2, 0);

  private readonly cameraTarget = new Vector3();

  private readonly playerVelocity = new Vector3();

  private readonly forwardVector = new Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene.background = new Color('#8ec9ff');

    this.player = this.createPlayer();

    this.setupScene();
    this.handleResize();

    window.addEventListener('resize', this.handleResize);
  }

  public start(): void {
    this.clock.start();
    this.renderFrame();
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize);
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
    this.updateCamera(deltaTime);
    this.renderer.render(this.scene, this.camera);

    this.animationFrameId = window.requestAnimationFrame(this.renderFrame);
  };

  private setupScene(): void {
    const ambientLight = new AmbientLight('#ffffff', 2.1);
    this.scene.add(ambientLight);

    const sunLight = new DirectionalLight('#fff6d6', 2.8);
    sunLight.position.set(180, 260, 120);
    this.scene.add(sunLight);

    const ground = new Mesh(
      new PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 1, 1),
      new MeshStandardMaterial({ color: '#4f9f4f' }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    this.scene.add(this.player);

    this.camera.position.copy(CAMERA_OFFSET);
    this.camera.lookAt(this.playerPosition);
  }

  private createPlayer(): Mesh {
    const mesh = new Mesh(
      new BoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE),
      new MeshStandardMaterial({ color: '#6f7cff' }),
    );

    mesh.position.copy(this.playerPosition);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    return mesh;
  }

  private updatePlayer(deltaTime: number): void {
    const { forward, right } = this.input.getMovementAxes();
    this.playerVelocity.set(right, 0, forward);

    if (this.playerVelocity.lengthSq() > 0) {
      this.playerVelocity.normalize().multiplyScalar(PLAYER_SPEED * deltaTime);
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
      this.player.rotation.y = Math.atan2(this.forwardVector.x, this.forwardVector.z);
    }

    this.player.position.copy(this.playerPosition);
  }

  private updateCamera(deltaTime: number): void {
    this.cameraTarget.copy(this.playerPosition).add(CAMERA_OFFSET);
    this.camera.position.lerp(this.cameraTarget, 1 - Math.exp(-4 * deltaTime));
    this.camera.lookAt(this.playerPosition);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
