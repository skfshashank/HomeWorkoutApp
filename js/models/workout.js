export const WORKOUT_STATES = {
  IDLE: 'IDLE',
  WARM_UP: 'WARM_UP',
  EXERCISE: 'EXERCISE',
  REST: 'REST',
  COOL_DOWN: 'COOL_DOWN',
  COMPLETE: 'COMPLETE',
  PAUSED: 'PAUSED'
};

const phaseState = (phase) => {
  if (phase === 'WARM_UP') return WORKOUT_STATES.WARM_UP;
  if (phase === 'COOL_DOWN') return WORKOUT_STATES.COOL_DOWN;
  return WORKOUT_STATES.EXERCISE;
};

export class WorkoutModel {
  constructor(storage, bus, exerciseIndex, progress, rpe) {
    this.storage = storage;
    this.bus = bus;
    this.exerciseIndex = exerciseIndex;
    this.progress = progress;
    this.rpe = rpe;
    this.session = this.storage.get('active_workout', null);
  }

  resolveExercise(item) {
    if (!item) return null;
    if (typeof item === 'string') return this.exerciseIndex[item];
    return this.exerciseIndex[item.id] || item;
  }

  resolvePhaseItems(items = [], phase, difficulty, options = {}) {
    const multiplier = options.multiplier ?? 1;
    return items.map((item) => {
      const exercise = this.resolveExercise(item);
      const target = item.target || Math.max(1, Math.round(exercise.levels[difficulty] * multiplier));
      const sets = item.sets || options.setOverride || exercise.setsDefault;
      return {
        ...exercise,
        target,
        targetLabel: exercise.type === 'time' ? `${target}s` : `${target} reps`,
        sets,
        completedSets: 0,
        restSeconds: item.restSeconds ?? options.restSeconds ?? 15,
        phase,
        skipped: false
      };
    });
  }

  emitUpdate() {
    this.persist();
    this.bus.emit('workout:updated', this.getSnapshot());
  }

  persist() {
    this.storage.set('active_workout', this.session);
  }

  clearPersisted() {
    this.storage.remove('active_workout');
  }

  start(plan, context = {}) {
    const difficulty = context.profile?.level || plan.difficulty || 'beginner';
    const routine = [
      ...this.resolvePhaseItems(plan.warmUp, 'WARM_UP', difficulty, { setOverride: 1, restSeconds: 10, multiplier: 0.8 }),
      ...this.resolvePhaseItems(plan.main, 'EXERCISE', difficulty, { restSeconds: 18, multiplier: this.rpe?.getMultiplier?.() ?? 1 }),
      ...this.resolvePhaseItems(plan.coolDown, 'COOL_DOWN', difficulty, { setOverride: 1, restSeconds: 0, multiplier: 0.9 })
    ];
    this.session = {
      id: plan.id,
      title: plan.name,
      difficulty,
      startedAt: new Date().toISOString(),
      state: routine[0] ? phaseState(routine[0].phase) : WORKOUT_STATES.IDLE,
      previousState: null,
      queue: routine,
      currentIndex: 0,
      currentSet: 1,
      rest: null,
      source: context.source || 'app',
      context,
      summary: null
    };
    this.emitUpdate();
    return this.getSnapshot();
  }

  get currentExercise() {
    return this.session?.queue?.[this.session.currentIndex] ?? null;
  }

  get currentSet() {
    return this.session?.currentSet ?? 0;
  }

  getSnapshot() {
    if (!this.session) {
      return { state: WORKOUT_STATES.IDLE, queue: [], currentIndex: 0, currentSet: 0, currentExercise: null, progress: 0, summary: null, rest: null };
    }
    const progress = this.session.queue.length ? Math.round((this.session.currentIndex / this.session.queue.length) * 100) : 0;
    return {
      ...this.session,
      currentExercise: this.currentExercise,
      progress
    };
  }

  setState(state) {
    if (!this.session) return;
    this.session.state = state;
    this.emitUpdate();
  }

  beginAt(index, setNumber = 1) {
    if (!this.session) return;
    this.session.currentIndex = Math.max(0, Math.min(index, this.session.queue.length - 1));
    this.session.currentSet = setNumber;
    this.session.rest = null;
    this.session.state = phaseState(this.currentExercise.phase);
    this.emitUpdate();
  }

