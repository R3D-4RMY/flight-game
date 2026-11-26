// Sunset Courier — sound, all synthesised with WebAudio: an engine hum
// that follows the throttle, wind rush, and chimes for rings and landings.

/** The game's sound bank. Nothing is loaded; every sound is synthesised. */
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.windGain = null;
    this.noiseBuffer = null;
  }

  /** Create the audio graph on the first user gesture. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const len = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    // Engine: two detuned saws through a low-pass filter.
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sawtooth';
    this.engineOsc2.frequency.value = 58;
    const mix = this.ctx.createGain();
    mix.gain.value = 0.5;
    this.engineOsc.connect(mix);
    this.engineOsc2.connect(mix);
    mix.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    this.engineOsc2.start();
    // Wind: looped noise through a band-pass, gain follows airspeed.
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = this.noiseBuffer;
    windSrc.loop = true;
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 700;
    band.Q.value = 0.6;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    windSrc.connect(band);
    band.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    windSrc.start();
  }

  /** Follow the plane: engine pitch by throttle, wind by speed. */
  update(plane) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const target = plane.engineOn ? 0.05 + plane.throttle * 0.075 : 0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(52 + plane.throttle * 46, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(55 + plane.throttle * 48, t, 0.1);
    this.windGain.gain.setTargetAtTime(Math.min(0.12, plane.speed * 0.0011), t, 0.15);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.06, t, 0.05);
      this.windGain.gain.setTargetAtTime(0, t, 0.05);
    }
    return this.muted;
  }

  /** A short tone: frequency, duration, type, volume. */
  blip(freq, dur, type = 'sine', vol = 0.16) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Two-note chime for flying a ring. */
  ringChime() {
    this.blip(659, 0.22, 'sine', 0.2);
    setTimeout(() => this.blip(988, 0.35, 'sine', 0.2), 90);
  }

  /** A soft thud for a good landing. */
  landingThud() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
    src.stop(t + 0.32);
    this.blip(98, 0.4, 'sine', 0.22);
  }

  /** A harsh burst for a crash. */
  crashBurst() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
    src.stop(t + 0.72);
    this.blip(220, 0.6, 'sawtooth', 0.12);
  }
}
