import { WORKOUT_STATES } from '../models/workout.js';

export class TrainerView {
  constructor(bus, workout, audio, voice, timer, motion, container) {
    this.bus = bus;
    this.workout = workout;
    this.audio = audio;
    this.voice = voice;
    this.timer = timer;
    this.motion = motion;
    this.container = container;
    this.activeTimerKey = null;
    this.lastAnnouncementKey = null;
    this.motionCount = 0;
    this.container.addEventListener('click', (event) => this.handleClick(event));
    this.bus.on('workout:updated', (snapshot) => this.render(snapshot));
    this.bus.on('motion:count', ({ count }) => {
      this.motionCount = count;
      const target = this.container.querySelector('[data-role="motion-count"]');
      if (target) target.textContent = String(count);
    });
  }

  scheduleTimer(snapshot) {
    if (!snapshot.currentExercise || snapshot.state === WORKOUT_STATES.PAUSED || snapshot.state === WORKOUT_STATES.COMPLETE || snapshot.state === WORKOUT_STATES.IDLE) {
      return;
    }
    const isRest = snapshot.state === WORKOUT_STATES.REST;
    const isTimedExercise = !isRest && snapshot.currentExercise.type === 'time';
    if (!isRest && !isTimedExercise) {
      this.timer.stop(true);
      this.activeTimerKey = null;
      return;
    }
    const total = isRest ? snapshot.rest.seconds : snapshot.currentExercise.target;
    const key = `${snapshot.state}:${snapshot.currentIndex}:${snapshot.currentSet}:${total}`;
    if (this.activeTimerKey === key) {
      if (this.timer.isPaused) this.timer.resume();
      return;
    }
    this.activeTimerKey = key;
    if (isRest) {
      this.voice.announceRest(total);
    } else {
      this.voice.announceExercise(snapshot.currentExercise.name, snapshot.currentExercise.targetLabel);
    }
    this.timer.startCountdown(total, {
      onTick: (remaining) => {
        const countdown = this.container.querySelector('[data-role="countdown"]');
        if (countdown) countdown.textContent = remaining;
      },
      onThree: () => this.audio.countdown321(),
      onComplete: () => {
        if (isRest) this.bus.emit('workout:finish-rest');
        else this.bus.emit('workout:complete-set');
      }
    }, { key, state: snapshot.state });
  }

  stopMotionIfNeeded(snapshot) {
    if (!snapshot.currentExercise || snapshot.currentExercise.type !== 'reps') {
      this.motion.stopCounting();
      this.motionCount = 0;
    }
  }

