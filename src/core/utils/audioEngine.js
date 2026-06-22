/**
 * AudioEngine - Web Audio API for beeps and tones.
 * Never use raw AudioContext elsewhere.
 */
export class AudioEngine {
  #ctx = null;
  #enabled = true;
  
  get isAvailable() { return !!(window.AudioContext || window.webkitAudioContext); }
  
  init() {
    if (this.#ctx) return;
    this.#ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  setEnabled(val) { this.#enabled = val; }
  
  beep(frequency = 800, duration = 0.15, type = 'sine') {
    if (!this.#enabled || !this.#ctx) return;
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
    
    const osc = this.#ctx.createOscillator();
    const gain = this.#ctx.createGain();
    osc.connect(gain);
    gain.connect(this.#ctx.destination);
    
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.3, this.#ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.#ctx.currentTime + duration);
    
    osc.start();
    osc.stop(this.#ctx.currentTime + duration);
  }
  
  tick() { this.beep(600, 0.08); }
  
  countdown321() {
    this.beep(880, 0.15); // high beep for 3-2-1
  }
  
  go() {
    this.beep(1200, 0.3); // longer high beep for "GO"
  }
  
  complete() {
    // Victory jingle
    setTimeout(() => this.beep(523, 0.15), 0);
    setTimeout(() => this.beep(659, 0.15), 150);
    setTimeout(() => this.beep(784, 0.15), 300);
    setTimeout(() => this.beep(1047, 0.3), 450);
  }
  
  rest() {
    this.beep(440, 0.2, 'triangle');
  }
}
