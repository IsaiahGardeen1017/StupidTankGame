export type CameraTuningSettings = {
    height: number;
    lowTiltLimitDeg: number;
    highTiltLimitDeg: number;
    rotateSensitivity: number;
    tiltSensitivity: number;
    distanceBack: number;
    fov: number;
    aimHeight: number;
};

type CameraTuningListener = (settings: CameraTuningSettings) => void;

const DEFAULT_SETTINGS: CameraTuningSettings = {
    height: 8,
    lowTiltLimitDeg: -18,
    highTiltLimitDeg: 9,
    rotateSensitivity: 0.002,
    tiltSensitivity: 0.0015,
    distanceBack: 16,
    fov: 60,
    aimHeight: 0,
};

class CameraTuningStore {
    private settings: CameraTuningSettings = { ...DEFAULT_SETTINGS };
    private readonly listeners = new Set<CameraTuningListener>();

    getSettings(): CameraTuningSettings {
        return { ...this.settings };
    }

    setSetting<K extends keyof CameraTuningSettings>(
        key: K,
        value: CameraTuningSettings[K],
    ): void {
        const nextSettings = {
            ...this.settings,
            [key]: value,
        };

        this.settings = this.normalize(nextSettings);
        this.emit();
    }

    subscribe(listener: CameraTuningListener): () => void {
        this.listeners.add(listener);
        listener(this.getSettings());

        return () => {
            this.listeners.delete(listener);
        };
    }

    private emit(): void {
        const snapshot = this.getSettings();

        this.listeners.forEach((listener) => {
            listener(snapshot);
        });
    }

    private normalize(
        settings: CameraTuningSettings,
    ): CameraTuningSettings {
        const lowTiltLimitDeg = clamp(settings.lowTiltLimitDeg, -89, 0);
        const highTiltLimitDeg = clamp(
            settings.highTiltLimitDeg,
            lowTiltLimitDeg + 1,
            89,
        );

        return {
            height: clamp(settings.height, 1, 40),
            lowTiltLimitDeg,
            highTiltLimitDeg,
            rotateSensitivity: clamp(settings.rotateSensitivity, 0.0005, 0.02),
            tiltSensitivity: clamp(settings.tiltSensitivity, 0.0005, 0.02),
            distanceBack: clamp(settings.distanceBack, 6, 80),
            fov: clamp(settings.fov, 30, 120),
            aimHeight: clamp(settings.aimHeight, -5, 25),
        };
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export const CameraTuning = new CameraTuningStore();