  render(snapshot = this.workout.getSnapshot()) {
    if (snapshot.state === WORKOUT_STATES.IDLE) {
      this.timer.stop(true);
      this.container.classList.add('hidden');
      this.container.innerHTML = '';
      return;
    }
    this.container.classList.remove('hidden');
    this.stopMotionIfNeeded(snapshot);
    if (snapshot.state === WORKOUT_STATES.COMPLETE) {
      this.timer.stop(true);
      if (this.lastAnnouncementKey !== 'complete') {
        this.audio.complete();
        this.voice.announceComplete();
        this.lastAnnouncementKey = 'complete';
      }
      const summary = snapshot.summary;
      this.container.innerHTML = `
        <div class="trainer-panel">
          <div class="section-header"><h2>Workout complete</h2><span class="badge badge-advanced">Done</span></div>
          <div class="grid-3">
            <div class="stat-item"><span class="tiny muted">Minutes</span><strong>${summary.durationMinutes}</strong></div>
            <div class="stat-item"><span class="tiny muted">Calories</span><strong>${summary.calories}</strong></div>
            <div class="stat-item"><span class="tiny muted">Exercises</span><strong>${summary.exercisesCompleted}/${summary.totalExercises}</strong></div>
          </div>
          <div class="stack">
            <h3>How did that feel?</h3>
            <div class="grid-3">
              <button class="btn btn-ghost" type="button" data-action="rate-rpe" data-rating="too_easy">Too easy</button>
              <button class="btn btn-primary" type="button" data-action="rate-rpe" data-rating="just_right">Just right</button>
              <button class="btn btn-danger" type="button" data-action="rate-rpe" data-rating="exhausting">Exhausting</button>
            </div>
          </div>
          <button class="btn btn-accent" type="button" data-action="close-trainer">Back to app</button>
        </div>`;
      return;
    }
    const exercise = snapshot.currentExercise;
    const timerValue = snapshot.state === WORKOUT_STATES.REST ? snapshot.rest.seconds : exercise.type === 'time' ? exercise.target : null;
    const progressWidth = Math.min(100, Math.max(5, Math.round(((snapshot.currentIndex + (snapshot.state === WORKOUT_STATES.COMPLETE ? 1 : 0)) / snapshot.queue.length) * 100)));
    const announcementKey = `${snapshot.state}:${snapshot.currentIndex}:${snapshot.currentSet}`;
    if (this.lastAnnouncementKey !== announcementKey && snapshot.state !== WORKOUT_STATES.REST) {
      this.lastAnnouncementKey = announcementKey;
    }
    this.container.innerHTML = `
      <div class="trainer-panel">
        <div class="stack-header">
          <div>
            <p class="eyebrow">${snapshot.title}</p>
            <h2>${snapshot.state === WORKOUT_STATES.REST ? 'Recovery window' : exercise.name}</h2>
            <p class="tiny muted">${snapshot.currentIndex + 1} / ${snapshot.queue.length} • ${snapshot.state.replace('_', ' ')}</p>
          </div>
          <button class="btn btn-ghost" type="button" data-action="close-trainer">Close</button>
        </div>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${progressWidth}%"></div></div>
        <section class="exercise-demo">
          <div class="exercise-demo__avatar ${snapshot.state === WORKOUT_STATES.REST ? 'anim-breathing' : exercise.animation}">${snapshot.state === WORKOUT_STATES.REST ? '😮‍💨' : exercise.emoji}</div>
          <div class="exercise-demo__caption">${snapshot.state === WORKOUT_STATES.REST ? `Next: ${snapshot.rest.nextExercise?.name || exercise.name}` : `${exercise.nameHindi} • ${exercise.description}`}</div>
        </section>
        <div class="metric-row">
          <article class="stat-item"><span class="tiny muted">Target</span><strong>${snapshot.state === WORKOUT_STATES.REST ? `${timerValue}s` : exercise.targetLabel}</strong></article>
          <article class="stat-item"><span class="tiny muted">Set</span><strong>${snapshot.currentSet}/${exercise.sets}</strong></article>
          <article class="stat-item"><span class="tiny muted">Motion</span><strong data-role="motion-count">${this.motionCount}</strong></article>
        </div>
        ${timerValue ? `<div class="card stack"><h3 class="timer-display" data-role="countdown">${timerValue}</h3><p class="tiny muted">${snapshot.state === WORKOUT_STATES.REST ? 'Breathe and reset.' : 'Countdown is active.'}</p></div>` : ''}
        <div class="set-dots">${Array.from({ length: exercise.sets }, (_, index) => `<span class="set-dot ${index < exercise.completedSets ? 'is-complete' : ''}"></span>`).join('')}</div>
        <div class="grid-2">
          <article class="card stack"><h3>How to do it</h3><ul>${exercise.steps.map((step) => `<li>${step}</li>`).join('')}</ul></article>
          <article class="card stack"><h3>Coach cues</h3><ul>${exercise.tips.map((tip) => `<li>${tip}</li>`).join('')}</ul><p class="tiny muted">${exercise.breathing}</p></article>
        </div>
        <div class="inline-actions">
          <button class="btn btn-ghost" type="button" data-action="previous-exercise">Previous</button>
          <button class="btn btn-ghost" type="button" data-action="toggle-pause">${snapshot.state === WORKOUT_STATES.PAUSED ? 'Resume' : 'Pause'}</button>
          <button class="btn btn-ghost" type="button" data-action="skip-exercise">Skip</button>
        </div>
        <div class="inline-actions">
          <button class="btn btn-accent" type="button" data-action="adjust-target">Adjust target</button>
          ${exercise.type === 'reps' ? '<button class="btn btn-ghost" type="button" data-action="toggle-motion">Auto count</button>' : ''}
          ${snapshot.state === WORKOUT_STATES.REST ? '<button class="btn btn-primary" type="button" data-action="finish-rest">End rest now</button>' : exercise.type === 'reps' ? '<button class="btn btn-primary" type="button" data-action="complete-set">Done set</button>' : ''}
        </div>
      </div>`;
    this.scheduleTimer(snapshot);
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const snapshot = this.workout.getSnapshot();
    switch (button.dataset.action) {
      case 'close-trainer':
        this.motion.stopCounting();
        this.timer.stop(true);
        this.bus.emit('workout:dismiss');
        break;
      case 'toggle-pause':
        this.bus.emit('workout:toggle-pause');
        break;
      case 'skip-exercise':
        this.bus.emit('workout:skip');
        break;
      case 'previous-exercise':
        this.bus.emit('workout:previous');
        break;
      case 'finish-rest':
        this.bus.emit('workout:finish-rest');
        break;
      case 'complete-set':
        this.bus.emit('workout:complete-set');
        break;
      case 'adjust-target': {
        const value = globalThis.prompt?.('Set a new target for this exercise', String(snapshot.currentExercise.target));
        if (value) this.bus.emit('workout:override-target', { exerciseId: snapshot.currentExercise.id, target: Number(value) });
        break;
      }
      case 'toggle-motion':
        if (this.motion.active) this.motion.stopCounting();
        else this.motion.startCounting(snapshot.currentExercise.id);
        break;
      case 'rate-rpe':
        this.bus.emit('rpe:record', { rating: button.dataset.rating });
        break;
      default:
        break;
    }
  }
}

