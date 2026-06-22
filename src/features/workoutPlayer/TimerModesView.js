import { Events } from '../../app/eventBus.js';

export class TimerModesView {
  constructor() {
    this.ctx = null;
    this.el = null;
    this.mode = 'amrap';
    this.config = { amrapMinutes: 12, emomMinutes: 10, customWork: 30, customRest: 15, customRounds: 6 };
    this.timerId = null;
    this.state = { running: false, paused: false, phase: 'idle', remaining: 0, total: 0, round: 0, roundsCompleted: 0 };
  }

  init(container, deps) {
    this.el = container;
    this.ctx = deps;
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.el.addEventListener('input', (event) => this.handleInput(event));
  }

  t(key, fallback = key) {
    return this.ctx.i18n?.t(key) || fallback;
  }

  format(key, values, fallback) {
    return this.ctx.i18n?.format?.(key, values) || fallback;
  }

  render() {
    const urgency = this.state.total ? this.state.remaining / this.state.total : 1;
    const color = urgency > 0.5 ? 'var(--green)' : urgency > 0.2 ? 'var(--yellow)' : 'var(--red)';
    this.el.innerHTML = `
      <div class="page-title">${this.t('timer_modes_title', 'Timer Modes')}</div>
      <p class="page-subtitle">${this.t('timer_modes_subtitle', 'AMRAP, EMOM, Tabata, and custom intervals with voice announcements and color countdowns.')}</p>
      <section class="card"><div class="tabs">${['amrap', 'emom', 'tabata', 'custom'].map((mode) => `<button class="tab ${this.mode === mode ? 'active' : ''}" data-action="set-mode" data-mode="${mode}">${mode.toUpperCase()}</button>`).join('')}</div></section>
      <section class="card">${this.renderControls()}<div class="timer-mode-display" style="border-color:${color};color:${color};">${this.formatTime(this.state.remaining || this.defaultSeconds())}</div><p class="text-sm text-muted text-center mb-16">${this.state.phase === 'idle' ? this.t('ready_when_you_are', 'Ready when you are.') : `${this.t(this.state.phase, this.state.phase)} • ${this.t('round', 'round')} ${this.state.round || 1}`}</p><div class="flex gap-8 flex-wrap"><button class="btn btn-primary" data-action="start-timer">${this.state.running ? (this.state.paused ? this.t('resume', 'Resume') : this.t('restart', 'Restart')) : this.t('start', 'Start')}</button><button class="btn btn-secondary" data-action="pause-timer">${this.state.paused ? this.t('resume', 'Resume') : this.t('pause', 'Pause')}</button><button class="btn btn-danger" data-action="reset-timer">${this.t('reset', 'Reset')}</button>${this.mode === 'amrap' ? `<button class="btn btn-secondary" data-action="count-round">+ ${this.t('round', 'Round')}</button>` : ''}</div><p class="text-sm text-muted mt-16">${this.t('rounds_completed', 'Rounds completed')}: ${this.state.roundsCompleted}</p></section>`;
  }

  renderControls() {
    if (this.mode === 'amrap') return `<div class="form-group"><label class="form-label">${this.t('total_minutes', 'Total minutes')}</label><input class="form-input" type="number" data-config="amrapMinutes" value="${this.config.amrapMinutes}"></div>`;
    if (this.mode === 'emom') return `<div class="form-group"><label class="form-label">${this.t('total_minutes', 'Total minutes')}</label><input class="form-input" type="number" data-config="emomMinutes" value="${this.config.emomMinutes}"></div>`;
    if (this.mode === 'tabata') return `<p class="text-sm text-muted mb-16">${this.t('tabata_description', '20s work / 10s rest × 8 rounds.')}</p>`;
    return `<div class="grid-3"><div class="form-group"><label class="form-label">${this.t('work_seconds', 'Work (sec)')}</label><input class="form-input" type="number" data-config="customWork" value="${this.config.customWork}"></div><div class="form-group"><label class="form-label">${this.t('rest_seconds', 'Rest (sec)')}</label><input class="form-input" type="number" data-config="customRest" value="${this.config.customRest}"></div><div class="form-group"><label class="form-label">${this.t('rounds', 'Rounds')}</label><input class="form-input" type="number" data-config="customRounds" value="${this.config.customRounds}"></div></div>`;
  }

