// Medieval Gothic Chess Sound Effects Synthesizer using Web Audio API

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return null;
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export const chessAudio = {
  setMuted(muted: boolean) {
    isMuted = muted;
  },

  getMuted(): boolean {
    return isMuted;
  },

  // Satisfying resonant wooden/stone chess piece tap
  playMove() {
    if (isMuted) return;
    try {
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.06);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  },

  // Heavy stone capture impact
  playCapture() {
    if (isMuted) return;
    try {
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Punchy sub-bass drop
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Metallic click
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.exponentialRampToValueAtTime(240, now + 0.08);
      gain2.gain.setValueAtTime(0.15, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.1);
    } catch {}
  },

  // Dramatic Medieval Brass/Chime Warning for CHECK
  playCheck() {
    if (isMuted) return;
    try {
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Brass chord frequencies (minor 3rd suspense)
      const freqs = [330, 392, 494];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.03);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 0.5);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05 + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        // Lowpass filter for warm brass texture
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.03);
        osc.stop(now + 0.65);
      });
    } catch {}
  },

  // Royal Fanfare Chords for CHECKMATE
  playCheckmate() {
    if (isMuted) return;
    try {
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const notes = [
        { freq: 440, time: 0, dur: 0.2 },
        { freq: 554, time: 0.18, dur: 0.2 },
        { freq: 659, time: 0.36, dur: 0.3 },
        { freq: 880, time: 0.6, dur: 0.8 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.15, now + time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch {}
  },

  // Castling dual-slide
  playCastle() {
    this.playMove();
    setTimeout(() => this.playMove(), 110);
  },

  // Distinctive Medieval Heraldic Fanfare Chime for Chess Challenge Invite
  playInviteAlert() {
    if (isMuted) return;
    try {
      const ctx = getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      // Double-strike fanfare heraldic chimes: Call 1 + Call 2
      const notes = [
        // Strike 1
        { freq: 523.25, time: 0, dur: 0.14 },
        { freq: 659.25, time: 0.12, dur: 0.16 },
        { freq: 783.99, time: 0.26, dur: 0.25 },
        // Short pause, then triumphant call 2
        { freq: 659.25, time: 0.55, dur: 0.14 },
        { freq: 783.99, time: 0.68, dur: 0.18 },
        { freq: 1046.5, time: 0.84, dur: 0.45 },
        { freq: 1318.5, time: 1.05, dur: 0.65 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.35, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch {}
  },
};
