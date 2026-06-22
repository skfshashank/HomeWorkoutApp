import { Events } from '../../app/eventBus.js';
import { getLocalMonthStr } from '../../core/utils/dateUtils.js';

export class ChallengeView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="challenge"]');
    this.selectedDay = null;
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on(Events.WORKOUT_COMPLETED, (data) => {
      if (data?.category === 'challenge') this.handleCompletion();
    });
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
  }

  t(key, fallback = key) {
    return this.ctx.i18n?.t(key) || fallback;
  }

  translateValue(value) {
    return this.ctx.i18n?.translateValue?.(value) || String(value || '').replaceAll('_', ' ');
  }

  async render() {
    const challenge = this.ctx.challengeData;
    const viewModel = await this.ctx.getChallenge.getViewModel(challenge, this.selectedDay);
    this.selectedDay = viewModel.selectedDay;
    const selected = viewModel.selected;
    const user = this.ctx.updateProfile.getUser();

    this.el.innerHTML = `
      <div class="page-title">${this.t('challenge_title', '30-Day Challenge')}</div>
      <p class="page-subtitle">${this.t('challenge_subtitle', 'One calendar, thirty small wins, plus monthly themed XP challenges.')}</p>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>${this.translateValue(challenge.name)}</h2><p class="text-sm text-muted">${challenge.description}</p></div><span class="chip">${viewModel.progress}%</span></div>
        <div class="challenge-grid">${challenge.days.map((day) => {
          const classes = ['challenge-day', this.selectedDay === day.day ? 'current' : '', viewModel.completedDays.includes(day.day) ? 'done' : '', day.type === 'rest' ? 'rest' : '', day.day > viewModel.currentDay ? 'locked' : ''].filter(Boolean).join(' ');
          return `<button class="${classes}" data-action="select-day" data-day="${day.day}"><strong>${day.day}</strong><span>${day.type === 'rest' ? this.t('rest_day', 'Rest') : this.t('train_day', 'Train')}</span></button>`;
        }).join('')}</div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('day', 'Day')} ${selected.day}: ${this.translateValue(selected.label)}</h2><p class="text-sm text-muted">${selected.type === 'rest' ? this.t('recovery_focus', 'Recovery focus') : `${this.t('intensity', 'Intensity')} ${(selected.intensity || 0) * 100}%`}</p></div><span class="badge ${selected.type === 'rest' ? 'badge-yoga' : 'badge-intermediate'}">${selected.type === 'rest' ? this.t('rest_day', 'Rest') : this.t('train_day', 'Train')}</span></div>
        <div class="mb-16">${selected.exercises.map((item) => {
          const exercise = this.ctx.getExercises.getById(item.exerciseId);
          return `<div class="history-item"><div class="history-info"><h4>${exercise?.emoji || '💪'} ${exercise?.name || item.exerciseId}</h4><p>${item.sets} ${this.t('sets', 'Sets').toLowerCase()}${item.sets > 1 ? '' : ''} • ${exercise?.type === 'time' ? `${exercise.getTarget(user.level)} ${this.t('seconds', 'sec')}` : `${exercise?.getTarget(user.level)} ${this.t('reps', 'Reps').toLowerCase()}`}</p></div></div>`;
        }).join('')}</div>
        <p class="text-sm mb-16">${selected.motivation}</p>
        ${selected.type === 'workout' ? `<button class="btn btn-primary" data-action="start-day" data-day="${selected.day}" ${selected.day > viewModel.currentDay ? 'disabled' : ''}>${selected.day === viewModel.currentDay ? this.t('start_todays_challenge', 'Start today\'s challenge') : this.t('start_this_day', 'Start this day')}</button>` : `<button class="btn btn-secondary" disabled>${this.t('recovery_day', 'Recovery day')}</button>`}
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('monthly_challenges', 'Monthly Challenges')}</h2><p class="text-sm text-muted">${this.t('rewards_xp_badges', 'Rewards: XP + achievement badges.')}</p></div><span class="chip">${getLocalMonthStr()}</span></div>
        ${viewModel.monthlyChallenges.map((item) => `<article class="monthly-challenge-card ${item.completed ? 'completed' : ''}"><div class="flex flex-between gap-12 mb-8"><div><h3>${item.icon} ${item.title}</h3><p class="text-sm text-muted">${item.desc}</p></div><span class="chip">${item.rewardXp} XP</span></div><div class="progress-meter mb-8"><span style="width:${item.progress}%"></span></div><p class="text-sm text-muted">${item.label}</p></article>`).join('')}
      </section>`;
  }

  async handleCompletion() {
    this.ctx.getChallenge.completeActiveDay();
    this.render();
  }

  async handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'select-day') {
      this.selectedDay = Number(button.dataset.day);
      this.render();
    }
    if (button.dataset.action === 'start-day') {
      const user = this.ctx.updateProfile.getUser();
      const plan = this.ctx.getChallenge.buildWorkoutPlan(this.ctx.challengeData, Number(button.dataset.day), user);
      if (plan) this.ctx.startWorkout.execute(plan, user.level);
    }
  }
}