  defaultSeconds() {
    if (this.mode === 'amrap') return this.config.amrapMinutes * 60;
    if (this.mode === 'emom') return 60;
    if (this.mode === 'tabata') return 20;
    return this.config.customWork;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  announce(text) {
    this.ctx.speech.speak(text, { rate: 1.0, immediate: true })?.catch?.(() => null);
  }

  startTimer() {
    clearInterval(this.timerId);
    this.state.running = true;
    this.state.paused = false;
    this.state.roundsCompleted = this.mode === 'amrap' ? this.state.roundsCompleted : 0;
    if (this.mode === 'amrap') {
      this.state.phase = 'amrap';
      this.state.remaining = this.config.amrapMinutes * 60;
      this.state.total = this.state.remaining;
      this.announce(this.t('amrap_started', 'AMRAP started'));
      this.timerId = window.setInterval(() => this.tickAmrap(), 1000);
    } else if (this.mode === 'emom') {
      this.state.phase = 'work';
      this.state.round = 1;
      this.state.total = 60;
      this.state.remaining = 60;
      this.state.targetRounds = this.config.emomMinutes;
      this.announce(this.t('emom_started', 'EMOM started'));
      this.timerId = window.setInterval(() => this.tickEmom(), 1000);
    } else if (this.mode === 'tabata') {
      this.state.phase = 'work';
      this.state.round = 1;
      this.state.targetRounds = 8;
      this.state.total = 20;
      this.state.remaining = 20;
      this.announce(this.t('tabata_started', 'Tabata started'));
      this.timerId = window.setInterval(() => this.tickIntervals(20, 10, 8), 1000);
    } else {
      this.state.phase = 'work';
      this.state.round = 1;
      this.state.targetRounds = this.config.customRounds;
      this.state.total = this.config.customWork;
      this.state.remaining = this.config.customWork;
      this.announce(this.t('custom_intervals_started', 'Custom intervals started'));
      this.timerId = window.setInterval(() => this.tickIntervals(this.config.customWork, this.config.customRest, this.config.customRounds), 1000);
    }
    this.render();
  }

  tickAmrap() {
    if (this.state.paused) return;
    this.state.remaining -= 1;
    if (this.state.remaining <= 0) return this.completeTimer();
    this.render();
  }

  tickEmom() {
    if (this.state.paused) return;
    this.state.remaining -= 1;
    if (this.state.remaining <= 0) {
      this.state.roundsCompleted += 1;
      if (this.state.round >= this.state.targetRounds) return this.completeTimer();
      this.state.round += 1;
      this.state.remaining = 60;
      this.state.total = 60;
      this.announce(this.format('minute_announcement', { round: this.state.round }, `Minute ${this.state.round}`));
    }
    this.render();
  }

  tickIntervals(work, rest, rounds) {
    if (this.state.paused) return;
    this.state.remaining -= 1;
    if (this.state.remaining > 0) {
      if (this.state.remaining <= 3) this.announce(String(this.state.remaining));
      this.render();
      return;
    }
    if (this.state.phase === 'work') {
      this.state.phase = 'rest';
      this.state.remaining = rest;
      this.state.total = rest;
      this.announce(this.t('rest', 'Rest'));
    } else {
      this.state.roundsCompleted += 1;
      if (this.state.round >= rounds) return this.completeTimer();
      this.state.round += 1;
      this.state.phase = 'work';
      this.state.remaining = work;
      this.state.total = work;
      this.announce(this.format('round_announcement', { round: this.state.round }, `Round ${this.state.round}`));
    }
    this.render();
  }

  completeTimer() {
    clearInterval(this.timerId);
    this.state.running = false;
    this.state.paused = false;
    this.state.phase = 'complete';
    this.state.remaining = 0;
    this.announce(this.t('timer_complete', 'Timer complete'));
    this.ctx.bus.emit(Events.TIMER_COMPLETE, { mode: this.mode, roundsCompleted: this.state.roundsCompleted });
    this.render();
  }

  handleInput(event) {
    const key = event.target.dataset.config;
    if (!key) return;
    this.config[key] = Number(event.target.value || 0);
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'set-mode') {
      this.mode = button.dataset.mode;
      this.reset();
    }
    if (button.dataset.action === 'start-timer') this.startTimer();
    if (button.dataset.action === 'pause-timer') {
      this.state.paused = !this.state.paused;
      this.render();
    }
    if (button.dataset.action === 'reset-timer') this.reset();
    if (button.dataset.action === 'count-round' && this.mode === 'amrap') {
      this.state.roundsCompleted += 1;
      this.render();
    }
  }

  reset() {
    clearInterval(this.timerId);
    this.timerId = null;
    this.state = { running: false, paused: false, phase: 'idle', remaining: 0, total: 0, round: 0, roundsCompleted: 0 };
    this.render();
  }
}
