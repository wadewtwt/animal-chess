// Web Audio API Sound Synthesizer for Jungle Tactics

class AudioEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // AudioContext is lazy initialsied on first play to bypass browser policy
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  // Play bubbly tap click
  public playClick() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Play soft slide move sound
  public playMove() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(450, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Play wooden selection clock tick
  public playTick() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Play dynamic animal capture chomp
  public playCapture() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Pitch sweep
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(250, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.26);

      // Crunch sound (White noise or higher pitch frequency modulation)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(180, now);
      osc2.frequency.setValueAtTime(110, now + 0.08);
      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.23);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Warning when trapped
  public playTrapAlert() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(220, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.setValueAtTime(0.10, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.24);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Level up success chord
  public playSuccess() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        gain.gain.setValueAtTime(0.12, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4 + index * 0.08);

        osc.start(now + index * 0.08);
        osc.stop(now + 0.5 + index * 0.08);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Giant success fanfare when winning the game
  public playWin() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // E4, G4, C5, E5, G5, C6

      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.06);

        gain.gain.setValueAtTime(0.12, now + index * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.6 + index * 0.06);

        osc.start(now + index * 0.06);
        osc.stop(now + 0.7 + index * 0.06);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  // Warning error sound
  public playError() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.setValueAtTime(100, now + 0.1);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }
}

export const jungleAudio = new AudioEngine();
