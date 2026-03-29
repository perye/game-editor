export class AudioManager {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  init() {
    if (this.context) return;
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.bgmGain = this.context.createGain();
    this.bgmGain.connect(this.masterGain);
  }

  async loadSound(id: string, dataUrl: string): Promise<void> {
    if (!this.context) this.init();
    if (this.buffers.has(id)) return;

    try {
      const response = await fetch(dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
      this.buffers.set(id, audioBuffer);
    } catch (e) {
      console.warn(`Failed to load sound ${id}:`, e);
    }
  }

  playSound(id: string, volume = 1): void {
    if (!this.context || !this.masterGain) return;
    const buffer = this.buffers.get(id);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(0);
  }

  playBGM(id: string, volume = 0.5): void {
    if (!this.context || !this.bgmGain) return;
    this.stopBGM();

    const buffer = this.buffers.get(id);
    if (!buffer) return;

    this.bgmSource = this.context.createBufferSource();
    this.bgmSource.buffer = buffer;
    this.bgmSource.loop = true;
    this.bgmGain.gain.value = volume;
    this.bgmSource.connect(this.bgmGain);
    this.bgmSource.start(0);
  }

  stopBGM(): void {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch { /* already stopped */ }
      this.bgmSource = null;
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) this.masterGain.gain.value = volume;
  }

  stop(): void {
    this.stopBGM();
  }

  destroy(): void {
    this.stop();
    this.buffers.clear();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}

export const globalAudioManager = new AudioManager();
