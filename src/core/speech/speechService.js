/**
 * SpeechService - wraps browser speechSynthesis API.
 * Never call speechSynthesis directly elsewhere.
 */
export class SpeechService {
  #synth;
  #enabled = true;
  #queue = [];
  #speaking = false;
  
  constructor() {
    this.#synth = window.speechSynthesis || null;
  }
  
  get isAvailable() { return !!this.#synth; }
  
  setEnabled(val) { this.#enabled = val; }
  
  speak(text, options = {}) {
    if (!this.#enabled || !this.#synth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    if (options.lang) utterance.lang = options.lang;
    
    if (options.immediate) {
      this.#synth.cancel();
    }
    
    this.#synth.speak(utterance);
    return new Promise(resolve => { utterance.onend = resolve; });
  }
  
  announceExercise(name, target) {
    return this.speak(`Get ready for ${name}. ${target}. 3, 2, 1, Begin!`, { rate: 0.9 });
  }
  
  announceRest(seconds) {
    return this.speak(`Rest for ${seconds} seconds. Next exercise coming up.`);
  }
  
  announceComplete() {
    return this.speak('Workout complete! Great job today!', { rate: 0.9 });
  }
  
  countRep(number) {
    return this.speak(`${number}`, { rate: 1.2, immediate: true });
  }
  
  countdown(seconds) {
    return this.speak(`${seconds}`, { rate: 1.0, immediate: true });
  }
  
  cancel() {
    this.#synth?.cancel();
  }
}
