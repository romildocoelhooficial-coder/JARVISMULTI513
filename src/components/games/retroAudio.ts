/**
 * Pure Web Audio API Synthesizer for Authentic 80s Retro Arcade Sound Effects
 * Zero external audio files required, zero latency, guaranteed browser playback.
 */

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.35;
  private ufoOsc: OscillatorNode | null = null;
  private ufoGain: GainNode | null = null;
  private wakaToggle: boolean = false;

  // Ferrari F1 Audio Synthesizer Nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;
  private lastShiftTime: number = 0;
  private lastSkidTime: number = 0;

  // Single-Engine Airplane (Monomotor) Synthesizer Nodes
  private planeOsc1: OscillatorNode | null = null;
  private planeOsc2: OscillatorNode | null = null;
  private planeLfo: OscillatorNode | null = null;
  private planeLfoGain: GainNode | null = null;
  private planeGain: GainNode | null = null;
  private planeFilter: BiquadFilterNode | null = null;
  private isPlaneRunning: boolean = false;
  private lastRingSoundTime: number = 0;

  // Phase 4 Alien Flagship / Mothership Synthesizer Nodes
  private alienMothershipOsc1: OscillatorNode | null = null;
  private alienMothershipOsc2: OscillatorNode | null = null;
  private alienMothershipLfo: OscillatorNode | null = null;
  private alienMothershipLfoGain: GainNode | null = null;
  private alienMothershipFilter: BiquadFilterNode | null = null;
  private alienMothershipGain: GainNode | null = null;
  private isAlienMothershipFlying: boolean = false;

  // Cavaleiro Negro Authentic Intro Audio (MP3 from original arcade)
  private cavaleiroIntroAudio: HTMLAudioElement | null = null;
  // Cavaleiro Negro Active In-Game Continuous Audio (MP3 from original arcade: /assets/aistudio/sonsdojogoativos_520a8f9a.mp3)
  private cavaleiroMatchAudio: HTMLAudioElement | null = null;
  private isCavaleiroMatchPlaying: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      if (this.ufoOsc) this.stopUfo();
      this.stopFerrariEngine();
      this.stopAirplaneEngine();
      this.stopAlienMothershipFlight();
      if (this.cavaleiroIntroAudio) {
        this.cavaleiroIntroAudio.pause();
        this.cavaleiroIntroAudio.currentTime = 0;
      }
      if (this.cavaleiroMatchAudio) {
        this.cavaleiroMatchAudio.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      if (this.isCavaleiroMatchPlaying && this.cavaleiroMatchAudio) {
        this.cavaleiroMatchAudio.play().catch(() => {});
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.cavaleiroIntroAudio) {
      this.cavaleiroIntroAudio.volume = Math.min(1, this.volume * 2.5);
    }
    if (this.cavaleiroMatchAudio) {
      this.cavaleiroMatchAudio.volume = Math.min(1, this.volume * 2.2);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /* ==========================================================================
     SPACE INVADERS SOUND EFFECTS
     ========================================================================== */

  /**
   * Player Laser Cannon Shot: Rapid downward pitch sweep
   */
  public playLaser() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      gain.gain.setValueAtTime(this.volume * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      // safe fallback
    }
  }

  /**
   * Invader Hit Explosion: White noise burst with low-pass filter decay
   */
  public playExplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.22);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.23);
    } catch (e) {}
  }

  /**
   * 4-Tone Descending Space Invaders March (Dun - Dun - Dun - Dun)
   */
  public playAlienStep(stepIndex: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [174.61, 164.81, 155.56, 146.83]; // F3, E3, D#3, D3
      const freq = notes[stepIndex % 4];
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(this.volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  /**
   * UFO / Mothership High Pitch Wobble
   */
  public startUfo() {
    if (this.isMuted || this.ufoOsc) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.ufoOsc = this.ctx.createOscillator();
      this.ufoGain = this.ctx.createGain();

      this.ufoOsc.type = 'sine';
      this.ufoOsc.frequency.setValueAtTime(500, now);

      // Wobble modulation
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(14, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(180, now);
      lfo.connect(this.ufoOsc.frequency);
      lfo.start(now);

      this.ufoGain.gain.setValueAtTime(this.volume * 0.25, now);

      this.ufoOsc.connect(this.ufoGain);
      this.ufoGain.connect(this.ctx.destination);

      this.ufoOsc.start(now);
    } catch (e) {}
  }

  public stopUfo() {
    try {
      if (this.ufoOsc) {
        this.ufoOsc.stop();
        this.ufoOsc.disconnect();
        this.ufoOsc = null;
      }
      if (this.ufoGain) {
        this.ufoGain.disconnect();
        this.ufoGain = null;
      }
    } catch (e) {}
  }

  /**
   * Player Destroyed Sound: Deep rumbling crash
   */
  public playPlayerDeath() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.6);

      gain.gain.setValueAtTime(this.volume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.62);
    } catch (e) {}
  }

  /**
   * Phase 4 Alien Flagship / Mothership Flight Sound:
   * Eerie extraterrestrial FM theremin drone with undulating frequencies and modulated resonant filter
   */
  public startAlienMothershipFlight() {
    if (this.isMuted || this.isAlienMothershipFlying) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.isAlienMothershipFlying = true;

      // Dual detuned oscillators for sinister sci-fi phasing
      this.alienMothershipOsc1 = this.ctx.createOscillator();
      this.alienMothershipOsc2 = this.ctx.createOscillator();

      this.alienMothershipOsc1.type = 'sawtooth';
      this.alienMothershipOsc2.type = 'triangle';

      this.alienMothershipOsc1.frequency.setValueAtTime(320, now);
      this.alienMothershipOsc2.frequency.setValueAtTime(324, now); // 4Hz detuning beat

      // Vibrato & Alien FM modulation LFO
      this.alienMothershipLfo = this.ctx.createOscillator();
      this.alienMothershipLfo.type = 'sine';
      this.alienMothershipLfo.frequency.setValueAtTime(6.8, now); // Undulating alien pulse

      this.alienMothershipLfoGain = this.ctx.createGain();
      this.alienMothershipLfoGain.gain.setValueAtTime(45, now);

      this.alienMothershipLfo.connect(this.alienMothershipOsc1.frequency);
      this.alienMothershipLfo.connect(this.alienMothershipOsc2.frequency);

      // Resonant Lowpass & Bandpass cyber filter
      this.alienMothershipFilter = this.ctx.createBiquadFilter();
      this.alienMothershipFilter.type = 'bandpass';
      this.alienMothershipFilter.frequency.setValueAtTime(680, now);
      this.alienMothershipFilter.Q.setValueAtTime(4.2, now); // Resonant extraterrestrial tone

      // Master Alien Flight Gain
      this.alienMothershipGain = this.ctx.createGain();
      this.alienMothershipGain.gain.setValueAtTime(0.001, now);
      this.alienMothershipGain.gain.linearRampToValueAtTime(this.volume * 0.38, now + 0.25);

      this.alienMothershipOsc1.connect(this.alienMothershipFilter);
      this.alienMothershipOsc2.connect(this.alienMothershipFilter);
      this.alienMothershipFilter.connect(this.alienMothershipGain);
      this.alienMothershipGain.connect(this.ctx.destination);

      this.alienMothershipOsc1.start(now);
      this.alienMothershipOsc2.start(now);
      this.alienMothershipLfo.start(now);
    } catch (e) {}
  }

  /**
   * Dynamically modulate alien ship sound as it swoops or maneuvers in 2D space
   */
  public updateAlienMothershipFlight(pitchMultiplier: number = 1.0) {
    if (!this.isAlienMothershipFlying || !this.ctx || !this.alienMothershipOsc1 || !this.alienMothershipFilter) return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = 300 * Math.max(0.6, Math.min(1.8, pitchMultiplier));
      this.alienMothershipOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
      if (this.alienMothershipOsc2) {
        this.alienMothershipOsc2.frequency.setTargetAtTime(baseFreq + 4.5, now, 0.08);
      }
      this.alienMothershipFilter.frequency.setTargetAtTime(baseFreq * 2.2, now, 0.08);
    } catch (e) {}
  }

  /**
   * Stop Alien Mothership Flight Audio cleanly
   */
  public stopAlienMothershipFlight() {
    if (!this.isAlienMothershipFlying) return;
    this.isAlienMothershipFlying = false;

    try {
      if (this.alienMothershipGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.alienMothershipGain.gain.linearRampToValueAtTime(0.001, now + 0.12);
        setTimeout(() => {
          try {
            this.alienMothershipOsc1?.stop();
            this.alienMothershipOsc2?.stop();
            this.alienMothershipLfo?.stop();
            this.alienMothershipOsc1?.disconnect();
            this.alienMothershipOsc2?.disconnect();
            this.alienMothershipLfo?.disconnect();
            this.alienMothershipFilter?.disconnect();
            this.alienMothershipGain?.disconnect();
            this.alienMothershipOsc1 = null;
            this.alienMothershipOsc2 = null;
            this.alienMothershipLfo = null;
            this.alienMothershipFilter = null;
            this.alienMothershipGain = null;
          } catch (e) {}
        }, 130);
      }
    } catch (e) {}
  }

  /**
   * Alien Bomb Drop Sound: Whistling high-tech plasma ordnance release
   */
  public playAlienBombDrop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.28);

      // Warble modulation
      const mod = this.ctx.createOscillator();
      mod.type = 'sawtooth';
      mod.frequency.setValueAtTime(32, now);
      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(120, now);
      mod.connect(osc.frequency);
      mod.start(now);
      mod.stop(now + 0.29);

      gain.gain.setValueAtTime(this.volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.29);
    } catch (e) {}
  }

  /**
   * Alien Bomb Explosion: Deep plasma blast + sizzling crackle
   */
  public playAlienBombExplode() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Deep sub-bass thump
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.35);

      oscGain.gain.setValueAtTime(this.volume * 0.85, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);

      // 2. Filtered plasma noise blast
      const bufferSize = this.ctx.sampleRate * 0.32;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(95, now + 0.3);
      filter.Q.setValueAtTime(3.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(this.volume * 0.75, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.33);
    } catch (e) {}
  }

  /**
   * 1000-Point Alien Mothership Destroyed:
   * Epic extraterrestrial flagship destruction fanfare with cascading sci-fi chords and massive explosion!
   */
  public playAlienBossDestroyed() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Massive layered explosion
      this.playExplosion();

      // 2. Celebratory 1000-Point Extraterrestrial Victory Chords (Arpeggio: C5, E5, G5, B5, C6)
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      notes.forEach((freq, idx) => {
        const noteStart = now + idx * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(this.volume * 0.65, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.42);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.45);
      });
    } catch (e) {}
  }

  /* ==========================================================================
     PAC-MAN SOUND EFFECTS
     ========================================================================== */

  /**
   * Classic Waka-Waka Dot Chomping sound
   */
  public playWaka() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      this.wakaToggle = !this.wakaToggle;
      const startFreq = this.wakaToggle ? 420 : 310;
      const endFreq = this.wakaToggle ? 310 : 420;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.linearRampToValueAtTime(endFreq, now + 0.07);

      gain.gain.setValueAtTime(this.volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  /**
   * Eating a Vulnerable / Blue Ghost sound
   */
  public playEatGhost() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);

      gain.gain.setValueAtTime(this.volume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {}
  }

  /**
   * Eating Cherry / Fruit Bonus sound
   */
  public playCherryBonus() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(this.volume * 0.5, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.1);
      });
    } catch (e) {}
  }

  /**
   * Pac-Man Death: Descending whistling tone
   */
  public playPacmanDeath() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.7);

      gain.gain.setValueAtTime(this.volume * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.72);
    } catch (e) {}
  }

  /**
   * Game Start / Level Up Jingle
   */
  public playStartJingle() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const melody = [
        { f: 523.25, d: 0.1 },  // C5
        { f: 659.25, d: 0.1 },  // E5
        { f: 783.99, d: 0.1 },  // G5
        { f: 1046.50, d: 0.2 }, // C6
      ];

      let t = now;
      melody.forEach(({ f, d }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(this.volume * 0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + d);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t);
        osc.stop(t + d + 0.02);

        t += d;
      });
    } catch (e) {}
  }

  /* ==========================================================================
     CORRIDA F1 FERRARI (REALISTIC RACING AUDIO SYNTHESIZER)
     ========================================================================== */

  /**
   * Starts real-time Web Audio synthesis for the Ferrari V8/V12 engine roar
   */
  public startFerrariEngine() {
    if (this.isMuted || this.isEngineRunning) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Primary cylinder combustion oscillator (sawtooth for aggressive growl)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(80, now);

      // Secondary harmonic oscillator (triangle with slight detune for mechanical depth)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(160, now);
      osc2.detune.setValueAtTime(7, now);

      // Lowpass biquad filter with resonance to simulate tuned exhaust manifolds
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.Q.setValueAtTime(2.8, now);

      // Engine master gain
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.45, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);

      this.engineOsc1 = osc1;
      this.engineOsc2 = osc2;
      this.engineFilter = filter;
      this.engineGain = gain;
      this.isEngineRunning = true;
    } catch (e) {}
  }

  /**
   * Smoothly updates engine RPM, throttle, and acoustic profile in real time (60 FPS)
   */
  public updateFerrariEngine(rpmRatio: number, speedRatio: number, isBoosting: boolean = false, isBraking: boolean = false) {
    if (this.isMuted) return;
    if (!this.isEngineRunning) {
      this.startFerrariEngine();
      return;
    }
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;

    try {
      const now = this.ctx.currentTime;
      const clampedRpm = Math.max(0, Math.min(1, rpmRatio));
      const clampedSpeed = Math.max(0, Math.min(1.4, speedRatio));

      // Ferrari engine fundamental frequency: 70Hz (idle) to 420Hz (redline @ 9000 RPM)
      let baseFreq = 70 + clampedRpm * 350;
      if (isBoosting) baseFreq *= 1.15; // Turbo boost extra scream

      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);

      // Acoustic exhaust filter opens up with RPM and throttle
      let filterCutoff = 380 + clampedRpm * 2200;
      if (isBoosting) filterCutoff += 600;
      this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.05);

      // Volume dynamics: idling vs full throttle vs braking
      let targetGain = this.volume * (0.35 + clampedSpeed * 0.45);
      if (isBraking) targetGain *= 0.65;
      if (isBoosting) targetGain *= 1.25;

      this.engineGain.gain.setTargetAtTime(Math.min(1, targetGain), now, 0.08);
    } catch (e) {}
  }

  /**
   * Shuts down engine sound oscillators cleanly
   */
  public stopFerrariEngine() {
    if (!this.isEngineRunning) return;
    try {
      const now = this.ctx ? this.ctx.currentTime : 0;
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
        this.engineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      }
      setTimeout(() => {
        try {
          if (this.engineOsc1) {
            this.engineOsc1.stop();
            this.engineOsc1.disconnect();
            this.engineOsc1 = null;
          }
          if (this.engineOsc2) {
            this.engineOsc2.stop();
            this.engineOsc2.disconnect();
            this.engineOsc2 = null;
          }
          if (this.engineFilter) {
            this.engineFilter.disconnect();
            this.engineFilter = null;
          }
          if (this.engineGain) {
            this.engineGain.disconnect();
            this.engineGain = null;
          }
        } catch (e) {}
      }, 120);
    } catch (e) {}
    this.isEngineRunning = false;
  }

  /**
   * Ferrari Gear Upshift Pop: rapid pitch dip and exhaust backfire pop
   */
  public playFerrariShift(gear: number = 2) {
    if (this.isMuted) return;
    const nowMs = Date.now();
    if (nowMs - this.lastShiftTime < 250) return;
    this.lastShiftTime = nowMs;

    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Exhaust pop (short low-pass noise burst)
      const bufferSize = this.ctx.sampleRate * 0.07;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + gear * 50, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.08);
    } catch (e) {}
  }

  /**
   * Tire Skid / Drift sound when turning sharp or braking at speed
   */
  public playFerrariSkid() {
    if (this.isMuted) return;
    const nowMs = Date.now();
    if (nowMs - this.lastSkidTime < 180) return;
    this.lastSkidTime = nowMs;

    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 0.2;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.linearRampToValueAtTime(900, now + duration);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + duration + 0.01);
    } catch (e) {}
  }

  /**
   * Crash / Collision impact sound
   */
  public playFerrariCrash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 0.45;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + duration + 0.02);

      // Low impact sub-boom
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      subGain.gain.setValueAtTime(this.volume * 0.9, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      subOsc.start(now);
      subOsc.stop(now + 0.36);
    } catch (e) {}
  }

  /**
   * F1 5-Red-Lights Countdown Beep (Beep... Beep... Beep... GO!)
   */
  public playCountdownBeep(isFinalGo: boolean = false) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isFinalGo ? 'sawtooth' : 'sine';
      const freq = isFinalGo ? 880 : 440;
      const dur = isFinalGo ? 0.38 : 0.16;

      osc.frequency.setValueAtTime(freq, now);
      if (isFinalGo) {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(1046.5, now + dur);
      }

      gain.gain.setValueAtTime(this.volume * (isFinalGo ? 0.8 : 0.6), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (e) {}
  }

  /**
   * Checkpoint Passed Chime (+15s Bonus Time)
   */
  public playCheckpointChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [587.33, 880.00, 1174.66]; // D5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(this.volume * 0.55, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    } catch (e) {}
  }

  /**
   * Turbo Boost / DRS Activation Whoosh
   */
  public playTurboWhoosh() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const dur = 0.5;
      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(2600, now + dur);
      filter.Q.setValueAtTime(3.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + dur + 0.02);
    } catch (e) {}
  }

  /**
   * Oil Slick spin effect
   */
  public playOilSpin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.35);

      gain.gain.setValueAtTime(this.volume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.37);
    } catch (e) {}
  }

  /**
   * Traffic cone collision hit
   */
  public playConeHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.09);

      gain.gain.setValueAtTime(this.volume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  /**
   * Grand Victory Fanfare on crossing the Finish Line (Linha de Chegada)
   */
  public playFinishFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Majestic F1 victory brass fanfare (Monza Grand Prix)
      const fanfare = [
        { f: 523.25, d: 0.15 }, // C5
        { f: 523.25, d: 0.15 }, // C5
        { f: 523.25, d: 0.15 }, // C5
        { f: 659.25, d: 0.35 }, // E5
        { f: 783.99, d: 0.25 }, // G5
        { f: 1046.50, d: 0.70 }, // C6
      ];

      let t = now;
      fanfare.forEach(({ f, d }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, t);

        gain.gain.setValueAtTime(this.volume * 0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + d);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t);
        osc.stop(t + d + 0.03);

        t += d * 0.9;
      });

      // Crowd cheering burst
      const crowdBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 1.5, this.ctx.sampleRate);
      const crowdData = crowdBuffer.getChannelData(0);
      for (let i = 0; i < crowdData.length; i++) {
        crowdData[i] = (Math.random() * 2 - 1) * Math.min(1, i / (this.ctx.sampleRate * 0.4)) * Math.exp(-(i - this.ctx.sampleRate * 0.4) / (this.ctx.sampleRate * 0.8));
      }
      const crowd = this.ctx.createBufferSource();
      crowd.buffer = crowdBuffer;

      const crowdFilter = this.ctx.createBiquadFilter();
      crowdFilter.type = 'bandpass';
      crowdFilter.frequency.setValueAtTime(1200, now + 0.4);
      crowdFilter.Q.setValueAtTime(1.5, now + 0.4);

      const crowdGain = this.ctx.createGain();
      crowdGain.gain.setValueAtTime(this.volume * 0.6, now + 0.4);
      crowdGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      crowd.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(this.ctx.destination);

      crowd.start(now + 0.4);
      crowd.stop(now + 1.85);
    } catch (e) {}
  }

  /* ==========================================================================
     MONOMOTOR AIRPLANE FLIGHT SIMULATOR (DINO VALLEY TO LAS VEGAS)
     ========================================================================== */

  /**
   * Starts real-time Web Audio synthesis for the single-engine propeller piston plane
   */
  public startAirplaneEngine() {
    if (this.isMuted || this.isPlaneRunning) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Primary cylinder piston rumble (sawtooth wave)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, now);

      // Secondary engine harmonic (triangle wave for body warmth)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110, now);

      // Low-frequency oscillator (LFO) to simulate propeller blade chopping rhythm
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(24, now); // ~24 blips per second

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.25, now);

      // Lowpass filter to muffle or open up engine exhaust tone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(2.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.4, now);

      // Connect LFO to modulate filter frequency (chopping propeller sensation)
      lfo.connect(filter.frequency);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      this.planeOsc1 = osc1;
      this.planeOsc2 = osc2;
      this.planeLfo = lfo;
      this.planeLfoGain = lfoGain;
      this.planeFilter = filter;
      this.planeGain = gain;
      this.isPlaneRunning = true;
    } catch (e) {}
  }

  /**
   * Updates airplane RPM, prop chopping frequency and volume dynamically
   */
  public updateAirplaneEngine(throttleRatio: number, rpmRatio: number, isBoosting: boolean = false) {
    if (this.isMuted) return;
    if (!this.isPlaneRunning) {
      this.startAirplaneEngine();
      return;
    }
    if (!this.ctx || !this.planeOsc1 || !this.planeOsc2 || !this.planeLfo || !this.planeFilter || !this.planeGain) return;

    try {
      const now = this.ctx.currentTime;
      const clampedThrottle = Math.max(0, Math.min(1, throttleRatio));
      const clampedRpm = Math.max(0, Math.min(1.2, rpmRatio));

      // Propeller fundamental: 45Hz (idle) to 125Hz (full throttle 2700 RPM)
      let baseFreq = 45 + clampedRpm * 70;
      if (isBoosting) baseFreq *= 1.2;

      this.planeOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
      this.planeOsc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.08);

      // Blade chop frequency (LFO)
      const chopFreq = 18 + clampedRpm * 36;
      this.planeLfo.frequency.setTargetAtTime(chopFreq, now, 0.08);

      // Filter cutoff opens up as throttle climbs
      let cutoff = 260 + clampedRpm * 800;
      if (isBoosting) cutoff += 400;
      this.planeFilter.frequency.setTargetAtTime(cutoff, now, 0.08);

      // Gain scaling
      const targetGain = this.volume * (0.3 + clampedThrottle * 0.45 + (isBoosting ? 0.2 : 0));
      this.planeGain.gain.setTargetAtTime(Math.min(1, targetGain), now, 0.08);
    } catch (e) {}
  }

  /**
   * Shuts down airplane sound cleanly
   */
  public stopAirplaneEngine() {
    if (!this.isPlaneRunning) return;
    try {
      const now = this.ctx ? this.ctx.currentTime : 0;
      if (this.planeGain && this.ctx) {
        this.planeGain.gain.setValueAtTime(this.planeGain.gain.value, now);
        this.planeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      }
      setTimeout(() => {
        try {
          if (this.planeOsc1) {
            this.planeOsc1.stop();
            this.planeOsc1.disconnect();
            this.planeOsc1 = null;
          }
          if (this.planeOsc2) {
            this.planeOsc2.stop();
            this.planeOsc2.disconnect();
            this.planeOsc2 = null;
          }
          if (this.planeLfo) {
            this.planeLfo.stop();
            this.planeLfo.disconnect();
            this.planeLfo = null;
          }
          if (this.planeFilter) {
            this.planeFilter.disconnect();
            this.planeFilter = null;
          }
          if (this.planeGain) {
            this.planeGain.disconnect();
            this.planeGain = null;
          }
        } catch (e) {}
      }, 120);
    } catch (e) {}
    this.isPlaneRunning = false;
  }

  /**
   * Navigational Ring Passage Chime (Ascending celestial chime with combo pitch scaling)
   */
  public playRingChime(combo: number = 1) {
    if (this.isMuted) return;
    const nowMs = Date.now();
    if (nowMs - this.lastRingSoundTime < 80) return;
    this.lastRingSoundTime = nowMs;

    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Multiplier increases pitch scale
      const comboMult = 1 + Math.min(0.5, (combo - 1) * 0.08);
      const frequencies = [523.25 * comboMult, 659.25 * comboMult, 783.99 * comboMult, 1046.50 * comboMult];

      frequencies.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(this.volume * 0.45, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.25);
      });
    } catch (e) {}
  }

  /**
   * Prehistoric Dinosaur Roar (Deep guttural resonance from T-Rex or Brachiosaurus)
   */
  public playDinoRoar() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const dur = 1.1;

      // Low guttural sweep
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + dur);

      // Noise component for throat roughness
      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + dur);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      noise.start(now);
      osc.stop(now + dur + 0.05);
      noise.stop(now + dur + 0.05);
    } catch (e) {}
  }

  /**
   * Airplane Touchdown on Las Vegas Runway (Tire squeal)
   */
  public playTireTouchdown() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const dur = 0.28;

      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.linearRampToValueAtTime(1100, now + dur);
      filter.Q.setValueAtTime(5.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * 0.75, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + dur + 0.02);
    } catch (e) {}
  }

  /**
   * Triumphant Las Vegas Welcome Fanfare on Safe Landing
   */
  public playVegasArrival() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Vegas bright brass chord melody (Viva Las Vegas fanfare)
      const fanfare = [
        { f: 392.00, d: 0.15 }, // G4
        { f: 523.25, d: 0.15 }, // C5
        { f: 659.25, d: 0.18 }, // E5
        { f: 783.99, d: 0.22 }, // G5
        { f: 1046.50, d: 0.55 }, // C6
      ];

      let t = now;
      fanfare.forEach(({ f, d }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(this.volume * 0.75, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + d);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t);
        osc.stop(t + d + 0.03);

        t += d * 0.9;
      });
    } catch (e) {}
  }

  /**
   * Aerodynamic Stall Warning Horn (Short periodic buzz)
   */
  public playStallWarning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(420, now);

      gain.gain.setValueAtTime(this.volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {}
  }

  // ==========================================================
  // CAVALEIRO NEGRO PINBALL (TAITO 80s FLIPERAMA) AUDIO ENGINE
  // ==========================================================

  /**
   * Preload both authentic Cavaleiro Negro MP3 audios:
   * 1. Intro speech: /assets/aistudio/audiolimpo_3872ba29.mp3
   * 2. Active in-game sounds: /assets/aistudio/sonsdojogoativos_520a8f9a.mp3
   */
  public preloadCavaleiroAudios() {
    try {
      if (!this.cavaleiroIntroAudio) {
        this.cavaleiroIntroAudio = new Audio('/assets/aistudio/audiolimpo_3872ba29.mp3');
        this.cavaleiroIntroAudio.preload = 'auto';
      }
      if (!this.cavaleiroMatchAudio) {
        this.cavaleiroMatchAudio = new Audio('/assets/aistudio/sonsdojogoativos_520a8f9a.mp3');
        this.cavaleiroMatchAudio.preload = 'auto';
        this.cavaleiroMatchAudio.loop = true;
      }
    } catch (e) {}
  }

  public preloadCavaleiroIntroAudio() {
    this.preloadCavaleiroAudios();
  }

  /**
   * Start active in-game sounds of Cavaleiro Negro during match
   * Uses authentic user MP3 recording (/assets/aistudio/sonsdojogoativos_520a8f9a.mp3)
   */
  public startCavaleiroMatchAudio() {
    if (this.isMuted) {
      this.isCavaleiroMatchPlaying = true;
      return;
    }
    this.initContext();

    try {
      if (!this.cavaleiroMatchAudio) {
        this.cavaleiroMatchAudio = new Audio('/assets/aistudio/sonsdojogoativos_520a8f9a.mp3');
        this.cavaleiroMatchAudio.preload = 'auto';
        this.cavaleiroMatchAudio.loop = true;
      }
      this.cavaleiroMatchAudio.currentTime = 0;
      this.cavaleiroMatchAudio.volume = Math.min(1.0, Math.max(0.1, this.volume * 2.2));
      const playPromise = this.cavaleiroMatchAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isCavaleiroMatchPlaying = true;
          })
          .catch(() => {
            this.isCavaleiroMatchPlaying = false;
          });
      }
    } catch (e) {
      this.isCavaleiroMatchPlaying = false;
    }
  }

  /**
   * Stop active in-game sounds when match finishes or is reset
   */
  public stopCavaleiroMatchAudio() {
    if (this.cavaleiroMatchAudio) {
      this.cavaleiroMatchAudio.pause();
      this.cavaleiroMatchAudio.currentTime = 0;
    }
    this.isCavaleiroMatchPlaying = false;
  }

  /**
   * Pause active in-game sounds
   */
  public pauseCavaleiroMatchAudio() {
    if (this.cavaleiroMatchAudio) {
      this.cavaleiroMatchAudio.pause();
    }
    this.isCavaleiroMatchPlaying = false;
  }

  /**
   * Check if active match audio is currently playing
   */
  public isCavaleiroMatchAudioPlaying(): boolean {
    return this.isCavaleiroMatchPlaying;
  }

  /**
   * Authentic Iconic Voice: "Eu sou o cavaleiro negro a procura de um desafio!"
   * Plays the user's authentic MP3 audio recording from the 1980s classic machine!
   */
  public speakCavaleiroNegroIntro() {
    if (this.isMuted) return;
    this.initContext();

    try {
      if (!this.cavaleiroIntroAudio) {
        this.cavaleiroIntroAudio = new Audio('/assets/aistudio/audiolimpo_3872ba29.mp3');
        this.cavaleiroIntroAudio.preload = 'auto';
      }
      this.cavaleiroIntroAudio.currentTime = 0;
      this.cavaleiroIntroAudio.volume = Math.min(1.0, Math.max(0.1, this.volume * 2.5));
      const playPromise = this.cavaleiroIntroAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((_err) => {
          this.fallbackSpeechIntro();
        });
      }
    } catch (e) {
      this.fallbackSpeechIntro();
    }
  }

  private fallbackSpeechIntro() {
    if ('speechSynthesis' in window && !this.isMuted) {
      try {
        window.speechSynthesis.cancel();
        const text = 'Eu sou o cavaleiro negro a procura de um desafio!';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.pitch = 0.55;
        utterance.rate = 0.82;
        utterance.volume = Math.min(1.0, this.volume * 2.5);
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  }

  /**
   * Additional Robotic Voice Callouts for Cavaleiro Negro
   */
  public speakCavaleiroPhrase(phrase: string) {
    if (this.isMuted) return;
    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.lang = 'pt-BR';
        utterance.pitch = 0.58;
        utterance.rate = 0.88;
        utterance.volume = Math.min(1.0, this.volume * 2.2);

        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find((v) => v.lang.startsWith('pt') || v.lang.includes('BR'));
        if (ptVoice) utterance.voice = ptVoice;

        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  }

  /**
   * Mechanical Solenoid Flipper Clack (Up/Down)
   */
  public playPinballFlipper(isUp: boolean) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (isUp) {
        // Powerful magnetic kick
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.05);

        gain.gain.setValueAtTime(this.volume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        // Add secondary solenoid snap click
        const snap = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snap.type = 'square';
        snap.frequency.setValueAtTime(1600, now);
        snap.frequency.exponentialRampToValueAtTime(300, now + 0.02);
        snapGain.gain.setValueAtTime(this.volume * 0.4, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        snap.connect(snapGain);
        snapGain.connect(this.ctx.destination);
        snap.start(now);
        snap.stop(now + 0.03);
      } else {
        // Return spring release
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.04);

        gain.gain.setValueAtTime(this.volume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  /**
   * Resonant 80s Pinball Bumper Pop
   */
  public playPinballBumper(freqMultiplier = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Resonant Pop
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      popOsc.type = 'square';
      popOsc.frequency.setValueAtTime(540 * freqMultiplier, now);
      popOsc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

      popGain.gain.setValueAtTime(this.volume * 0.55, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      // Electronic bell ping harmonic
      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(880 * freqMultiplier, now);
      bellOsc.frequency.exponentialRampToValueAtTime(440 * freqMultiplier, now + 0.14);

      bellGain.gain.setValueAtTime(this.volume * 0.4, now);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      popOsc.connect(popGain);
      popGain.connect(this.ctx.destination);

      bellOsc.connect(bellGain);
      bellGain.connect(this.ctx.destination);

      popOsc.start(now);
      popOsc.stop(now + 0.1);
      bellOsc.start(now);
      bellOsc.stop(now + 0.16);
    } catch (e) {}
  }

  /**
   * Slingshot Kinetic Kicker Sound
   */
  public playPinballSlingshot() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  /**
   * Spring Plunger Release (Ball Launch)
   */
  public playPinballPlunger() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.linearRampToValueAtTime(450, now + 0.12);

      gain.gain.setValueAtTime(this.volume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  /**
   * Classic Pinball Electronic Chime (Points Counter)
   */
  public playPinballChime(step = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const scale = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
      const freq = scale[step % scale.length];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(this.volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch (e) {}
  }

  /**
   * Magna-Save (Defesa Magnética) Electrical Hum
   */
  public playPinballMagnaSave() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(320, now + 0.25);

      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {}
  }

  /**
   * Ball Drain / Outlane Loss
   */
  public playPinballDrain() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);

      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  /**
   * Cavaleiro Negro High Score / Extra Ball Fanfare
   */
  public playCavaleiroFanfare() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [293.66, 369.99, 440.0, 587.33, 739.99, 880.0];
      let t = this.ctx.currentTime;

      notes.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(this.volume * 0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t);
        osc.stop(t + 0.14);

        t += 0.08;
      });
    } catch (e) {}
  }
}

export const retroAudio = new RetroAudioEngine();
