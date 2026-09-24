import type { Vector2, Vector3 } from "three";
import {
    CameraTuning,
    type CameraTuningSettings,
} from "./CameraTuning";

type DebugValue = string | number | Vector2 | Vector3;
type SliderBinding = {
    input: HTMLInputElement;
    valueLabel: HTMLSpanElement;
    settingsKey: keyof CameraTuningSettings;
    formatter: (value: number) => string;
};

class GlobalDebugScreenSingleton {
    private readonly values: Record<string, DebugValue> = {};
    private readonly sliderBindings: SliderBinding[] = [];
    private root: HTMLElement | null = null;
    private content: HTMLPreElement | null = null;
    private controls: HTMLDivElement | null = null;
    private isVisible = false;
    private unsubscribeCameraTuning: (() => void) | null = null;

    initialize(container: HTMLElement): void {
        if (this.root && this.content && this.controls) {
            if (!this.root.isConnected) {
                container.appendChild(this.root);
            }

            return;
        }

        this.root = document.createElement("aside");
        this.root.className = "hud debug-panel debug-panel-hidden";
        this.root.setAttribute("aria-live", "polite");

        const heading = document.createElement("h2");
        heading.textContent = "Debug";

        this.content = document.createElement("pre");
        this.content.className = "debug-panel-content";

        this.controls = document.createElement("div");
        this.controls.className = "debug-controls";

        this.root.append(heading, this.controls, this.content);
        container.appendChild(this.root);
        this.buildCameraControls();
        this.unsubscribeCameraTuning = CameraTuning.subscribe((settings) => {
            this.syncCameraControlValues(settings);
        });
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

    hide(): void {
        this.isVisible = false;
        this.root?.classList.add("debug-panel-hidden");
    }

    isOpen(): boolean {
        return this.isVisible;
    }

    dispose(): void {
        this.unsubscribeCameraTuning?.();
        this.unsubscribeCameraTuning = null;
        this.sliderBindings.length = 0;
        this.controls = null;
        this.content = null;
        this.root = null;
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
        this.content.classList.toggle("debug-panel-content-hidden", lines.length === 0);
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

    private buildCameraControls(): void {
        if (!this.controls) {
            return;
        }

        const cameraHeading = document.createElement("h3");
        cameraHeading.className = "debug-controls-heading";
        cameraHeading.textContent = "Camera";
        this.controls.appendChild(cameraHeading);

        this.createCameraSlider({
            label: "Camera height",
            settingsKey: "height",
            min: 1,
            max: 40,
            step: 0.5,
            formatter: (value) => `${value.toFixed(1)}`,
        });
        this.createCameraSlider({
            label: "Camera low tilt limit",
            settingsKey: "lowTiltLimitDeg",
            min: -89,
            max: 0,
            step: 1,
            formatter: (value) => `${value.toFixed(0)}deg`,
        });
        this.createCameraSlider({
            label: "Camera high tilt limit",
            settingsKey: "highTiltLimitDeg",
            min: 0,
            max: 89,
            step: 1,
            formatter: (value) => `${value.toFixed(0)}deg`,
        });
        this.createCameraSlider({
            label: "Camera rotate sensitivity",
            settingsKey: "rotateSensitivity",
            min: 0.0005,
            max: 0.02,
            step: 0.0001,
            formatter: (value) => value.toFixed(4),
        });
        this.createCameraSlider({
            label: "Camera tilt sensitivity",
            settingsKey: "tiltSensitivity",
            min: 0.0005,
            max: 0.02,
            step: 0.0001,
            formatter: (value) => value.toFixed(4),
        });
        this.createCameraSlider({
            label: "Camera distance back",
            settingsKey: "distanceBack",
            min: 6,
            max: 80,
            step: 0.5,
            formatter: (value) => `${value.toFixed(1)}`,
        });
        this.createCameraSlider({
            label: "Fov",
            settingsKey: "fov",
            min: 30,
            max: 120,
            step: 1,
            formatter: (value) => `${value.toFixed(0)}deg`,
        });
        this.createCameraSlider({
            label: "Camera aim height",
            settingsKey: "aimHeight",
            min: -5,
            max: 25,
            step: 0.5,
            formatter: (value) => `${value.toFixed(1)}`,
        });
    }

    private createCameraSlider(config: {
        label: string;
        settingsKey: keyof CameraTuningSettings;
        min: number;
        max: number;
        step: number;
        formatter: (value: number) => string;
    }): void {
        if (!this.controls) {
            return;
        }

        const row = document.createElement("label");
        row.className = "options-row";

        const label = document.createElement("span");
        label.textContent = config.label;

        const valueLabel = document.createElement("span");
        valueLabel.className = "options-value";

        const slider = document.createElement("input");
        slider.className = "options-slider";
        slider.type = "range";
        slider.min = String(config.min);
        slider.max = String(config.max);
        slider.step = String(config.step);
        slider.addEventListener("input", () => {
            CameraTuning.setSetting(config.settingsKey, Number(slider.value));
        });

        row.append(label, valueLabel);
        this.controls.append(row, slider);
        this.sliderBindings.push({
            input: slider,
            valueLabel,
            settingsKey: config.settingsKey,
            formatter: config.formatter,
        });
    }

    private syncCameraControlValues(settings: CameraTuningSettings): void {
        for (let i = 0; i < this.sliderBindings.length; i += 1) {
            const binding = this.sliderBindings[i];
            const value = settings[binding.settingsKey];

            binding.input.value = String(value);
            binding.valueLabel.textContent = binding.formatter(value);
        }
    }
}

export const GlobalDebugScreen = new GlobalDebugScreenSingleton();
