import { type SoundId, Sounds } from "./presets/sounds";

type PlaySoundOptions = {
    volume?: number;
    playbackRate?: number;
    playbackRateJitter?: number;
};

class AudioManagerSingleton {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private readonly buffers = new Map<SoundId, AudioBuffer>();
    private readonly activeVoiceCounts = new Map<SoundId, number>();
    private activeVoiceTotal = 0;
    private readonly maxVoicesPerSound = 12;
    private readonly maxVoicesTotal = 24;
    private initializePromise: Promise<void> | null = null;
    private hasUnlockListeners = false;
    private masterVolume = 0.45;

    initialize(): Promise<void> {
        if (this.initializePromise) {
            return this.initializePromise;
        }

        this.audioContext = new AudioContext();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 10;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.16;

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.audioContext.destination);

        this.installUnlockListeners();

        this.initializePromise = this.preloadSounds();
        return this.initializePromise;
    }

    async playSound(
        soundId: SoundId,
        options: PlaySoundOptions = {},
    ): Promise<void> {
        await this.initialize();

        if (
            !this.audioContext ||
            !this.masterGain ||
            this.activeVoiceTotal >= this.maxVoicesTotal
        ) {
            return;
        }

        const activeVoiceCount = this.activeVoiceCounts.get(soundId) ?? 0;
        if (activeVoiceCount >= this.maxVoicesPerSound) {
            return;
        }

        const buffer = this.buffers.get(soundId);
        if (!buffer) {
            return;
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const playbackRate = options.playbackRate ?? 1;
        const playbackRateJitter = options.playbackRateJitter ?? 0;

        source.buffer = buffer;
        source.playbackRate.value = playbackRate +
            ((Math.random() * 2) - 1) * playbackRateJitter;
        gainNode.gain.value = options.volume ?? 1;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        this.activeVoiceCounts.set(soundId, activeVoiceCount + 1);
        this.activeVoiceTotal += 1;

        source.onended = () => {
            gainNode.disconnect();
            source.disconnect();
            this.activeVoiceTotal = Math.max(0, this.activeVoiceTotal - 1);

            const nextVoiceCount = (this.activeVoiceCounts.get(soundId) ?? 1) -
                1;
            if (nextVoiceCount <= 0) {
                this.activeVoiceCounts.delete(soundId);
                return;
            }

            this.activeVoiceCounts.set(soundId, nextVoiceCount);
        };

        source.start();
    }

    getMasterVolume(): number {
        return this.masterVolume;
    }

    setMasterVolume(volume: number): void {
        this.masterVolume = Math.min(1, Math.max(0, volume));

        if (!this.audioContext || !this.masterGain) {
            return;
        }

        this.masterGain.gain.setValueAtTime(
            this.masterVolume,
            this.audioContext.currentTime,
        );
    }

    private async preloadSounds(): Promise<void> {
        if (!this.audioContext) {
            return;
        }

        const entries = Object.entries(Sounds) as [SoundId, string][];

        await Promise.all(entries.map(async ([soundId, soundUrl]) => {
            const response = await fetch(soundUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext!.decodeAudioData(
                arrayBuffer,
            );

            this.buffers.set(soundId, audioBuffer);
        }));
    }

    private installUnlockListeners(): void {
        if (this.hasUnlockListeners) {
            return;
        }

        const unlockAudio = () => {
            void this.audioContext?.resume();

            if (this.audioContext?.state === "running") {
                window.removeEventListener("pointerdown", unlockAudio);
                window.removeEventListener("keydown", unlockAudio);
                this.hasUnlockListeners = false;
            }
        };

        window.addEventListener("pointerdown", unlockAudio, { passive: true });
        window.addEventListener("keydown", unlockAudio);
        this.hasUnlockListeners = true;
    }
}

export const AudioManager = new AudioManagerSingleton();
