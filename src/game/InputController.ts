import { Vector2 } from "three";

export class InputController {
    private readonly pressedKeys = new Set<string>();

    private readonly onKeyDown = (event: KeyboardEvent): void => {
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
        const forward = Number(this.isPressed("KeyW")) -
            Number(this.isPressed("KeyS"));
        const lateral = Number(this.isPressed("KeyD")) -
            Number(this.isPressed("KeyA"));

        return new Vector2(forward, lateral);
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
