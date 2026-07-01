import { Clock } from "three";
import { InputController } from "./InputController";
import { Simulation } from "./Simulation";
import { ThreeJsEngine } from "./ThreeJsEngine";

export class GameApp {
    private readonly clock = new Clock();
    private readonly input = new InputController();
    private readonly threeEngine: ThreeJsEngine;
    readonly sim = new Simulation();

    private animationFrameId: number | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.threeEngine = new ThreeJsEngine(canvas, this.sim);
        this.threeEngine.handleResize();

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
        this.threeEngine.dispose();
    }

    private readonly handleResize = (): void => {
        this.threeEngine.handleResize();
    };

    private readonly renderFrame = (): void => {
        const deltaTime = this.clock.getDelta();

        this.sim.setPlayerInput(
            this.input.getMovementAxes(),
            this.input.getRotationAxes(),
            this.input.isPrimaryFirePressed(),
        );
        this.sim.tick(deltaTime);
        this.threeEngine.render(deltaTime);

        this.animationFrameId = window.requestAnimationFrame(this.renderFrame);
    };
}
