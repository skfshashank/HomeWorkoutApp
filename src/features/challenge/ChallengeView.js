import { Events } from '../../app/eventBus.js';
import { daysBetween, today } from '../../core/utils/dateUtils.js';

export class ChallengeView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="challenge"]');
    this.selectedDay = null;
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on(Events.WORKOUT_COMPLETED, () => this.handleCompletion());
  }

  render() {
    const challenge = this.ctx.challengeData;
    const currentDay = this.getCurrentDay();
    this.selectedDay = this.selectedDay ?? currentDay;
    const selected = challenge.days.find((day) => day.day === this.selectedDay) || challenge.days[0];
    const completed = this.getCompletedDays();
    const progress = Math.round((completed.length / challenge.days.length) * 100);

    this.el.innerHTML = `
      <div class="page-title">30-Day Challenge</div>
      <p class="page-subtitle">One calendar, thirty small wins, and built-in recovery days.</p>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>${challenge.name}</h2>
            <p class="text-sm text-muted">${challenge.description}</p>
          </div>
          <span class="chip">${progress}%</span>
        </div>
        <div class="challenge-grid">
          ${challenge.days.map((day) => {
            const classes = [
              'challenge-day',
              this.selectedDay === day.day ? 'current' : '',
              completed.includes(day.day) ? 'done' : '',
              day.type === 'rest' ? 'rest' : '',
              day.day > currentDay ? 'locked' : ''
            ].filter(Boolean).join(' ');
            return `
              <button class="${classes}" data-action="select-day" data-day="${day.day}">
                <strong>${day.day}</strong>
                <span>${day.type === 'rest' ? 'Rest' : 'Train'}</span>
              </button>`;
          }).join('')}
        </div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>Day ${selected.day}: ${selected.label}</h2>
            <p class="text-sm text-muted">${selected.type === 'rest' ? 'Recovery focus' : `Intensity ${(selected.intensity || 0) * 100}%`}</p>
          </div>
          <span class="badge ${selected.type === 'rest' ? 'badge-yoga' : 'badge-intermediate'}">${selected.type}</span>
        </div>
        <div class="mb-16">
          ${selected.exercises.map((item) => {
            const exercise = this.ctx.exerciseRepo.getById(item.exerciseId);
            return `
              <div class="history-item">
                <div class="history-info">
                  <h4>${exercise?.emoji || '💪'} ${exercise?.name || item.exerciseId}</h4>
                  <p>${item.sets} set${item.sets > 1 ? 's' : ''} • ${exercise?.type === 'time' ? `${exercise.getTarget(this.ctx.getUser().level)} sec` : `${exercise?.getTarget(this.ctx.getUser().level)} reps`}</p>
                </div>
              </div>`;
          }).join('')}
        </div>
        <p class="text-sm mb-16">${selected.motivation}</p>
        ${selected.type === 'workout' ? `<button class="btn btn-primary" data-action="start-day" data-day="${selected.day}" ${selected.day > currentDay ? 'disabled' : ''}>${selected.day === currentDay ? 'Start today\'s challenge' : 'Start this day'}</button>` : '<button class="btn btn-secondary" disabled>Recovery day</button>'}
      </section>`;
  }

  getCurrentDay() {
    const start = this.ctx.prefs.get('challengeStartDate');
    if (!start) {
      this.ctx.prefs.set('challengeStartDate', today());
      return 1;
    }
    return Math.max(1, Math.min(30, daysBetween(start, today()) + 1));
  }

  getCompletedDays() {
    return this.ctx.prefs.get('challengeCompletedDays', []);
  }

  handleCompletion() {
    const activeDay = this.ctx.prefs.get('activeChallengeDay');
    if (!activeDay) {
      this.render();
      return;
    }

    const completed = new Set(this.getCompletedDays());
    completed.add(activeDay);
    this.ctx.prefs.set('challengeCompletedDays', [...completed].sort((a, b) => a - b));
    this.ctx.prefs.remove('activeChallengeDay');
    this.render();
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    if (button.dataset.action === 'select-day') {
      this.selectedDay = Number(button.dataset.day);
      this.render();
    }

    if (button.dataset.action === 'start-day') {
      const dayNumber = Number(button.dataset.day);
      const day = this.ctx.challengeData.days.find((entry) => entry.day === dayNumber);
      if (!day || day.type !== 'workout') return;
      const user = this.ctx.getUser();
      this.ctx.prefs.set('activeChallengeDay', dayNumber);
      this.ctx.startWorkout.execute({
        id: `challenge-day-${day.day}`,
        name: `${this.ctx.challengeData.name} • Day ${day.day}`,
        category: 'challenge',
        difficulty: user.level,
        duration: day.exercises.length * 3,
        warmUp: [],
        main: day.exercises,
        coolDown: [],
        restBetweenSets: 20,
        restBetweenExercises: 25
      }, user.level);
    }
  }
}
