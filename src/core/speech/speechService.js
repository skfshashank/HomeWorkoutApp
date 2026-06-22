/**
 * SpeechService - wraps browser speechSynthesis API.
 * Never call speechSynthesis directly elsewhere.
 */
export class SpeechService {
  #synth;
  #enabled = true;
  #queue = [];
  #speaking = false;
  #i18n;
  
  constructor(i18n = null) {
    this.#synth = window.speechSynthesis || null;
    this.#i18n = i18n;
  }
  
  get isAvailable() { return !!this.#synth; }
  
  setEnabled(val) { this.#enabled = val; }

  t(key, fallback = key) {
    return this.#i18n?.t(key) || fallback;
  }
  
  speak(text, options = {}) {
    if (!this.#enabled || !this.#synth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    utterance.lang = options.lang || (this.#i18n?.getLang?.() === 'hi' ? 'hi-IN' : 'en-US');
    
    if (options.immediate) {
      this.#synth.cancel();
    }
    
    this.#synth.speak(utterance);
    return new Promise(resolve => { utterance.onend = resolve; });
  }
  
  announceExercise(name, target) {
    return this.speak(`${this.t('get_ready', 'Get ready')} ${name}. ${target}. 3, 2, 1, ${this.t('begin', 'Begin')}!`, { rate: 0.9 });
  }
  
  announceRest(seconds) {
    return this.speak(`${this.t('rest', 'Rest')}: ${seconds} ${this.t('seconds', 'seconds')}. ${this.t('next_exercise', 'Next exercise')}.`);
  }
  
  announceComplete() {
    return this.speak(`${this.t('workout_complete', 'Workout complete')}! ${this.t('great_work', 'Amazing Work!')}`, { rate: 0.9 });
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
