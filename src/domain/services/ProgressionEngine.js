/**
 * ProgressionEngine - adaptive difficulty based on RPE feedback.
 */
const defaultGetProfileRecords = async (db, storeName) => db.getAll(storeName);

export class ProgressionEngine {
  #db;
  #prefs;
  #getActiveProfileId;
  #getProfileRecords;

  constructor({
    db,
    prefs,
    getActiveProfileId = () => 'default',
    getProfileRecords = defaultGetProfileRecords
  }) {
    this.#db = db;
    this.#prefs = prefs;
    this.#getActiveProfileId = getActiveProfileId;
    this.#getProfileRecords = getProfileRecords;
  }

  #historyKey() {
    return `rpe_history_${this.#getActiveProfileId()}`;
  }

  async recordRPE(rating) {
    const history = this.#prefs.get(this.#historyKey(), []);
    history.push({ date: new Date().toISOString(), rating });
    if (history.length > 10) history.shift();
    this.#prefs.set(this.#historyKey(), history);
  }

  getMultiplier() {
    const history = this.#prefs.get(this.#historyKey(), []);
    const last2 = history.slice(-2);
    if (last2.length >= 2 && last2.every((item) => item.rating === 'too_easy')) return 1.1;
    if (last2.length >= 1 && last2[last2.length - 1].rating === 'exhausting') return 0.85;
    return 1.0;
  }

  shouldLevelUp() {
    const history = this.#prefs.get(this.#historyKey(), []);
    const last3 = history.slice(-3);
    return last3.length >= 3 && last3.every((item) => item.rating === 'too_easy');
  }

  shouldDeload() {
    const history = this.#prefs.get(this.#historyKey(), []);
    const last2 = history.slice(-2);
    return last2.length >= 2 && last2.every((item) => item.rating === 'exhausting');
  }

  shouldSubstituteRecovery() {
    const history = this.#prefs.get(this.#historyKey(), []);
    const last = history[history.length - 1];
    return Boolean(last && last.rating === 'exhausting');
  }

  getRecoverySubstitutes() {
    return ['balasana', 'shavasana', 'anulom-vilom', 'cat-cow', 'child-pose'];
  }

  async checkAutoProgression() {
    const logs = await this.#getProfileRecords(this.#db, 'dailyLogs', this.#getActiveProfileId());
    const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    if (recent.length >= 3 && recent.every((log) => log.workoutCompleted)) {
      return { shouldProgress: true, message: 'You\'re crushing it! Increasing targets by 10%' };
    }
    return { shouldProgress: false };
  }
}
