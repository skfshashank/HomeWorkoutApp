export class GetRecovery {
  #db;
  #engine;
  #getActiveProfileId;
  #getLocalDateStr;
  #getScopedDailyRecord;

  constructor({
    db,
    recoveryEngine,
    getActiveProfileId,
    getLocalDateStr,
    getScopedDailyRecord
  }) {
    this.#db = db;
    this.#engine = recoveryEngine;
    this.#getActiveProfileId = getActiveProfileId;
    this.#getLocalDateStr = getLocalDateStr;
    this.#getScopedDailyRecord = getScopedDailyRecord;
  }

  async execute(date = this.#getLocalDateStr()) {
    const profileId = this.#getActiveProfileId();
    const [habit, dailyLog] = await Promise.all([
      this.#getScopedDailyRecord(this.#db, 'habits', profileId, date, { soreness: [] }),
      this.#getScopedDailyRecord(this.#db, 'dailyLogs', profileId, date, { waterGlasses: [] })
    ]);

    const snapshot = {
      sleep: habit?.sleep ?? habit?.sleepHours ?? 7,
      energy: habit?.energy ?? (Number(habit?.energyLevel || 0) >= 4 ? 'high' : Number(habit?.energyLevel || 0) <= 2 ? 'low' : 'medium'),
      mood: habit?.mood === '😊' ? 'great' : habit?.mood === '😟' || habit?.mood === '😠' ? 'bad' : (habit?.mood ?? 'okay'),
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
