/**
 * Use Case: Start a workout session.
 * Orchestrates the workout state machine.
 */
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
      const ex = this.#exerciseRepo.getById(item.exerciseId);
      if (!ex) return null;

      const target = ex.getScaledTarget(userLevel, multiplier);

      return {
        exercise: ex,
        sets: item.sets || 1,
        target,
        currentTarget: target,
        restSec: item.restSec || workoutPlan.restBetweenSets || 20,
        completed: false,
        setsCompleted: 0
      };
    }).filter(Boolean);

    let main = resolvePhase(workoutPlan.main || []);

    if (shouldSubstitute && main.length > 0) {
      const hardestIdx = main.reduce((maxIdx, item, idx, arr) => item.target > arr[maxIdx].target ? idx : maxIdx, 0);
      const recoveryIds = this.#progression.getRecoverySubstitutes();
      const recoveryEx = this.#exerciseRepo.getById(recoveryIds[0]);
      if (recoveryEx) {
        const recoveryTarget = recoveryEx.getTarget(userLevel);
        main[hardestIdx] = {
          exercise: recoveryEx,
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

    this.#bus.emit('workout:started', session);
    return session;
  }
}
