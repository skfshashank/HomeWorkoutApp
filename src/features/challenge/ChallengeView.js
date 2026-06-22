import { Events } from '../../app/eventBus.js';

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export class ChallengeView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="challenge"]');
    this.selectedDay = null;
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on(Events.WORKOUT_COMPLETED, () => this.handleCompletion());
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
  }

  async render() {
    const challenge = this.ctx.challengeData;
    const viewModel = await this.ctx.getChallenge.getViewModel(challenge, this.selectedDay);
    this.selectedDay = viewModel.selectedDay;
    const selected = viewModel.selected;
    const user = this.ctx.updateProfile.getUser();

    this.el.innerHTML = `
      <div class="page-title">30-Day Challenge</div>
      <p class="page-subtitle">One calendar, thirty small wins, plus monthly themed XP challenges.</p>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>${challenge.name}</h2><p class="text-sm text-muted">${challenge.description}</p></div><span class="chip">${viewModel.progress}%</span></div>
        <div class="challenge-grid">${challenge.days.map((day) => {
          const classes = ['challenge-day', this.selectedDay === day.day ? 'current' : '', viewModel.completedDays.includes(day.day) ? 'done' : '', day.type === 'rest' ? 'rest' : '', day.day > viewModel.currentDay ? 'locked' : ''].filter(Boolean).join(' ');
          return `<button class="${classes}" data-action="select-day" data-day="${day.day}"><strong>${day.day}</strong><span>${day.type === 'rest' ? 'Rest' : 'Train'}</span></button>`;
        }).join('')}</div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Day ${selected.day}: ${selected.label}</h2><p class="text-sm text-muted">${selected.type === 'rest' ? 'Recovery focus' : `Intensity ${(selected.intensity || 0) * 100}%`}</p></div><span class="badge ${selected.type === 'rest' ? 'badge-yoga' : 'badge-intermediate'}">${selected.type}</span></div>
        <div class="mb-16">${selected.exercises.map((item) => {
          const exercise = this.ctx.getExercises.getById(item.exerciseId);
          return `<div class="history-item"><div class="history-info"><h4>${exercise?.emoji || '💪'} ${exercise?.name || item.exerciseId}</h4><p>${item.sets} set${item.sets > 1 ? 's' : ''} • ${exercise?.type === 'time' ? `${exercise.getTarget(user.level)} sec` : `${exercise?.getTarget(user.level)} reps`}</p></div></div>`;
        }).join('')}</div>
        <p class="text-sm mb-16">${selected.motivation}</p>
        ${selected.type === 'workout' ? `<button class="btn btn-primary" data-action="start-day" data-day="${selected.day}" ${selected.day > viewModel.currentDay ? 'disabled' : ''}>${selected.day === viewModel.currentDay ? 'Start today\'s challenge' : 'Start this day'}</button>` : '<button class="btn btn-secondary" disabled>Recovery day</button>'}
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Monthly Challenges</h2><p class="text-sm text-muted">Rewards: XP + achievement badges.</p></div><span class="chip">${currentMonthKey()}</span></div>
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
