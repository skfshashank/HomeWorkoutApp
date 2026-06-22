/**
 * Use Case: Complete a workout and record results.
 */
export class CompleteWorkout {
  #db;
  #bus;
  #events;
  #progression;
  #getActiveProfileId;
  #exerciseRepo;
  #todayKey;
  #getScopedDailyRecord;

  constructor({
    db,
    bus,
    events,
    progressionEngine,
    getActiveProfileId,
    exerciseRepo,
    todayKey,
    getScopedDailyRecord
  }) {
    this.#db = db;
    this.#bus = bus;
    this.#events = events;
    this.#progression = progressionEngine;
    this.#getActiveProfileId = getActiveProfileId;
    this.#exerciseRepo = exerciseRepo;
    this.#todayKey = todayKey;
    this.#getScopedDailyRecord = getScopedDailyRecord;
  }

  async execute(session, rpeRating, note = '') {
    const profileId = this.#getActiveProfileId?.() || 'default';
    const duration = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000));
    const items = [...session.warmUp, ...session.main, ...session.coolDown];

    const record = {
      id: session.id,
      profileId,
      date: this.#todayKey(),
      workout: session.workoutName || 'Custom',
      workoutId: session.workoutId || '',
      category: session.workoutCategory || 'custom',
      duration,
      calories: session.totalCalories,
      exercises: session.totalExercises,
      note: String(note || session.note || '').trim(),
      completedAt: new Date().toISOString(),
      startedAt: session.startedAt,
      exerciseIds: items.map((item) => item.exercise?.id || item.exerciseId),
      exerciseDetails: items.map((item) => ({
        exerciseId: item.exercise?.id || item.exerciseId,
        name: item.exercise?.name || '',
        category: item.exercise?.category || '',
        type: item.exercise?.type || '',
        sets: item.sets,
        target: item.currentTarget || item.target,
        muscles: item.exercise?.muscles || []
      }))
    };
    await this.#db.put('sessions', record);

    const log = await this.#getScopedDailyRecord(this.#db, 'dailyLogs', profileId, this.#todayKey(), { waterGlasses: [] });
    log.workoutCompleted = true;
    log.calories = (log.calories || 0) + session.totalCalories;
    log.minutes = (log.minutes || 0) + duration;
    log.exerciseCount = (log.exerciseCount || 0) + session.totalExercises;
    await this.#db.put('dailyLogs', log);

    if (this.#exerciseRepo?.recordUsage) {
      await this.#exerciseRepo.recordUsage(record.exerciseIds);
    }

    if (rpeRating) {
      await this.#progression.recordRPE(rpeRating);
    }

    const progressCheck = await this.#progression.checkAutoProgression();
    const payload = { record, progressCheck, rpeRating, session, profileId };
    this.#bus.emit(this.#events.WORKOUT_COMPLETED, payload);
    this.#bus.emit(this.#events.STREAK_INCREASED, { profileId });

    return { record, progressCheck };
  }
}
