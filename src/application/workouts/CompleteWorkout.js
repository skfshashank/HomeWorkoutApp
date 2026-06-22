/**
 * Use Case: Complete a workout and record results.
 */
import { Events } from '../../app/eventBus.js';
import { getScopedDailyRecord, todayKey } from '../../core/storage/profileData.js';

export class CompleteWorkout {
  #db;
  #bus;
  #progression;
  #getActiveProfileId;
  #exerciseRepo;

  constructor(db, bus, progressionEngine, getActiveProfileId, exerciseRepo) {
    this.#db = db;
    this.#bus = bus;
    this.#progression = progressionEngine;
    this.#getActiveProfileId = getActiveProfileId;
    this.#exerciseRepo = exerciseRepo;
  }

  async execute(session, rpeRating) {
    const profileId = this.#getActiveProfileId?.() || 'default';
    const duration = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000));
    const items = [...session.warmUp, ...session.main, ...session.coolDown];

    const record = {
      id: session.id,
      profileId,
      date: todayKey(),
      workout: session.workoutName || 'Custom',
      workoutId: session.workoutId || '',
      category: session.workoutCategory || 'custom',
      duration,
      calories: session.totalCalories,
      exercises: session.totalExercises,
      completedAt: new Date().toISOString(),
      startedAt: session.startedAt,
      exerciseIds: items.map((item) => item.exercise.id),
      exerciseDetails: items.map((item) => ({
        exerciseId: item.exercise.id,
        name: item.exercise.name,
        category: item.exercise.category,
        type: item.exercise.type,
        sets: item.sets,
        target: item.currentTarget || item.target,
        muscles: item.exercise.muscles
      }))
    };
    await this.#db.put('sessions', record);

    const log = await getScopedDailyRecord(this.#db, 'dailyLogs', profileId, todayKey(), { waterGlasses: [] });
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

    this.#bus.emit(Events.WORKOUT_COMPLETED, { record, progressCheck, rpeRating, session, profileId });
    this.#bus.emit(Events.STREAK_INCREASED, { profileId });

    return { record, progressCheck };
  }
}
