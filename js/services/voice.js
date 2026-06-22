export class VoiceService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.enabled = true;
    this.lang = 'en-IN';
  }

  speak(text) {
    if (!this.enabled || !this.synth || !text) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.lang;
    utterance.rate = 1;
    this.synth.speak(utterance);
  }

  announceExercise(name, target) {
    this.speak(`Get ready for ${name}. ${target}. Three, two, one, begin.`);
  }

  announceRest(seconds) {
    this.speak(`Rest for ${seconds} seconds.`);
  }

  announceComplete() {
    this.speak('Workout complete. Great job.');
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    if (!this.enabled) {
      this.synth?.cancel();
    }
  }
}
