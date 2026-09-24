import { Vector2 } from "three";
import { GlobalDebugScreen } from "./GlobalDebugScreen";
import { GlobalOptionsPanel } from "./GlobalOptionsPanel";

export class InputController {
    private readonly targetElement: HTMLElement;
    private readonly pressedKeys = new Set<string>();
    private readonly lookDelta = new Vector2();
    private resumePointerLockOnControlRelease = false;

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.code === "KeyY" && !event.repeat) {
            GlobalOptionsPanel.hide();
            GlobalDebugScreen.toggle();
        }
        if (event.code === "KeyO" && !event.repeat) {
            GlobalDebugScreen.hide();
            GlobalOptionsPanel.toggle();
        }
        if (this.isControlKey(event.code) && !event.repeat) {
            if (document.pointerLockElement === this.targetElement) {
                this.resumePointerLockOnControlRelease = true;
                document.exitPointerLock();
            }

            document.body.classList.add("cursor-interaction-mode");
            this.lookDelta.set(0, 0);
        }

        this.pressedKeys.add(event.code);
    };

    private readonly onKeyUp = (event: KeyboardEvent): void => {
        this.pressedKeys.delete(event.code);

        if (
            this.isControlKey(event.code) &&
            !this.isControlPressed() &&
            this.resumePointerLockOnControlRelease
        ) {
            this.resumePointerLockOnControlRelease = false;
            void this.targetElement.requestPointerLock();
        }

        if (this.isControlKey(event.code) && !this.isControlPressed()) {
            document.body.classList.remove("cursor-interaction-mode");
        }
    };

    private readonly onPointerMove = (event: PointerEvent): void => {
        if (document.pointerLockElement !== this.targetElement) {
            return;
        }

        this.lookDelta.x += event.movementX;
        this.lookDelta.y += event.movementY;
    };

    private readonly onPointerDown = (): void => {
        if (
            document.pointerLockElement === this.targetElement ||
            this.isControlPressed()
        ) {
            return;
        }

        void this.targetElement.requestPointerLock();
    };

    private readonly onPointerLockChange = (): void => {
        this.targetElement.classList.toggle(
            "game-canvas-pointer-locked",
            document.pointerLockElement === this.targetElement,
        );
    };

    constructor(targetElement: HTMLElement) {
        this.targetElement = targetElement;
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("pointermove", this.onPointerMove);
        document.addEventListener("pointerlockchange", this.onPointerLockChange);
        this.targetElement.addEventListener("pointerdown", this.onPointerDown);
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

    public consumeLookDelta(): Vector2 {
        const delta = this.lookDelta.clone();

        this.lookDelta.set(0, 0);
        return delta;
    }

    public dispose(): void {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("pointermove", this.onPointerMove);
        document.removeEventListener("pointerlockchange", this.onPointerLockChange);
        this.targetElement.removeEventListener("pointerdown", this.onPointerDown);
        document.body.classList.remove("cursor-interaction-mode");
        this.pressedKeys.clear();
        this.lookDelta.set(0, 0);
    }

    private isPressed(code: string): boolean {
        return this.pressedKeys.has(code);
    }

    private isControlKey(code: string): boolean {
        return code === "ControlLeft" || code === "ControlRight";
    }

    private isControlPressed(): boolean {
        return this.isPressed("ControlLeft") || this.isPressed("ControlRight");
    }
}
