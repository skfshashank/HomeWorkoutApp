export class TrackSoreness {
  #db;
  #getActiveProfileId;
  #getScopedDailyRecord;
  #todayKey;
  #recoveryEngine;
  #trackHabit;
  #getExercises;

  constructor({
    db,
    getActiveProfileId,
    getScopedDailyRecord,
    todayKey,
    recoveryEngine,
    trackHabit,
    getExercises
  }) {
    this.#db = db;
    this.#getActiveProfileId = getActiveProfileId;
    this.#getScopedDailyRecord = getScopedDailyRecord;
    this.#todayKey = todayKey;
    this.#recoveryEngine = recoveryEngine;
    this.#trackHabit = trackHabit;
    this.#getExercises = getExercises;
  }

  async getTodayLog(date = this.#todayKey()) {
    return this.#getScopedDailyRecord(this.#db, 'sorenessLogs', this.#getActiveProfileId(), date, { ratings: {} });
  }

  async getViewModel(date = this.#todayKey()) {
    const [soreness, habit] = await Promise.all([
      this.getTodayLog(date),
      this.#trackHabit.getHabit(date)
    ]);
    const activeGroups = Object.entries(soreness.ratings || {}).filter(([, value]) => Number(value) > 0).map(([group]) => group);
    const score = await this.#recoveryEngine.calculateScore({
      sleepHours: Number(habit.sleepHours || habit.sleep || 0),
      energy: Number(habit.energyLevel || 0) >= 4 ? 'high' : Number(habit.energyLevel || 0) <= 2 ? 'low' : (habit.energy || 'medium'),
      mood: habit.mood === '😊' ? 'great' : habit.mood === '😟' || habit.mood === '😠' ? 'bad' : (habit.mood || 'okay'),
      soreness: activeGroups
    });
    const recommendation = this.#recoveryEngine.getRecommendation(score);
    const avoid = this.#recoveryEngine.getMusclestoAvoid(activeGroups);
    const suggestions = this.#getExercises.getAll()
      .filter((exercise) => !exercise.muscles.some((muscle) => avoid.includes(muscle)))
      .slice(0, 6);

    return {
      soreness,
      activeGroups,
      score,
      recommendation,
      avoid,
      suggestions
    };
  }

  async cycleGroup(group, date = this.#todayKey()) {
    const log = await this.getTodayLog(date);
    const current = Number(log.ratings?.[group] || 0);
    log.ratings = log.ratings || {};
    log.ratings[group] = (current + 1) % 4;
    await this.#db.put('sorenessLogs', log);
    return log;
  }
}
