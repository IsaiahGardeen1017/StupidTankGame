export class InputController {
  private readonly pressedKeys = new Set<string>();

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.pressedKeys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.code);
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public getMovementAxes(): { forward: number; right: number } {
    const forward =
      Number(this.isPressed('KeyW')) - Number(this.isPressed('KeyS'));
    const right = Number(this.isPressed('KeyD')) - Number(this.isPressed('KeyA'));

    return { forward, right };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.pressedKeys.clear();
  }

  private isPressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }
}
