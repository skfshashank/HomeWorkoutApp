import { Events } from '../../app/eventBus.js';
import { formatDuration } from '../../core/utils/dateUtils.js';
import { closeAccessibleModal, openAccessibleModal } from '../../core/utils/modalAccessibility.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class TrainerView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.getElementById('workout-player');
    this.modal = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');
    this.timerId = null;
    this.modalCleanup = null;
    this.lastFocusedElement = null;
    this.modalDismissHandler = null;
    this.session = null;
    this.queue = [];
    this.currentIndex = 0;
    this.currentSet = 1;
    this.mode = 'idle';
    this.remaining = 0;
    this.paused = false;
    this.completedSets = 0;
    this.completionResult = null;
    this.completionStreakDays = 0;
    this.noteFeedback = '';

    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on(Events.WORKOUT_STARTED, (session) => this.start(session));
  }

  renderExerciseName(exercise) {
    return `<span class="exercise-name">${exercise.name}</span>${exercise.nameHindi ? `<span class="exercise-name-hindi">${exercise.nameHindi}</span>` : ''}`;
  }

  renderExerciseVideo(exercise) {
    if (exercise && exercise.video) {
      return `<div class="exercise-video-wrap">
        <video class="exercise-video" src="${exercise.video}" autoplay loop muted playsinline preload="auto" aria-label="${exercise.name} ${this.t('animated_demo_description', 'animated demonstration')}"></video>
      </div>`;
    }
    return `<div class="exercise-demo__avatar ${exercise?.animation || ''}">${exercise?.emoji || '💪'}</div>`;
  }

  renderProgressLiveText(percent) {
    return this.ctx.i18n?.format?.('workout_progress', { percent, current: this.currentIndex + 1, total: this.queue.length })
      || `Workout progress ${percent} percent. Exercise ${this.currentIndex + 1} of ${this.queue.length}.`;
  }

  t(key, fallback = key) {
    return this.ctx.i18n?.t(key) || fallback;
  }

  renderTimerAttributes(seconds, shouldAnnounce = true) {
    if (!shouldAnnounce) return 'aria-atomic="true"';
    return `aria-atomic="true"${seconds === 30 || seconds === 10 || seconds <= 3 ? ' aria-live="assertive"' : ''}`;
  }

  // Lightweight per-second update: refresh only the countdown text so the demo
  // player (canvas figure / photo loop) is NOT torn down and recreated every
  // second. Rebuilding it each tick would reset the animation before it plays.
  updateTimerDisplay() {
    const display = this.el && this.el.querySelector('.timer-display');
    if (!display) {
      this.render();
      return;
    }
    let value;
    let announce = true;
    if (this.mode === 'rest') {
      value = formatDuration(this.remaining);
    } else if (this.mode === 'prepare') {
      value = this.remaining;
    } else {
      const item = this.currentItem();
      const isTimeBased = item && item.exercise && item.exercise.isTimeBased;
      value = isTimeBased
        ? formatDuration(this.remaining)
        : (item ? (item.currentTarget || item.target) : this.remaining);
      announce = !!isTimeBased;
    }
    display.textContent = value;
    if (announce && (this.remaining === 30 || this.remaining === 10 || this.remaining <= 3)) {
      display.setAttribute('aria-live', 'assertive');
    } else {
      display.removeAttribute('aria-live');
    }
  }

  renderExerciseGuide(exercise) {
    const steps = (exercise.steps || []).length
      ? exercise.steps.map((step) => `<li>${step}</li>`).join('')
      : '<li>Move with steady control and stop when your form slips.</li>';
    const tips = Array.isArray(exercise.tips) ? exercise.tips.filter(Boolean).join(' • ') : exercise.tips;

    return `
      <div class="exercise-guide card w-full mb-16">
        <div class="exercise-guide__header">
          <div>
            <strong>${this.t('movement_guide', 'Movement guide')}</strong>
            <div class="text-sm text-muted">${exercise.description || 'Smooth, controlled reps beat rushed reps.'}</div>
          </div>
          <div class="exercise-chip-row">
            ${(exercise.muscles || []).slice(0, 3).map((muscle) => `<span class="chip">${muscle.replaceAll('_', ' ')}</span>`).join('')}
          </div>
        </div>
        <div class="exercise-steps">
          <ol>${steps}</ol>
        </div>
        <div class="exercise-guide__meta">
          <div class="exercise-guide__panel">
            <strong>💡 ${this.t('tips', 'Tips')}</strong>
            <p>${tips || this.t('default_tips', 'Keep your posture tall, stay in control, and stop before your form fades.')}</p>
          </div>
          <div class="exercise-guide__panel">
            <strong>🫁 ${this.t('breathing', 'Breathing')}</strong>
            <p>${exercise.breathing || this.t('default_breathing', 'Use a steady inhale through the easy phase and exhale through the effort.')}</p>
          </div>
        </div>
      </div>`;
  }

  render() {
    if (!this.session) {
      this.el.innerHTML = '';
      this.el.classList.remove('active');
      return;
    }

    if (this.mode === 'complete') {
      this.renderCompletion();
      return;
    }

    if (this.mode === 'rest') {
      this.renderRest();
      return;
    }

    const item = this.currentItem();
    if (!item) {
      this.finishWorkout();
      return;
    }

    const exercise = item.exercise;
    const percent = this.queue.length ? Math.round((this.currentIndex / this.queue.length) * 100) : 0;
    const currentTarget = item.currentTarget || item.target;
    const isRepBased = exercise.isRepBased;
    const displayValue = this.mode === 'prepare'
      ? this.remaining
      : isRepBased
        ? currentTarget
        : formatDuration(this.remaining);
    const displayLabel = this.mode === 'prepare'
      ? this.t('starting_in', 'Starting in')
      : isRepBased
        ? this.t('reps', 'reps')
        : this.t('time_remaining', 'time remaining');

    this.el.classList.add('active');
    this.el.innerHTML = `
      <div class="fs-header">
        <div>
          <div class="text-sm text-muted">${this.session.workoutName}</div>
          <strong>${this.currentIndex + 1} / ${this.queue.length} ${this.t('exercises', 'Exercises').toLowerCase()}</strong>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" data-action="exit-workout">✕ ${this.t('exit', 'Exit')}</button>
          <button class="btn btn-secondary btn-sm" data-action="skip">${this.t('skip', 'Skip')}</button>
        </div>
      </div>
      <div class="progress-bar" role="progressbar" aria-label="${this.t('progress_title', 'Progress')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="fill" style="width:${percent}%"></div></div>
      <div class="sr-only" aria-live="polite" aria-atomic="true">${this.renderProgressLiveText(percent)}</div>
      <div class="fs-content">
      <div class="exercise-demo-shell w-full mb-16">
        ${this.renderExerciseVideo(exercise)}
        <div class="exercise-demo__caption">
          <div class="exercise-name-stack">${this.renderExerciseName(exercise)}</div>
          <div class="text-sm text-muted">${item.phaseLabel}</div>
        </div>
        <div class="exercise-steps-visual">
          ${(exercise.steps || []).map((step, i) => `<div class="step-visual" style="animation-delay:${i * 3}s"><span class="step-number">${i + 1}</span><span class="step-text">${step}</span></div>`).join('')}
        </div>
        ${this.renderExerciseGuide(exercise)}
      </div>

      <div class="text-center mb-16">
        <div class="timer-display" ${this.renderTimerAttributes(this.remaining, this.mode === 'prepare' || exercise.isTimeBased)}>${displayValue}</div>
        <div class="timer-label">${displayLabel}</div>
      </div>

        <div class="set-dots">
          ${Array.from({ length: item.sets }, (_, index) => `<span class="set-dot ${index + 1 < this.currentSet ? 'completed' : ''} ${index + 1 === this.currentSet ? 'current' : ''}"></span>`).join('')}
        </div>
        <div class="text-sm text-muted mb-16">${this.t('sets', 'Sets')} ${this.currentSet} ${this.t('of', 'of')} ${item.sets}</div>

        <div class="card w-full mb-16">
          <div class="flex flex-between gap-12 mb-8">
            <strong>${this.t('session_controls', 'Session controls')}</strong>
            <div class="flex gap-8 flex-wrap">
              <button class="btn btn-secondary btn-sm" data-action="swap-exercise">${this.t('swap', 'Swap')}</button>
              <button class="btn btn-secondary btn-sm" data-action="adjust-target">${this.t('adjust_target', 'Adjust target')}</button>
            </div>
          </div>
          <p class="text-sm text-muted">${this.t('trainer_need_variation', 'Need a variation? Swap keeps your place in the workout while replacing just this movement.')}</p>
        </div>

        ${isRepBased && this.mode === 'exercise' ? `<button class="btn btn-primary btn-lg w-full mb-16" data-action="complete-set">${this.t('complete_set', 'Complete set')}</button>` : ''}

        <div class="grid-3 w-full">
          <button class="btn btn-secondary" data-action="previous">${this.t('previous', 'Previous')}</button>
          <button class="btn btn-accent" data-action="pause">${this.paused ? this.t('resume', 'Resume') : this.t('pause', 'Pause')}</button>
          <button class="btn btn-secondary" data-action="skip">${this.t('skip', 'Skip')}</button>
        </div>
      </div>`;
  }

  renderRest() {
    const next = this.currentItem();
    const percent = Math.round((this.currentIndex / Math.max(this.queue.length, 1)) * 100);
    this.el.classList.add('active');
    this.el.innerHTML = `
      <div class="fs-header">
        <div>
          <div class="text-sm text-muted">${this.t('recovery', 'Recovery')}</div>
          ${next ? `<div class="exercise-name-stack">${this.renderExerciseName(next.exercise)}</div>` : `<strong>${this.t('almost_done', 'Almost done')}</strong>`}
        </div>
        <button class="btn btn-secondary btn-sm" data-action="skip">${this.t('skip', 'Skip')} ${this.t('rest', 'Rest').toLowerCase()}</button>
      </div>
      <div class="progress-bar" role="progressbar" aria-label="${this.t('progress_title', 'Progress')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="fill" style="width:${percent}%"></div></div>
      <div class="sr-only" aria-live="polite" aria-atomic="true">${this.renderProgressLiveText(percent)}</div>
      <div class="fs-content">
        <div class="exercise-demo w-full mb-16">
          <div class="exercise-demo__avatar anim-breathing">😮‍💨</div>
          <div class="exercise-demo__caption">
            <strong>${this.t('rest', 'Rest')}</strong>
            <div class="text-sm text-muted">${this.t('trainer_breathe_reset', 'Breathe, reset, and get ready.')}</div>
          </div>
        </div>
        <div class="timer-display" ${this.renderTimerAttributes(this.remaining)}>${formatDuration(this.remaining)}</div>
        <div class="timer-label">${this.t('seconds_until_restart', 'seconds until restart')}</div>
        <div class="grid-3 w-full mt-24">
          <button class="btn btn-secondary" data-action="previous">${this.t('previous', 'Previous')}</button>
          <button class="btn btn-accent" data-action="pause">${this.paused ? this.t('resume', 'Resume') : this.t('pause', 'Pause')}</button>
          <button class="btn btn-secondary" data-action="skip">${this.t('skip', 'Skip')}</button>
        </div>
      </div>`;
  }

  renderCompletion() {
    const record = this.completionResult?.record;
    const progressCheck = this.completionResult?.progressCheck;
    const duration = record?.duration || 0;
    const calories = record?.calories || this.session?.totalCalories || 0;
    const exercises = record?.exercises || this.session?.totalExercises || 0;
    const streakDays = this.completionStreakDays || 0;
    const note = record?.note || '';

    this.el.classList.add('active');
    this.el.innerHTML = `
      <div class="fs-content" style="justify-content:center;">
        <div class="workout-complete mb-24">
          <div class="complete-icon">🎉</div>
          <h2 class="text-center">${this.t('great_work', 'Amazing Work!')}</h2>
          <p class="complete-stats">${duration} ${this.t('minutes', 'min')} · ${calories} ${this.t('calories', 'cal')} · ${exercises} ${this.t('exercises', 'exercises')}</p>
          <p class="coach-tip">${this.ctx.i18n?.format?.('trainer_days_strong', { days: streakDays }) || `You're ${streakDays} days strong!`} ${this.t('keep_going', 'Keep this momentum going')}.</p>
        </div>
        <div class="grid-3 w-full mb-24">
          <div class="stat-card"><div class="stat-value">${calories}</div><div class="stat-label">${this.t('calories', 'Calories')}</div></div>
          <div class="stat-card"><div class="stat-value">${duration}</div><div class="stat-label">${this.t('minutes', 'Minutes')}</div></div>
          <div class="stat-card"><div class="stat-value">${this.completedSets}</div><div class="stat-label">${this.t('sets', 'Sets')}</div></div>
        </div>
        ${progressCheck?.message ? `<div class="card mb-24"><p class="text-sm">${progressCheck.message}</p></div>` : ''}
        <div class="card w-full mb-24">
          <div class="flex flex-between gap-12 mb-8">
            <strong>${this.t('trainer_session_notes_title', 'Add notes about this session (optional)')}</strong>
            <button class="btn btn-secondary btn-sm" data-action="save-note">${this.t('save', 'Save')}</button>
          </div>
          <textarea id="session-note" class="form-input note-input" rows="4" placeholder="${this.t('trainer_session_notes_placeholder', 'How did it feel? Any wins, pain points, or adjustments for next time?')}">${note}</textarea>
          <div class="text-sm text-muted mt-8">${this.noteFeedback || this.t('trainer_session_saved_feedback', 'Saved with this workout in your local history.')}</div>
        </div>
        <button class="btn btn-primary btn-lg w-full" data-action="close-complete">${this.t('back_to_dashboard', 'Back to dashboard')}</button>
      </div>`;
  }

  start(session) {
    this.cleanupTimer();
    this.closeModal();
    this.session = session;
    this.queue = this.buildQueue(session);
    this.currentIndex = 0;
    this.currentSet = 1;
    this.mode = 'prepare';
    this.remaining = 3;
    this.paused = false;
    this.completedSets = 0;
    this.completionResult = null;
    this.completionStreakDays = 0;
    this.noteFeedback = '';
    this.session.totalCalories = 0;
    this.session.totalExercises = 0;
    document.body.style.overflow = 'hidden';
    this.startCurrentSequence(true);
  }

  buildQueue(session) {
    const mapPhase = (items, phaseLabel, phaseKey) => items.map((item, phaseIndex) => ({
      ...item,
      phaseLabel,
      phaseKey,
      phaseIndex
    }));
    return [
      ...mapPhase(session.warmUp, this.t('warm_up', 'Warm-up'), 'warmUp'),
      ...mapPhase(session.main, this.t('main_set', 'Main set'), 'main'),
      ...mapPhase(session.coolDown, this.t('cool_down', 'Cool-down'), 'coolDown')
    ];
  }

  currentItem() {
    return this.queue[this.currentIndex] || null;
  }

  startCurrentSequence(announce = true) {
    const item = this.currentItem();
    if (!item) {
      this.finishWorkout();
      return;
    }

    this.cleanupTimer();
    this.mode = 'prepare';
    this.remaining = 3;
    this.paused = false;

    if (announce) {
      const target = `${item.currentTarget || item.target} ${item.exercise.targetLabel}`;
      Promise.resolve(this.ctx.speech.announceExercise(item.exercise.name, target)).catch(() => null);
    }

    this.ctx.audio.countdown321();
    this.render();
    this.timerId = window.setInterval(() => {
      if (this.paused) return;
      this.remaining -= 1;
      if (this.remaining > 0) {
        this.ctx.audio.countdown321();
        this.updateTimerDisplay();
        return;
      }

      this.cleanupTimer();
      this.ctx.audio.go();
      if (item.exercise.isTimeBased) {
        this.startTimedSet();
      } else {
        this.mode = 'exercise';
        this.render();
      }
    }, 1000);
  }

  startTimedSet() {
    const item = this.currentItem();
    if (!item) return;
    this.cleanupTimer();
    this.mode = 'exercise';
    this.remaining = item.currentTarget || item.target;
    this.render();

    this.timerId = window.setInterval(() => {
      if (this.paused) return;
      this.remaining -= 1;
      if (this.remaining > 0) {
        if (this.remaining <= 3) this.ctx.audio.countdown321();
        this.updateTimerDisplay();
        return;
      }
      this.cleanupTimer();
      this.completeSet();
    }, 1000);
  }

  startRest(seconds) {
    this.cleanupTimer();
    this.mode = 'rest';
    this.remaining = Math.max(5, Math.round(seconds));
    this.paused = false;
    this.ctx.audio.rest();
    Promise.resolve(this.ctx.speech.announceRest(this.remaining)).catch(() => null);
    this.render();

    this.timerId = window.setInterval(() => {
      if (this.paused) return;
      this.remaining -= 1;
      if (this.remaining > 0) {
        if (this.remaining <= 3) this.ctx.audio.countdown321();
        this.updateTimerDisplay();
        return;
      }
      this.cleanupTimer();
      this.startCurrentSequence(true);
    }, 1000);
  }

  completeSet(skipped = false) {
    const item = this.currentItem();
    if (!item) return;

    if (!skipped) {
      this.completedSets += 1;
      this.session.totalCalories += item.exercise.caloriesPerSet || 0;
    }

    if (this.currentSet < item.sets) {
      this.currentSet += 1;
      this.startRest(item.restSec || this.session.restBetweenSets || 20);
      return;
    }

    if (!skipped) {
      this.session.totalExercises += 1;
    }

    this.currentIndex += 1;
    this.currentSet = 1;

    if (this.currentIndex >= this.queue.length) {
      this.finishWorkout();
      return;
    }

    this.startRest(this.session.restBetweenExercises || 25);
  }

  async finishWorkout() {
    this.cleanupTimer();
    if (!this.session) return;
    Promise.resolve(this.ctx.speech.announceComplete()).catch(() => null);
    this.ctx.audio.complete();
    const rating = await this.promptRPE();
    this.completionResult = await this.ctx.completeWorkout.execute(this.session, rating);
    const progress = await this.ctx.getProgress.execute();
    this.completionStreakDays = progress.streak || 0;
    this.mode = 'complete';
    this.launchConfetti();
    this.render();
  }

  promptRPE() {
    return new Promise((resolve) => {
      this.openModal(`
        <div class="text-center mb-16">
          <h2 id="modal-title">${this.t('trainer_rpe_title', 'How did that feel?')}</h2>
          <p class="text-sm text-muted">${this.t('trainer_rpe_subtitle', 'Your answer helps OpenFit adapt tomorrow\'s target.')}</p>
        </div>
        <div class="rpe-options">
          <button class="rpe-option" data-rpe="too_easy"><span class="rpe-emoji">😌</span><span class="rpe-label">${this.t('too_easy', 'Too Easy')}</span></button>
          <button class="rpe-option" data-rpe="just_right"><span class="rpe-emoji">😎</span><span class="rpe-label">${this.t('just_right', 'Just Right')}</span></button>
          <button class="rpe-option" data-rpe="exhausting"><span class="rpe-emoji">🥵</span><span class="rpe-label">${this.t('exhausting', 'Exhausting')}</span></button>
        </div>`, (event) => {
        const option = event.target.closest('[data-rpe]');
        if (!option) return;
        const value = option.dataset.rpe;
        this.closeModal({ notify: false, reason: 'selected' });
        resolve(value);
      }, { closeOnBackdrop: false, onDismiss: () => resolve(null) });
    });
  }

  openAdjustTargetModal() {
    const item = this.currentItem();
    if (!item) return;
    const label = item.exercise.isTimeBased ? this.t('seconds', 'seconds') : this.t('reps', 'reps');

    this.openModal(`
      <h2 class="mb-16" id="modal-title">${this.t('adjust_target', 'Adjust target')}</h2>
      <form id="adjust-target-form">
        <div class="form-group">
          <label class="form-label">${this.ctx.i18n?.format?.('target_with_unit', { unit: label }) || `Target (${label})`}</label>
          <input class="form-input" type="number" name="target" min="1" value="${item.currentTarget || item.target}" required>
        </div>
        <div class="grid-2 mt-24">
          <button type="button" class="btn btn-secondary" data-close-modal="true">${this.t('cancel', 'Cancel')}</button>
          <button type="submit" class="btn btn-primary">${this.t('save', 'Save')}</button>
        </div>
      </form>`, (event) => {
      if (event.target.closest('[data-close-modal]')) {
        this.closeModal();
        return;
      }

      const form = event.target.closest('#adjust-target-form');
      if (!form) return;
      event.preventDefault();
      const nextTarget = clamp(Number(new FormData(form).get('target')) || item.target, 1, 9999);
      item.currentTarget = nextTarget;
      this.syncSessionItem(item);
      this.closeModal();
      if (this.mode === 'exercise' && item.exercise.isTimeBased) {
        this.startTimedSet();
      } else {
        this.render();
      }
    });
  }

  openSwapModal() {
    const item = this.currentItem();
    if (!item) return;
    const suggestions = this.ctx.getExercises.getSimilarExercises(item.exercise);

    if (!suggestions.length) {
      this.openModal(`
        <h2 class="mb-16" id="modal-title">${this.t('no_swaps_yet', 'No swaps yet')}</h2>
        <p class="text-sm text-muted mb-16">${this.t('no_swaps_message', 'We couldn\'t find a close match for this exercise right now.')}</p>
        <button type="button" class="btn btn-primary w-full" data-close-modal="true">${this.t('got_it', 'Got it')}</button>`, (event) => {
        if (event.target.closest('[data-close-modal]')) this.closeModal();
      });
      return;
    }

    this.openModal(`
      <h2 class="mb-16" id="modal-title">${this.t('swap_exercise_title', 'Swap exercise')}</h2>
      <p class="text-sm text-muted mb-16">${this.t('swap_exercise_subtitle', 'Choose a similar move for the same training block.')}</p>
      <div class="swap-options">
        ${suggestions.map((exercise) => `
          <button class="swap-option" data-exercise-id="${exercise.id}">
            <div class="swap-option__emoji ${exercise.animation || ''}">${exercise.emoji}</div>
            <div class="swap-option__content">
              <strong>${exercise.name}</strong>
              <p>${exercise.muscles.slice(0, 2).map((muscle) => muscle.replaceAll('_', ' ')).join(' • ')} • ${exercise.difficulty}</p>
            </div>
          </button>`).join('')}
      </div>
      <div class="mt-16">
        <button type="button" class="btn btn-secondary w-full" data-close-modal="true">${this.t('cancel', 'Cancel')}</button>
      </div>`, (event) => {
      if (event.target.closest('[data-close-modal]')) {
        this.closeModal();
        return;
      }

      const option = event.target.closest('[data-exercise-id]');
      if (!option) return;
      this.swapCurrentExercise(option.dataset.exerciseId);
      this.closeModal();
      this.render();
    });
  }

  swapCurrentExercise(exerciseId) {
    const item = this.currentItem();
    const nextExercise = this.ctx.getExercises.getById(exerciseId);
    if (!item || !nextExercise) return;

    item.exercise = nextExercise;
    item.exerciseId = nextExercise.id;
    this.syncSessionItem(item);

    if (this.mode === 'exercise' && nextExercise.isTimeBased) {
      this.startTimedSet();
      return;
    }
    this.render();
  }

  syncSessionItem(item) {
    const phaseItems = this.session?.[item.phaseKey];
    const phaseItem = phaseItems?.[item.phaseIndex];
    if (!phaseItem) return;

    phaseItem.exercise = item.exercise;
    phaseItem.exerciseId = item.exerciseId;
    phaseItem.target = item.target;
    phaseItem.currentTarget = item.currentTarget;
  }

  openModal(html, handler, options = {}) {
    openAccessibleModal(this, html, handler, options);
  }

  closeModal(options = {}) {
    closeAccessibleModal(this, options);
  }

  cleanupTimer() {
    clearInterval(this.timerId);
    this.timerId = null;
  }

  launchConfetti() {
    const colors = ['#22c55e', '#60a5fa', '#a78bfa', '#fbbf24', '#fb923c'];
    Array.from({ length: 28 }, (_, index) => {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      piece.style.opacity = '0.9';
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 3500);
    });
  }

  async saveCompletionNote(note = null) {
    const record = this.completionResult?.record;
    if (!record?.id || !this.ctx.workoutNotes) return;

    const input = this.el.querySelector('#session-note');
    const nextNote = String(note ?? input?.value ?? '').trim();
    if (nextNote === String(record.note || '')) return;

    record.note = await this.ctx.workoutNotes.save(record.id, nextNote);
    this.noteFeedback = record.note ? this.t('trainer_note_saved', 'Notes saved to workout history.') : this.t('trainer_note_cleared', 'Notes cleared from this session.');
  }

  async dismiss() {
    await this.saveCompletionNote();
    this.cleanupTimer();
    this.closeModal();
    this.ctx.speech.cancel();
    this.session = null;
    this.queue = [];
    this.mode = 'idle';
    this.el.classList.remove('active');
    this.el.innerHTML = '';
    document.body.style.overflow = '';
    this.ctx.router.navigate('dashboard');
  }

  async handleClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action || !this.session) return;

    if (action === 'exit-workout') {
      clearInterval(this.timerId);
      this.timerId = null;
      this.session = null;
      this.mode = 'idle';
      this.el.classList.remove('active');
      this.el.innerHTML = '';
      this.ctx.router.navigate('dashboard');
      return;
    }
    if (action === 'complete-set' && !this.paused) this.completeSet(false);
    if (action === 'adjust-target') this.openAdjustTargetModal();
    if (action === 'swap-exercise') this.openSwapModal();
    if (action === 'pause') {
      this.paused = !this.paused;
      this.render();
    }
    if (action === 'skip') {
      if (this.mode === 'rest') {
        this.startCurrentSequence(true);
      } else {
        this.completeSet(true);
      }
    }
    if (action === 'previous') {
      if (this.currentSet > 1) {
        this.currentSet -= 1;
      } else if (this.currentIndex > 0) {
        this.currentIndex -= 1;
        this.currentSet = this.currentItem()?.sets || 1;
      }
      this.startCurrentSequence(false);
    }
    if (action === 'save-note') {
      await this.saveCompletionNote();
      this.render();
    }
    if (action === 'close-complete') await this.dismiss();
  }
}
