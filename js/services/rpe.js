const isoDate = (date) => new Date(date).toISOString().slice(0, 10);

export class RPEService {
  constructor(storage) {
    this.storage = storage;
  }

  getHistory() {
    return this.storage.get('rpe_history', []);
  }

  record(rating) {
    const history = this.getHistory();
    history.push({ date: new Date().toISOString(), rating });
    this.storage.set('rpe_history', history.slice(-60));
  }

  getMultiplier() {
    const last2 = this.getHistory().slice(-2);
    if (last2.length >= 2 && last2.every((entry) => entry.rating === 'too_easy')) return 1.1;
    if (last2.length >= 1 && last2.at(-1)?.rating === 'exhausting') return 0.85;
    return 1;
  }

  shouldSubstituteRecovery() {
    return this.getHistory().at(-1)?.rating === 'exhausting';
  }

  getTodayRating() {
    return this.getHistory().findLast((entry) => isoDate(entry.date) === isoDate(new Date()))?.rating ?? null;
  }
}
