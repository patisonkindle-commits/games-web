/**
 * AudioManager.js — Procedural sound engine for Project Nebula
 *
 * Uses Web Audio API to synthesize ALL game sounds at runtime.
 * No external audio files required. Lazy-initialises AudioContext
 * to comply with browser autoplay policies.
 *
 * Every sound method creates fresh oscillator/buffer nodes so
 * multiple sounds can overlap freely.
 */

import { CONFIG } from '../config.js';

export class AudioManager {
  constructor() {
    this.enabled = CONFIG.AUDIO_ENABLED;
    this.volume = CONFIG.MASTER_VOLUME;
    /** @type {AudioContext|null} */
    this.ctx = null;
  }

  // ------------------------------------------------------------------
  //  Initialisation helpers
  // ------------------------------------------------------------------

  /**
   * Lazily create (or resume) the AudioContext.
   * Must be called on first user interaction to satisfy autoplay policy.
   */
  _init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        // Web Audio not available — silently disable
        this.enabled = false;
        return;
      }
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Create a gain node whose value is already multiplied by master volume.
   * @param {number} value  Raw gain (0 – 1)
   * @param {AudioNode} [destination]  Connect target (defaults to ctx.destination)
   * @returns {GainNode}
   */
  _gain(value, destination) {
    const g = this.ctx.createGain();
    g.gain.value = value * this.volume;
    g.connect(destination || this.ctx.destination);
    return g;
  }

  /**
   * Shortcut: create & start an OscillatorNode with a frequency ramp.
   * @param {object} opts
   * @param {number}  opts.freq     Start frequency (Hz)
   * @param {number}  [opts.endFreq]  End frequency (Hz) — omitted = no ramp
   * @param {string}  [opts.type]     Oscillator type ('sine'|'square'|'sawtooth'|'triangle')
   * @param {number}  opts.duration   Seconds until stop
   * @param {number}  [opts.gain]     Raw gain (applied after master volume)
   * @param {number}  [opts.delay]    Seconds to delay start (for arpeggios)
   * @returns {OscillatorNode}
   */
  _playTone({ freq, endFreq, type = 'sine', duration, gain = 0.3, delay = 0 }) {
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    if (endFreq !== undefined) {
      osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
    }

    const g = this._gain(gain);
    osc.connect(g);

    osc.start(now);
    osc.stop(now + duration);
    return osc;
  }

  /**
   * Shortcut: play a short burst of white noise (used for explosions, hits).
   * @param {object} opts
   * @param {number} opts.duration
   * @param {number} [opts.gain]
   * @param {number} [opts.highPass]  High-pass cutoff frequency (Hz)
   * @param {number} [opts.lowPass]   Low-pass cutoff frequency (Hz)
   * @param {number} [opts.delay]
   * @returns {AudioBufferSourceNode}
   */
  _playNoise({ duration, gain = 0.3, highPass, lowPass, delay = 0 }) {
    const now = this.ctx.currentTime + delay;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.ceil(sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1; // white noise
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    let node = source;

    // Optional filter chain
    if (highPass) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = highPass;
      node.connect(hp);
      node = hp;
    }

    if (lowPass) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = lowPass;
      node.connect(lp);
      node = lp;
    }

    const g = this._gain(gain);
    node.connect(g);

    // Envelope: fade in/out to avoid clicks
    const gainParam = g.gain;
    const totalGain = gain * this.volume;
    const fade = Math.min(0.005, duration * 0.1);
    gainParam.setValueAtTime(0, now);
    gainParam.linearRampToValueAtTime(totalGain, now + fade);
    gainParam.setValueAtTime(totalGain, now + duration - fade);
    gainParam.linearRampToValueAtTime(0, now + duration);

    source.start(now);
    source.stop(now + duration);
    return source;
  }

  // ------------------------------------------------------------------
  //  Public sound-effect methods
  // ------------------------------------------------------------------

  /**
   * Player laser shot — short high-frequency blip.
   * Square wave at 880 Hz, very brief (50 ms), with quick pitch drop
   * for a punchy feel.
   */
  fire() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    this._playTone({
      freq: 1200,
      endFreq: 600,
      type: 'square',
      duration: 0.06,
      gain: 0.15,
    });
  }

  /**
   * Enemy death — white-noise burst with a rapid pitch (filter) drop.
   * Combines a brief noise blast with a low thump.
   */
  explosion() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    // Noise layer — high-passed, short burst
    this._playNoise({
      duration: 0.25,
      gain: 0.35,
      highPass: 200,
      lowPass: 4000,
    });

    // Low thump — sine wave at 80 Hz dropping to 30 Hz
    this._playTone({
      freq: 80,
      endFreq: 30,
      type: 'sine',
      duration: 0.2,
      gain: 0.4,
    });
  }

  /**
   * Player hit — impact sound.
   * Short noise burst filtered through a band-pass, plus a low thud.
   */
  hit() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    // Impact noise
    this._playNoise({
      duration: 0.1,
      gain: 0.3,
      highPass: 500,
      lowPass: 3000,
    });

    // Low thud
    this._playTone({
      freq: 100,
      endFreq: 40,
      type: 'sine',
      duration: 0.12,
      gain: 0.35,
    });
  }

  /**
   * Collecting scrap — short rising chime.
   * Two quick sine tones in rapid succession for a cheerful "ding".
   */
  scrapCollect() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    this._playTone({
      freq: 660,
      endFreq: 1320,
      type: 'sine',
      duration: 0.1,
      gain: 0.2,
    });
  }

  /**
   * Level up — ascending three-note arpeggio (triad).
   * Notes: C5 → E5 → G5, each 80 ms, overlapping slightly.
   */
  levelUp() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const notes = [523, 659, 784]; // C5, E5, G5
    const noteDuration = 0.12;
    const gap = 0.08;

    notes.forEach((freq, i) => {
      this._playTone({
        freq,
        type: 'sine',
        duration: noteDuration,
        gain: 0.25,
        delay: i * gap,
      });
    });
  }

  /**
   * Boss warning — low, ominous drone.
   * A slow pulse between two low frequencies.
   */
  bossWarning() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    // Slow LFO-style frequency wobble: 55 Hz ⇄ 75 Hz
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(75, now + 0.3);
    osc.frequency.linearRampToValueAtTime(55, now + 0.6);
    osc.frequency.linearRampToValueAtTime(75, now + 0.9);
    osc.frequency.linearRampToValueAtTime(55, now + 1.2);

    const g = this._gain(0.3);
    osc.connect(g);

    // Subtle amplitude pulse via a second gain
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0.4, now);
    amp.gain.linearRampToValueAtTime(0.8, now + 0.3);
    amp.gain.linearRampToValueAtTime(0.4, now + 0.6);
    amp.gain.linearRampToValueAtTime(0.8, now + 0.9);
    amp.gain.linearRampToValueAtTime(0.4, now + 1.2);
    g.connect(amp);
    amp.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.3);
  }

  /**
   * Shield hit — glassy "tap" sound.
   * High-pitched sine blip with very short decay.
   */
  shieldHit() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    this._playTone({
      freq: 2200,
      endFreq: 1400,
      type: 'sine',
      duration: 0.06,
      gain: 0.18,
    });
  }

  /**
   * Game over — descending tone (the classic "wah-wah").
   * A slow, sad slide from a mid frequency down to a low rumble.
   */
  gameOver() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;

    this._playTone({
      freq: 440,
      endFreq: 55,
      type: 'sawtooth',
      duration: 0.8,
      gain: 0.3,
    });
  }
}
