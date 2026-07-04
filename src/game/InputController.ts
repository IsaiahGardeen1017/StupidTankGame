import { Vector2 } from "three";
import { GlobalDebugScreen } from "./GlobalDebugScreen";
import { GlobalOptionsPanel } from "./GlobalOptionsPanel";

export class InputController {
    private readonly targetElement: HTMLElement;
    private readonly pressedKeys = new Set<string>();
    private readonly pointerOffset = new Vector2();

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.code === "KeyY" && !event.repeat) {
            GlobalOptionsPanel.hide();
            GlobalDebugScreen.toggle();
        }
        if (event.code === "KeyO" && !event.repeat) {
            GlobalDebugScreen.hide();
            GlobalOptionsPanel.toggle();
        }

        this.pressedKeys.add(event.code);
    };

    private readonly onKeyUp = (event: KeyboardEvent): void => {
        this.pressedKeys.delete(event.code);
    };

    private readonly onPointerMove = (event: PointerEvent): void => {
        const bounds = this.targetElement.getBoundingClientRect();

        if (bounds.width <= 0 || bounds.height <= 0) {
            this.pointerOffset.set(0, 0);
            return;
        }

        const normalizedX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
        const normalizedY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;

        this.pointerOffset.set(
            Math.max(-1, Math.min(1, normalizedX)),
            Math.max(-1, Math.min(1, normalizedY)),
        );
    };

    private readonly onPointerLeave = (): void => {
        this.pointerOffset.set(0, 0);
    };

    constructor(targetElement: HTMLElement) {
        this.targetElement = targetElement;
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("pointermove", this.onPointerMove);
        this.targetElement.addEventListener("pointerleave", this.onPointerLeave);
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

    public isPrimaryFirePressed(): boolean {
        return this.isPressed("Space");
    }

    public getPointerOffset(): Vector2 {
        return this.pointerOffset.clone();
    }

    public dispose(): void {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("pointermove", this.onPointerMove);
        this.targetElement.removeEventListener("pointerleave", this.onPointerLeave);
        this.pressedKeys.clear();
        this.pointerOffset.set(0, 0);
    }

    private isPressed(code: string): boolean {
        return this.pressedKeys.has(code);
    }
}
