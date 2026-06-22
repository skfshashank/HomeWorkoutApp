/**
 * Use Case: Start a workout session.
 */
import { Events } from '../../app/eventBus.js';

export class StartWorkout {
  #exerciseRepo;
  #progression;
  #bus;

  constructor(exerciseRepo, progressionEngine, bus) {
    this.#exerciseRepo = exerciseRepo;
    this.#progression = progressionEngine;
    this.#bus = bus;
  }

  execute(workoutPlan, userLevel) {
    const multiplier = this.#progression.getMultiplier();
    const shouldSubstitute = this.#progression.shouldSubstituteRecovery();

    const resolvePhase = (phase) => phase.map((item) => {
      const exercise = this.#exerciseRepo.getById(item.exerciseId);
      if (!exercise) return null;
      const targetOverride = Number(item.targetOverride);
      const target = targetOverride > 0 ? targetOverride : exercise.getScaledTarget(userLevel, multiplier);

      return {
        exercise,
        exerciseId: exercise.id,
        sets: item.sets || exercise.setsDefault || 1,
        target,
        currentTarget: target,
        restSec: item.restSec || workoutPlan.restBetweenSets || 20,
        completed: false,
        setsCompleted: 0
      };
    }).filter(Boolean);

    let main = resolvePhase(workoutPlan.main || []);

    if (shouldSubstitute && main.length > 0) {
      const hardestIdx = main.reduce((maxIdx, item, idx, arr) => (item.target > arr[maxIdx].target ? idx : maxIdx), 0);
      const recoveryIds = this.#progression.getRecoverySubstitutes();
      const recoveryExercise = this.#exerciseRepo.getById(recoveryIds[0]);
      if (recoveryExercise) {
        const recoveryTarget = recoveryExercise.getTarget(userLevel);
        main[hardestIdx] = {
          exercise: recoveryExercise,
          exerciseId: recoveryExercise.id,
          sets: 1,
          target: recoveryTarget,
          currentTarget: recoveryTarget,
          restSec: 20,
          completed: false,
          setsCompleted: 0
        };
      }
    }

    const session = {
      id: Date.now().toString(36),
      startedAt: new Date().toISOString(),
      workoutId: workoutPlan.id || null,
      workoutName: workoutPlan.name || 'Custom Workout',
      workoutCategory: workoutPlan.category || 'custom',
      estimatedDuration: workoutPlan.duration || workoutPlan.estimatedDuration || 0,
      restBetweenSets: workoutPlan.restBetweenSets || 20,
      restBetweenExercises: workoutPlan.restBetweenExercises || 30,
      warmUp: resolvePhase(workoutPlan.warmUp || []),
      main,
      coolDown: resolvePhase(workoutPlan.coolDown || []),
      currentPhase: 'warmUp',
      currentIndex: 0,
      currentSet: 1,
      totalCalories: 0,
      totalExercises: 0,
      isPaused: false
    };

    this.#bus.emit(Events.WORKOUT_STARTED, session);
    return session;
  }
}
