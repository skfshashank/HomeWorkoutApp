import { Events } from '../../app/eventBus.js';
import { daysBetween, today } from '../../core/utils/dateUtils.js';
import { getProfileRecords } from '../../core/storage/profileData.js';

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
    const currentDay = this.getCurrentDay();
    this.selectedDay = this.selectedDay ?? currentDay;
    const selected = challenge.days.find((day) => day.day === this.selectedDay) || challenge.days[0];
    const completed = this.getCompletedDays();
    const progress = Math.round((completed.length / challenge.days.length) * 100);
    const monthlyChallenges = await this.getMonthlyChallengeModels();

    this.el.innerHTML = `
      <div class="page-title">30-Day Challenge</div>
      <p class="page-subtitle">One calendar, thirty small wins, plus monthly themed XP challenges.</p>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>${challenge.name}</h2><p class="text-sm text-muted">${challenge.description}</p></div><span class="chip">${progress}%</span></div>
        <div class="challenge-grid">${challenge.days.map((day) => {
          const classes = ['challenge-day', this.selectedDay === day.day ? 'current' : '', completed.includes(day.day) ? 'done' : '', day.type === 'rest' ? 'rest' : '', day.day > currentDay ? 'locked' : ''].filter(Boolean).join(' ');
          return `<button class="${classes}" data-action="select-day" data-day="${day.day}"><strong>${day.day}</strong><span>${day.type === 'rest' ? 'Rest' : 'Train'}</span></button>`;
        }).join('')}</div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Day ${selected.day}: ${selected.label}</h2><p class="text-sm text-muted">${selected.type === 'rest' ? 'Recovery focus' : `Intensity ${(selected.intensity || 0) * 100}%`}</p></div><span class="badge ${selected.type === 'rest' ? 'badge-yoga' : 'badge-intermediate'}">${selected.type}</span></div>
        <div class="mb-16">${selected.exercises.map((item) => {
          const exercise = this.ctx.exerciseRepo.getById(item.exerciseId);
          return `<div class="history-item"><div class="history-info"><h4>${exercise?.emoji || '💪'} ${exercise?.name || item.exerciseId}</h4><p>${item.sets} set${item.sets > 1 ? 's' : ''} • ${exercise?.type === 'time' ? `${exercise.getTarget(this.ctx.getUser().level)} sec` : `${exercise?.getTarget(this.ctx.getUser().level)} reps`}</p></div></div>`;
        }).join('')}</div>
        <p class="text-sm mb-16">${selected.motivation}</p>
        ${selected.type === 'workout' ? `<button class="btn btn-primary" data-action="start-day" data-day="${selected.day}" ${selected.day > currentDay ? 'disabled' : ''}>${selected.day === currentDay ? 'Start today's challenge' : 'Start this day'}</button>` : '<button class="btn btn-secondary" disabled>Recovery day</button>'}
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Monthly Challenges</h2><p class="text-sm text-muted">Rewards: XP + achievement badges.</p></div><span class="chip">${currentMonthKey()}</span></div>
        ${monthlyChallenges.map((item) => `<article class="monthly-challenge-card ${item.completed ? 'completed' : ''}"><div class="flex flex-between gap-12 mb-8"><div><h3>${item.icon} ${item.title}</h3><p class="text-sm text-muted">${item.desc}</p></div><span class="chip">${item.rewardXp} XP</span></div><div class="progress-meter mb-8"><span style="width:${item.progress}%"></span></div><p class="text-sm text-muted">${item.label}</p></article>`).join('')}
      </section>`;
  }

  getCurrentDay() {
    const startKey = `challengeStartDate_${this.ctx.getActiveProfileId()}`;
    const start = this.ctx.prefs.get(startKey);
    if (!start) {
      this.ctx.prefs.set(startKey, today());
      return 1;
    }
    return Math.max(1, Math.min(30, daysBetween(start, today()) + 1));
  }

  getCompletedDays() {
    return this.ctx.prefs.get(`challengeCompletedDays_${this.ctx.getActiveProfileId()}`, []);
  }

  setCompletedDays(days) {
    this.ctx.prefs.set(`challengeCompletedDays_${this.ctx.getActiveProfileId()}`, days);
  }

  async getMonthlyChallengeModels() {
    const month = currentMonthKey();
    const sessions = (await getProfileRecords(this.ctx.db, 'sessions', this.ctx.getActiveProfileId())).filter((session) => String(session.date || session.completedAt).startsWith(month));
    const workoutDays = new Set(sessions.map((session) => session.date));
    const exerciseDetails = sessions.flatMap((session) => session.exerciseDetails || []);
    const yogaCatalog = this.ctx.exerciseRepo.getByTag('yoga');
    const yogaDone = new Set(exerciseDetails.filter((detail) => this.ctx.exerciseRepo.getById(detail.exerciseId)?.tags.includes('yoga')).map((detail) => detail.exerciseId));
    const plankDays = new Set(sessions.filter((session) => (session.exerciseIds || []).some((id) => id.includes('plank'))).map((session) => session.date));
    const squatTotal = exerciseDetails.filter((detail) => String(detail.exerciseId).includes('squat')).reduce((sum, detail) => sum + ((detail.target || 0) * (detail.sets || 1)), 0);
    const dayOfMonth = new Date().getDate();
    const missedDays = Math.max(0, dayOfMonth - workoutDays.size);

    const definitions = [
      { id: 'monthly-plank-month', title: 'Plank Month', desc: 'Hold plank every day and keep stacking time.', icon: '🧱', rewardXp: 120, progress: Math.min(100, Math.round((plankDays.size / Math.max(dayOfMonth, 1)) * 100)), label: `${plankDays.size}/${dayOfMonth} days with plank`, completed: dayOfMonth >= 28 && plankDays.size >= Math.max(dayOfMonth - 2, 1) },
      { id: 'monthly-1000-squats', title: '1000 Squats', desc: 'Accumulate 1000 squats in 30 days.', icon: '🦵', rewardXp: 150, progress: Math.min(100, Math.round((squatTotal / 1000) * 100)), label: `${squatTotal}/1000 squats`, completed: squatTotal >= 1000 },
      { id: 'monthly-yoga-journey', title: 'Yoga Journey', desc: 'Try every yoga pose in the catalog.', icon: '🧘', rewardXp: 140, progress: Math.min(100, Math.round((yogaDone.size / Math.max(yogaCatalog.length, 1)) * 100)), label: `${yogaDone.size}/${Math.max(yogaCatalog.length, 1)} poses completed`, completed: yogaCatalog.length > 0 && yogaDone.size >= yogaCatalog.length },
      { id: 'monthly-consistency-king', title: 'Consistency King', desc: 'Do not miss more than 2 days this month.', icon: '👑', rewardXp: 160, progress: Math.max(0, Math.min(100, Math.round(((Math.max(dayOfMonth - missedDays, 0)) / Math.max(dayOfMonth, 1)) * 100))), label: `${missedDays} miss${missedDays === 1 ? '' : 'es'} so far`, completed: dayOfMonth >= 28 && missedDays <= 2 }
    ];

    for (const definition of definitions.filter((item) => item.completed)) {
      const recordId = `${this.ctx.getActiveProfileId()}:${month}:${definition.id}`;
      const existing = await this.ctx.db.get('monthlyChallenges', recordId);
      if (!existing) {
        await this.ctx.db.put('monthlyChallenges', { id: recordId, profileId: this.ctx.getActiveProfileId(), month, challengeId: definition.id, completedAt: new Date().toISOString() });
        await this.ctx.achievementEngine.grantBadge(this.ctx.getActiveProfileId(), { id: definition.id, title: definition.title, desc: `Monthly challenge complete: ${definition.desc}`, icon: definition.icon, xp: definition.rewardXp, type: 'monthly' });
        this.ctx.bus.emit(Events.MONTHLY_CHALLENGE_COMPLETED, definition);
      }
    }

    return definitions;
  }

  async handleCompletion() {
    const activeDayKey = `activeChallengeDay_${this.ctx.getActiveProfileId()}`;
    const activeDay = this.ctx.prefs.get(activeDayKey);
    if (!activeDay) {
      this.render();
      return;
    }
    const completed = new Set(this.getCompletedDays());
    completed.add(activeDay);
    this.setCompletedDays([...completed].sort((a, b) => a - b));
    this.ctx.prefs.remove(activeDayKey);
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
      const dayNumber = Number(button.dataset.day);
      const day = this.ctx.challengeData.days.find((entry) => entry.day === dayNumber);
      if (!day || day.type !== 'workout') return;
      const user = this.ctx.getUser();
      this.ctx.prefs.set(`activeChallengeDay_${this.ctx.getActiveProfileId()}`, dayNumber);
      this.ctx.startWorkout.execute({ id: `challenge-day-${day.day}`, name: `${this.ctx.challengeData.name} • Day ${day.day}`, category: 'challenge', difficulty: user.level, duration: day.exercises.length * 3, warmUp: [], main: day.exercises, coolDown: [], restBetweenSets: 20, restBetweenExercises: 25 }, user.level);
    }
  }
}
