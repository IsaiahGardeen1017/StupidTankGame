import { Clock } from "three";
import { InputController } from "./InputController";
import { Simulation } from "./Simulation";
import { ThreeJsEngine } from "./ThreeJsEngine";

export class GameApp {
    private readonly clock = new Clock();
    private readonly input: InputController;
    private readonly threeEngine: ThreeJsEngine;
    readonly sim = new Simulation();

    private animationFrameId: number | null = null;
    private simulationAccumulator = 0;

    constructor(canvas: HTMLCanvasElement, hudContainer: HTMLElement) {
        this.input = new InputController(canvas);
        this.threeEngine = new ThreeJsEngine(canvas, this.sim, hudContainer);
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
        const deltaTime = Math.min(this.clock.getDelta(), 0.1);

        this.sim.setPlayerInput(
            this.input.getMovementAxes(),
            this.input.getRotationAxes(),
            this.input.isPrimaryFirePressed(),
        );
        const fixedTimeStep = 1 / 60;
        this.simulationAccumulator += deltaTime;
        let steps = 0;
        while (this.simulationAccumulator >= fixedTimeStep && steps < 6) {
            this.sim.tick(fixedTimeStep);
            this.simulationAccumulator -= fixedTimeStep;
            steps += 1;
        }
        if (steps === 6) {
            this.simulationAccumulator = 0;
        }
        this.threeEngine.render(deltaTime, this.input.consumeLookDelta());

        this.animationFrameId = window.requestAnimationFrame(this.renderFrame);
    };
}
