/**
 * ProgressionEngine - adaptive difficulty based on RPE feedback.
 */
import { getLocalDateStr } from '../../core/utils/dateUtils.js';

export class ProgressionEngine {
  #storage;
  #getDateStr;

  constructor({
    storage,
    getDateStr = getLocalDateStr
  }) {
    this.#storage = storage;
    this.#getDateStr = getDateStr;
  }

  async recordRPE(rating) {
    const history = this.#storage.getHistory();
    history.push({ date: this.#getDateStr(), recordedAt: new Date().toISOString(), rating });
    if (history.length > 10) history.shift();
    this.#storage.saveHistory(history);
  }

  getMultiplier() {
    return this.#storage.getMultiplier();
  }

  shouldLevelUp() {
    const history = this.#storage.getHistory();
    const last3 = history.slice(-3);
    return last3.length >= 3 && last3.every((item) => item.rating === 'too_easy');
  }

  shouldDeload() {
    const history = this.#storage.getHistory();
    const last2 = history.slice(-2);
    return last2.length >= 2 && last2.every((item) => item.rating === 'exhausting');
  }

  shouldSubstituteRecovery() {
    const history = this.#storage.getHistory();
    const last = history[history.length - 1];
    return Boolean(last && last.rating === 'exhausting');
  }

  getRecoverySubstitutes() {
    return ['balasana', 'shavasana', 'anulom-vilom', 'cat-cow', 'child-pose'];
  }

  async checkAutoProgression() {
    if (this.shouldLevelUp()) {
      this.#storage.saveMultiplier(1.1);
      return { shouldProgress: true, message: 'You\'re crushing it! Increasing targets by 10%' };
    }
    if (this.shouldDeload()) {
      this.#storage.saveMultiplier(0.85);
      return { shouldProgress: false, message: 'Recovery mode enabled. Reducing targets by 15% for the next session.' };
    }
    this.#storage.saveMultiplier(1.0);
    return { shouldProgress: false };
  }
}