  finishRest() {
    if (!this.session?.rest) return;
    const { nextIndex, nextSet } = this.session.rest;
    this.beginAt(nextIndex, nextSet);
  }

  moveToNextExercise(skipped = false) {
    if (!this.session) return;
    const current = this.currentExercise;
    if (current) {
      current.skipped = skipped;
      current.completedSets = skipped ? current.completedSets : current.sets;
    }
    if (this.session.currentIndex >= this.session.queue.length - 1) {
      this.complete();
      return;
    }
    const nextIndex = this.session.currentIndex + 1;
    const nextExercise = this.session.queue[nextIndex];
    const restSeconds = current?.restSeconds ?? 12;
    if (restSeconds > 0 && nextExercise.phase !== 'COOL_DOWN') {
      this.session.rest = { seconds: restSeconds, nextIndex, nextSet: 1, nextExercise };
      this.session.currentSet = 1;
      this.session.state = WORKOUT_STATES.REST;
      this.emitUpdate();
      return;
    }
    this.beginAt(nextIndex, 1);
  }

  completeSet() {
    if (!this.session || !this.currentExercise || this.session.state === WORKOUT_STATES.PAUSED) return;
    const current = this.currentExercise;
    current.completedSets += 1;
    if (current.completedSets < current.sets) {
      this.session.currentSet = current.completedSets + 1;
      this.session.rest = {
        seconds: current.restSeconds,
        nextIndex: this.session.currentIndex,
        nextSet: current.completedSets + 1,
        nextExercise: current
      };
      this.session.state = WORKOUT_STATES.REST;
      this.emitUpdate();
      return;
    }
    this.moveToNextExercise(false);
  }

  completeExercise() {
    if (!this.currentExercise) return;
    this.currentExercise.completedSets = this.currentExercise.sets;
    this.moveToNextExercise(false);
  }

  skipExercise() {
    this.moveToNextExercise(true);
  }

  goPrevious() {
    if (!this.session) return;
    if (this.session.currentIndex === 0) {
      this.beginAt(0, 1);
      return;
    }
    this.beginAt(this.session.currentIndex - 1, 1);
  }

  pause() {
    if (!this.session || this.session.state === WORKOUT_STATES.PAUSED) return;
    this.session.previousState = this.session.state;
    this.session.state = WORKOUT_STATES.PAUSED;
    this.emitUpdate();
  }

  resume() {
    if (!this.session || this.session.state !== WORKOUT_STATES.PAUSED) return;
    this.session.state = this.session.previousState || phaseState(this.currentExercise.phase);
    this.emitUpdate();
  }

  overrideTarget(exerciseId, newTarget) {
    if (!this.session) return;
    const target = Number(newTarget);
    const exercise = this.session.queue.find((entry, index) => entry.id === exerciseId && index === this.session.currentIndex);
    if (!exercise || Number.isNaN(target) || target <= 0) return;
    exercise.target = target;
    exercise.targetLabel = exercise.type === 'time' ? `${target}s` : `${target} reps`;
    this.emitUpdate();
  }

  complete() {
    if (!this.session) return;
    const finishedAt = new Date();
    const totalSeconds = Math.max(60, Math.round((finishedAt - new Date(this.session.startedAt)) / 1000));
    const queue = this.session.queue;
    const totalReps = queue.reduce((sum, entry) => sum + (entry.type === 'reps' && !entry.skipped ? entry.target * entry.sets : 0), 0);
    const calories = queue.reduce((sum, entry) => sum + (entry.skipped ? 0 : entry.caloriesPerSet * entry.sets), 0);
    const summary = {
      planId: this.session.id,
      title: this.session.title,
      durationMinutes: Math.round(totalSeconds / 60),
      calories,
      totalReps,
      exercisesCompleted: queue.filter((entry) => !entry.skipped).length,
      totalExercises: queue.length,
      completedAt: finishedAt.toISOString(),
      difficulty: this.session.difficulty
    };
    this.progress.logWorkout(summary);
    this.session.state = WORKOUT_STATES.COMPLETE;
    this.session.summary = summary;
    this.emitUpdate();
    this.bus.emit('workout:complete', summary);
  }

  dismiss() {
    this.session = null;
    this.clearPersisted();
    this.bus.emit('workout:updated', this.getSnapshot());
  }
}
