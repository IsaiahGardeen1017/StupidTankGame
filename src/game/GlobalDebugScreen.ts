import type { Vector2, Vector3 } from "three";

type DebugValue = string | number | Vector2 | Vector3;

class GlobalDebugScreenSingleton {
    private readonly values: Record<string, DebugValue> = {};
    private root: HTMLElement | null = null;
    private content: HTMLPreElement | null = null;
    private isVisible = true;

    initialize(container: HTMLElement): void {
        if (this.root && this.content) {
            if (!this.root.isConnected) {
                container.appendChild(this.root);
            }

            return;
        }

        this.root = document.createElement("aside");
        this.root.className = "hud debug-panel";
        this.root.setAttribute("aria-live", "polite");

        const heading = document.createElement("h2");
        heading.textContent = "Debug";

        this.content = document.createElement("pre");
        this.content.className = "debug-panel-content";

        this.root.append(heading, this.content);
        container.appendChild(this.root);
        this.render();
    }

    show(key: string, value: DebugValue): void {
        this.values[key] = value;
        this.render();
    }

    clear(key: string): void {
        delete this.values[key];
        this.render();
    }

    toggle(): void {
        this.isVisible = !this.isVisible;
        this.root?.classList.toggle("debug-panel-hidden", !this.isVisible);
    }

    private render(): void {
        if (!this.content) {
            return;
        }

        const lines: string[] = [];

        for (const key of Object.keys(this.values)) {
            lines.push(`${key}: ${this.formatValue(this.values[key])}`);
        }

        this.content.textContent = lines.join("\n");
    }

    private formatValue(value: DebugValue): string {
        if (typeof value === "string") {
            return value;
        }

        if (typeof value === "number") {
            return this.formatSignedNumber(value);
        }

        if ("z" in value) {
            return `(${this.formatSignedNumber(value.x)},${
                this.formatSignedNumber(value.y)
            },${this.formatSignedNumber(value.z)})`;
        }

        return `(${this.formatSignedNumber(value.x)},${
            this.formatSignedNumber(value.y)
        })`;
    }

    private formatSignedNumber(value: number): string {
        const sign = value < 0 || Object.is(value, -0) ? "-" : " ";
        return `${sign}${Math.abs(value).toFixed(2)}`;
    }
}

export const GlobalDebugScreen = new GlobalDebugScreenSingleton();
