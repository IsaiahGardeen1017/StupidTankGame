import { Vector2 } from "three";
import { GlobalDebugScreen } from "./GlobalDebugScreen";

export class InputController {
    private readonly pressedKeys = new Set<string>();

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.code === "KeyY" && !event.repeat) {
            GlobalDebugScreen.toggle();
        }

        this.pressedKeys.add(event.code);
    };

    private readonly onKeyUp = (event: KeyboardEvent): void => {
        this.pressedKeys.delete(event.code);
    };

    constructor() {
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
    }

    public getMovementAxes(): Vector2 {
        const w = Number(this.isPressed("KeyW"));
        const a = Number(this.isPressed("KeyA"));
        const s = Number(this.isPressed("KeyS"));
        const d = Number(this.isPressed("KeyD"));
        const forward = w - s;
        const lateral = d - a;

        return new Vector2(forward, lateral);
    }

    public getRotationAxes(): number {
        const q = Number(this.isPressed("KeyQ"));
        const e = Number(this.isPressed("KeyE"));
        const rotation = q - e;
        return rotation;
    }

    public dispose(): void {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        this.pressedKeys.clear();
    }

    private isPressed(code: string): boolean {
        return this.pressedKeys.has(code);
    }
}
