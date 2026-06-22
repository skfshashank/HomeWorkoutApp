export class AudioService {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx || typeof window === 'undefined') return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = Ctx ? new Ctx() : null;
    return this.ctx;
  }

  beep(freq = 800, duration = 0.15, type = 'sine', gain = 0.08) {
    const ctx = this.init();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const volume = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    volume.gain.setValueAtTime(gain, ctx.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(volume);
    volume.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  countdown321() {
    [0, 0.38, 0.76].forEach((offset) => {
      setTimeout(() => this.beep(700, 0.09, 'square'), offset * 1000);
    });
    setTimeout(() => this.beep(980, 0.24, 'triangle', 0.12), 1120);
  }

  complete() {
    this.beep(660, 0.12, 'triangle', 0.1);
    setTimeout(() => this.beep(880, 0.18, 'triangle', 0.1), 140);
    setTimeout(() => this.beep(1180, 0.24, 'triangle', 0.12), 310);
  }
}
