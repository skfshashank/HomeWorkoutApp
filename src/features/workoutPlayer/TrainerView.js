import { Events } from '../../app/eventBus.js';
import { formatDuration } from '../../core/utils/dateUtils.js';

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
    this.session = null;
    this.queue = [];
    this.currentIndex = 0;
    this.currentSet = 1;
    this.mode = 'idle';
    this.remaining = 0;
    this.paused = false;
    this.completedSets = 0;
    this.completionResult = null;

    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on(Events.WORKOUT_STARTED, (session) => this.start(session));
  }

  renderExerciseName(exercise) {
    return `<span class="exercise-name">${exercise.name}</span>${exercise.nameHindi ? `<span class="exercise-name-hindi">${exercise.nameHindi}</span>` : ''}`;
  }

  renderProgressLiveText(percent) {
    return `Workout progress ${percent} percent. Exercise ${this.currentIndex + 1} of ${this.queue.length}.`;
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
      ? 'Starting in'
      : isRepBased
        ? 'reps'
        : 'time remaining';

    this.el.classList.add('active');
    this.el.innerHTML = `
      <div class="fs-header">
        <div>
          <div class="text-sm text-muted">${this.session.workoutName}</div>
          <strong>${this.currentIndex + 1} / ${this.queue.length} exercises</strong>
        </div>
        <button class="btn btn-secondary btn-sm" data-action="skip">Skip</button>
      </div>
      <div class="progress-bar" role="progressbar" aria-label="Workout progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="fill" style="width:${percent}%"></div></div>
      <div class="sr-only" aria-live="polite" aria-atomic="true">${this.renderProgressLiveText(percent)}</div>
      <div class="fs-content">
        <div class="exercise-demo w-full mb-16">
          <div class="exercise-demo__avatar ${exercise.animation || ''}">${exercise.emoji}</div>
          <div class="exercise-demo__caption">
            <div class="exercise-name-stack">${this.renderExerciseName(exercise)}</div>
            <div class="text-sm text-muted">${item.phaseLabel}</div>
          </div>
        </div>

        <div class="text-center mb-16">
          <div class="text-sm text-muted">${exercise.description}</div>
          <div class="timer-display" aria-live="assertive" aria-atomic="true">${displayValue}</div>
          <div class="timer-label">${displayLabel}</div>
        </div>

        <div class="set-dots">
          ${Array.from({ length: item.sets }, (_, index) => `<span class="set-dot ${index + 1 < this.currentSet ? 'completed' : ''} ${index + 1 === this.currentSet ? 'current' : ''}"></span>`).join('')}
        </div>
        <div class="text-sm text-muted mb-16">Set ${this.currentSet} of ${item.sets}</div>

        <div class="card w-full mb-16">
          <div class="flex flex-between gap-12 mb-8">
            <strong>How to do it</strong>
            <button class="btn btn-secondary btn-sm" data-action="adjust-target">Adjust target</button>
          </div>
          <ul class="text-sm text-muted" style="padding-left:18px;list-style:disc;">
            ${(exercise.steps || []).slice(0, 3).map((step) => `<li>${step}</li>`).join('') || '<li>Focus on smooth, controlled movement.</li>'}
          </ul>
        </div>

        ${isRepBased && this.mode === 'exercise' ? '<button class="btn btn-primary btn-lg w-full mb-16" data-action="complete-set">Complete set</button>' : ''}

        <div class="grid-3 w-full">
          <button class="btn btn-secondary" data-action="previous">Previous</button>
          <button class="btn btn-accent" data-action="pause">${this.paused ? 'Resume' : 'Pause'}</button>
          <button class="btn btn-secondary" data-action="skip">Skip</button>
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
          <div class="text-sm text-muted">Recovery</div>
          ${next ? `<div class="exercise-name-stack">${this.renderExerciseName(next.exercise)}</div>` : '<strong>Almost done</strong>'}
        </div>
        <button class="btn btn-secondary btn-sm" data-action="skip">Skip rest</button>
      </div>
      <div class="progress-bar" role="progressbar" aria-label="Workout progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="fill" style="width:${percent}%"></div></div>
      <div class="sr-only" aria-live="polite" aria-atomic="true">${this.renderProgressLiveText(percent)}</div>
      <div class="fs-content">
        <div class="exercise-demo w-full mb-16">
          <div class="exercise-demo__avatar anim-breathing">😮‍💨</div>
          <div class="exercise-demo__caption">
            <strong>Rest</strong>
            <div class="text-sm text-muted">Breathe, reset, and get ready.</div>
          </div>
        </div>
        <div class="timer-display" aria-live="assertive" aria-atomic="true">${formatDuration(this.remaining)}</div>
        <div class="timer-label">seconds until restart</div>
        <div class="grid-3 w-full mt-24">
          <button class="btn btn-secondary" data-action="previous">Previous</button>
          <button class="btn btn-accent" data-action="pause">${this.paused ? 'Resume' : 'Pause'}</button>
          <button class="btn btn-secondary" data-action="skip">Skip</button>
        </div>
      </div>`;
  }

  renderCompletion() {
    const record = this.completionResult?.record;
    const progressCheck = this.completionResult?.progressCheck;

    this.el.classList.add('active');
    this.el.innerHTML = `
      <div class="fs-content" style="justify-content:center;">
        <div class="completion-trophy">🏆</div>
        <h2 class="text-center">Workout complete!</h2>
        <p class="text-sm text-muted text-center mb-24">Great work — your progress has been saved locally.</p>
        <div class="grid-3 w-full mb-24">
          <div class="stat-card"><div class="stat-value">${record?.calories || this.session.totalCalories}</div><div class="stat-label">Calories</div></div>
          <div class="stat-card"><div class="stat-value">${record?.duration || 0}</div><div class="stat-label">Minutes</div></div>
          <div class="stat-card"><div class="stat-value">${this.completedSets}</div><div class="stat-label">Sets</div></div>
        </div>
        ${progressCheck?.message ? `<div class="card mb-24"><p class="text-sm">${progressCheck.message}</p></div>` : ''}
        <button class="btn btn-primary btn-lg w-full" data-action="close-complete">Back to dashboard</button>
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
    this.session.totalCalories = 0;
    this.session.totalExercises = 0;
    document.body.style.overflow = 'hidden';
    this.startCurrentSequence(true);
  }

  buildQueue(session) {
    const mapPhase = (items, phaseLabel) => items.map((item) => ({ ...item, phaseLabel }));
    return [
      ...mapPhase(session.warmUp, 'Warm-up'),
      ...mapPhase(session.main, 'Main set'),
      ...mapPhase(session.coolDown, 'Cool-down')
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
        this.render();
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
    this.mode = 'exercise';
    this.remaining = item.currentTarget || item.target;
    this.render();

    this.timerId = window.setInterval(() => {
      if (this.paused) return;
      this.remaining -= 1;
      if (this.remaining > 0) {
        if (this.remaining <= 3) this.ctx.audio.countdown321();
        this.render();
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
        this.render();
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
    this.mode = 'complete';
    this.launchConfetti();
    this.render();
  }

  promptRPE() {
    return new Promise((resolve) => {
      this.openModal(`
        <div class="text-center mb-16">
          <h2 id="modal-title">How did that feel?</h2>
          <p class="text-sm text-muted">Your answer helps OpenFit adapt tomorrow's target.</p>
        </div>
        <div class="rpe-options">
          <button class="rpe-option" data-rpe="too_easy"><span class="rpe-emoji">😌</span><span class="rpe-label">Too Easy</span></button>
          <button class="rpe-option" data-rpe="just_right"><span class="rpe-emoji">😎</span><span class="rpe-label">Just Right</span></button>
          <button class="rpe-option" data-rpe="exhausting"><span class="rpe-emoji">🥵</span><span class="rpe-label">Exhausting</span></button>
        </div>`, (event) => {
        const option = event.target.closest('[data-rpe]');
        if (!option) return;
        const value = option.dataset.rpe;
        this.closeModal();
        resolve(value);
      }, false);
    });
  }

  openAdjustTargetModal() {
    const item = this.currentItem();
    if (!item) return;
    const label = item.exercise.isTimeBased ? 'seconds' : 'reps';

    this.openModal(`
      <h2 class="mb-16" id="modal-title">Adjust target</h2>
      <form id="adjust-target-form">
        <div class="form-group">
          <label class="form-label">Target (${label})</label>
          <input class="form-input" type="number" name="target" min="1" value="${item.currentTarget || item.target}" required>
        </div>
        <div class="grid-2 mt-24">
          <button type="button" class="btn btn-secondary" data-close-modal="true">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
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
      this.closeModal();
      if (this.mode === 'exercise' && item.exercise.isTimeBased) {
        this.startTimedSet();
      } else {
        this.render();
      }
    });
  }

  openModal(html, handler, closeOnBackdrop = true) {
    this.closeModal();
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.modalContent.innerHTML = html;
    this.modal.classList.add('active');
    this.modal.setAttribute('aria-hidden', 'false');
    this.modalCleanup = (event) => {
      if (closeOnBackdrop && event.target === this.modal) {
        this.closeModal();
        return;
      }
      handler(event);
    };
    this.modal.addEventListener('click', this.modalCleanup);
    this.modal.addEventListener('submit', this.modalCleanup);
    window.requestAnimationFrame(() => {
      const focusTarget = this.modal.querySelector('[autofocus], button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])');
      focusTarget?.focus();
    });
  }

  closeModal() {
    if (this.modalCleanup) {
      this.modal.removeEventListener('click', this.modalCleanup);
      this.modal.removeEventListener('submit', this.modalCleanup);
      this.modalCleanup = null;
    }
    this.modal.classList.remove('active');
    this.modal.setAttribute('aria-hidden', 'true');
    this.modalContent.innerHTML = '';
    const focusTarget = this.lastFocusedElement;
    this.lastFocusedElement = null;
    if (focusTarget?.focus) {
      window.requestAnimationFrame(() => focusTarget.focus());
    }
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

  dismiss() {
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

  handleClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action || !this.session) return;

    if (action === 'complete-set' && !this.paused) this.completeSet(false);
    if (action === 'adjust-target') this.openAdjustTargetModal();
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
    if (action === 'close-complete') this.dismiss();
  }
}
