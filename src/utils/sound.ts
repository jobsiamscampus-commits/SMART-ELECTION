/**
 * Sound synthesis engine for Smart Campus Election System
 * Generates realistic EVM electronic voting beeps and UI feedback sounds.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const playSound = (type: 'button_click' | 'vote_success' | 'success' | 'error', soundEnabled = true) => {
  if (!soundEnabled) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'button_click') {
      // Soft tactile click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'vote_success') {
      // Official EVM Electronic Beep (0.75 second continuous crisp dual-tone)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'square';
      osc2.type = 'sine';

      // 1000 Hz and 2000 Hz harmonic EVM chime pulse
      osc1.frequency.setValueAtTime(1046.5, now); // C6 tone
      osc2.frequency.setValueAtTime(2093, now);    // C7 tone harmonic

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.setValueAtTime(0.3, now + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.75);
      osc2.stop(now + 0.75);
    } else if (type === 'success') {
      // Pleasant fanfare chord (C5 - E5 - G5)
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.3);
      });
    } else if (type === 'error') {
      // Short dual error warning tone
      [220, 185].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.12;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.12);
      });
    }
  } catch (err) {
    console.warn('Audio synthesis notice:', err);
  }
};
