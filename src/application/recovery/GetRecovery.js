import { RecoveryEngine } from '../../domain/services/RecoveryEngine.js';
import { getLocalDateStr } from '../../core/utils/dateUtils.js';

export class GetRecovery {
  #db;
  #prefs;
  #bus;
  #engine;

  constructor(db, prefs, bus) {
    this.#db = db;
    this.#prefs = prefs;
    this.#bus = bus;
    this.#engine = new RecoveryEngine(db, getLocalDateStr);
  }

  async execute(date = getLocalDateStr()) {
    const [habit, dailyLog] = await Promise.all([
      this.#db.get('habits', date),
      this.#db.get('dailyLogs', date)
    ]);

    const snapshot = {
      sleep: habit?.sleep ?? 7,
      energy: habit?.energy ?? 'medium',
      mood: habit?.mood ?? 'okay',
      soreness: habit?.soreness ?? [],
      steps: habit?.steps ?? dailyLog?.steps ?? 0
    };

    const score = await this.#engine.calculateScore(snapshot);
    const consecutiveDays = await this.#engine.getRecentConsecutiveDays();

    return {
      date,
      snapshot,
      score,
      consecutiveDays,
      recommendation: this.#engine.getRecommendation(score),
      musclesToAvoid: this.#engine.getMusclestoAvoid(snapshot.soreness)
    };
  }
}
