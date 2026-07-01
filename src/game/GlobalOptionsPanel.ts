import { AudioManager } from "./AudioManager";

class GlobalOptionsPanelSingleton {
    private root: HTMLElement | null = null;
    private slider: HTMLInputElement | null = null;
    private valueLabel: HTMLSpanElement | null = null;
    private isVisible = false;

    initialize(container: HTMLElement): void {
        if (this.root && this.slider && this.valueLabel) {
            if (!this.root.isConnected) {
                container.appendChild(this.root);
            }

            this.syncVolumeUI();
            return;
        }

        this.root = document.createElement("aside");
        this.root.className = "hud debug-panel debug-panel-hidden options-panel";
        this.root.setAttribute("aria-live", "polite");

        const heading = document.createElement("h2");
        heading.textContent = "Options";

        const volumeRow = document.createElement("label");
        volumeRow.className = "options-row";

        const volumeLabel = document.createElement("span");
        volumeLabel.textContent = "Volume";

        this.valueLabel = document.createElement("span");
        this.valueLabel.className = "options-value";

        this.slider = document.createElement("input");
        this.slider.className = "options-slider";
        this.slider.type = "range";
        this.slider.min = "0";
        this.slider.max = "100";
        this.slider.step = "1";
        this.slider.addEventListener("input", this.handleSliderInput);

        volumeRow.append(volumeLabel, this.valueLabel);
        this.root.append(heading, volumeRow, this.slider);
        container.appendChild(this.root);

        this.syncVolumeUI();
    }

    toggle(): void {
        this.isVisible = !this.isVisible;
        this.root?.classList.toggle("debug-panel-hidden", !this.isVisible);
        this.syncVolumeUI();
    }

    hide(): void {
        this.isVisible = false;
        this.root?.classList.add("debug-panel-hidden");
    }

    private readonly handleSliderInput = (): void => {
        if (!this.slider) {
            return;
        }

        AudioManager.setMasterVolume(Number(this.slider.value) / 100);
        this.syncVolumeUI();
    };

    private syncVolumeUI(): void {
        if (!this.slider || !this.valueLabel) {
            return;
        }

        const volumePercent = Math.round(AudioManager.getMasterVolume() * 100);
        this.slider.value = String(volumePercent);
        this.valueLabel.textContent = `${volumePercent}%`;
    }
}

export const GlobalOptionsPanel = new GlobalOptionsPanelSingleton();
