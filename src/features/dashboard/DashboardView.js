import { Events } from '../../app/eventBus.js';
import { getGreeting, getWeekDates } from '../../core/utils/dateUtils.js';
import { getScopedDailyRecord, todayKey } from '../../core/storage/profileData.js';

const formatClock = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
const dayLabel = (dateStr) => new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);

export class DashboardView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="dashboard"]');
    this.todaysPlan = null;
    this.deskTimerId = null;
    this.deskTimeoutId = null;
    this.lastDeskPrompt = '';

    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.el.addEventListener('change', (event) => this.handleChange(event));

    this.ctx.bus.on(Events.WORKOUT_COMPLETED, () => this.render());
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
    this.ctx.bus.on(Events.HABIT_SAVED, () => this.render());
    this.ctx.bus.on(Events.ACHIEVEMENT_UNLOCKED, () => this.render());
    this.ctx.bus.on(Events.DESK_BREAK, ({ exercise }) => {
      this.lastDeskPrompt = `Desk break: ${exercise.emoji || '🧍'} ${exercise.name}`;
      this.render();
    });
  }

  async render() {
    const user = this.ctx.getUser();
    const [streak, dailyLog, allLogs, achievementSnapshot, recentExercises] = await Promise.all([
      this.ctx.getProgress.getStreak(),
      this.getDailyLog(),
      this.ctx.db.getAll('dailyLogs'),
      this.ctx.achievementEngine.getDashboardSnapshot(this.ctx.getActiveProfileId()),
      this.ctx.exerciseRepo.getRecentlyUsed(4)
    ]);

    const completedDates = new Set((allLogs || []).filter((log) => log.profileId === this.ctx.getActiveProfileId() && log.workoutCompleted).map((log) => log.date));
    const weekDates = getWeekDates();
    const todayProgress = dailyLog.workoutCompleted ? 100 : Math.min(100, Math.round(((dailyLog.minutes || 0) / Math.max(user.dailyMinutes, 1)) * 100));
    this.todaysPlan = this.createTodayPlan(user, streak);
    const quote = this.getDailyQuote();
    const water = dailyLog.waterGlasses || [];
    const nextAchievement = achievementSnapshot.nextAchievement;

    this.el.innerHTML = `
      <div class="page-title">${user.avatar} ${getGreeting()}, ${user.name || 'Athlete'} ✨</div>
      <p class="page-subtitle">Your local-first coach for workouts, habits, recovery, and milestones.</p>
      <section class="card hero-card">
        <div class="flex flex-between gap-12"><div><div class="text-sm text-muted">Daily completion</div><h2>${todayProgress}% done</h2><p class="text-sm text-muted">Target: ${user.dailyMinutes} min • Goal: ${user.goal.replaceAll('_', ' ')}</p></div>${this.renderProgressRing(todayProgress)}</div>
        <div class="grid-3 mt-16"><div class="stat-card"><div class="stat-value">${dailyLog.calories || 0}</div><div class="stat-label">Calories</div></div><div class="stat-card"><div class="stat-value">${dailyLog.minutes || 0}</div><div class="stat-label">Minutes</div></div><div class="stat-card"><div class="stat-value">${achievementSnapshot.stats.level}</div><div class="stat-label">XP Level</div></div></div>
      </section>
      <section class="grid-2">
        <article class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Streak</h2><p class="text-sm text-muted">Consistency compounds faster than intensity.</p></div><div class="streak-display"><div class="streak-fire">🔥</div><div><div class="streak-number">${streak}</div><div class="streak-label">day streak</div></div></div></div><div class="grid-7">${weekDates.map((dateStr) => `<div class="calendar-cell ${completedDates.has(dateStr) ? 'completed' : ''} ${dateStr === todayKey() ? 'today' : ''}"><strong>${dayLabel(dateStr)}</strong><span class="day-label">${new Date(dateStr).getDate()}</span></div>`).join('')}</div></article>
        <article class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Achievement XP</h2><p class="text-sm text-muted">${achievementSnapshot.unlockedCount} unlocked • ${achievementSnapshot.stats.xp} XP total</p></div><span class="chip">Lvl ${achievementSnapshot.stats.level}</span></div><div class="progress-meter mb-8"><span style="width:${achievementSnapshot.stats.xp % 100}%"></span></div><p class="text-sm text-muted">${nextAchievement ? `Next: ${nextAchievement.title} (${nextAchievement.progress.percent}%)` : 'Everything unlocked. Legendary.'}</p><button class="btn btn-secondary mt-16 w-full" data-action="open-achievements">Open achievements</button></article>
      </section>
      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Today's Workout</h2><p class="text-sm text-muted">Generated from your goal, level, streak, and plan library.</p></div><span class="badge badge-${user.level}">${user.level}</span></div><div class="workout-card"><div class="flex flex-between gap-12"><div><strong>${this.todaysPlan.name}</strong><p class="text-sm text-muted">${this.todaysPlan.description}</p></div><div class="flex flex-col gap-8"><span class="chip">${this.todaysPlan.estimatedMinutes} min</span><span class="chip">${this.todaysPlan.estimatedCalories} kcal</span></div></div><div class="flex flex-wrap gap-8">${this.todaysPlan.preview.map((item) => `<span class="chip">${item}</span>`).join('')}</div><div class="flex gap-12 mt-16"><button class="btn btn-primary" data-action="start-today">${this.todaysPlan.isRestDay ? 'Start recovery flow' : 'Start workout'}</button><button class="btn btn-secondary" data-action="browse-workouts">Browse plans</button></div></div></section>
      <section class="grid-2"><article class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Water Tracker</h2><p class="text-sm text-muted">Tap each glass as you finish it.</p></div><span class="chip">${water.length}/8</span></div><div class="water-row">${Array.from({ length: 8 }, (_, index) => `<button class="water-glass ${water.includes(index) ? 'filled' : ''}" data-action="toggle-water" data-index="${index}" aria-label="Water glass ${index + 1}"></button>`).join('')}</div></article><article class="card desk-timer-card"><div class="flex flex-between gap-12 mb-16"><div><h2>Desk Mode</h2><p class="text-sm text-muted">50-minute movement reminders with office exercises.</p></div><label class="toggle"><input type="checkbox" data-action="toggle-desk" ${this.isDeskModeEnabled() ? 'checked' : ''}><span class="toggle-slider"></span></label></div><div class="desk-timer-display" id="desk-countdown">${this.getDeskCountdownLabel()}</div><p class="text-sm text-muted mt-8">${this.lastDeskPrompt || (this.isDeskModeEnabled() ? 'Desk mode is armed.' : 'Enable to get notified before posture gets grumpy.')}</p></article></section>
      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Quick tools</h2><p class="text-sm text-muted">Open your library, habits, recovery, timers, and custom builder.</p></div></div><div class="quick-links-grid"><button class="quick-link" data-action="open-page" data-page="exercises">📚 Exercise Library</button><button class="quick-link" data-action="open-page" data-page="custom-workouts">🛠️ Custom Workout</button><button class="quick-link" data-action="open-page" data-page="habits">💧 Habit Tracker</button><button class="quick-link" data-action="open-page" data-page="recovery">🩹 Soreness Map</button><button class="quick-link" data-action="open-page" data-page="timers">⏱️ Interval Timers</button><button class="quick-link" data-action="open-page" data-page="progress">📈 Progress Tools</button></div></section>
      <section class="card"><h2>Recently Used</h2><div class="flex flex-wrap gap-8">${recentExercises.length ? recentExercises.map((exercise) => `<span class="chip">${exercise.emoji} ${exercise.name}</span>`).join('') : '<span class="text-sm text-muted">Complete a workout to populate your recent exercise bank.</span>'}</div></section>
      <section class="card"><h2>Quote of the Day</h2><p class="text-sm" style="font-size:1rem;line-height:1.7;">“${quote}”</p></section>`;
    this.syncDeskTimer();
  }

  renderProgressRing(percent) {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return `<div class="progress-ring" style="width:96px;height:96px;"><svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true"><circle class="ring-bg" cx="50" cy="50" r="38" stroke-width="8"></circle><circle class="ring-fill" cx="50" cy="50" r="38" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle></svg><div class="ring-center"><strong>${percent}%</strong></div></div>`;
  }

  async getDailyLog() {
    return getScopedDailyRecord(this.ctx.db, 'dailyLogs', this.ctx.getActiveProfileId(), todayKey(), { waterGlasses: [] });
  }

  createTodayPlan(user, streak) {
    const plan = this.ctx.scheduler.generateDaily(user, new Date(), { streak });
    const preview = [...plan.warmUp, ...plan.main, ...plan.coolDown].slice(0, 5).map((item) => this.ctx.exerciseRepo.getById(item.exerciseId)?.name || item.exerciseId);
    return { ...plan, id: `daily-${todayKey()}`, name: plan.isRestDay ? 'Recovery Reset' : `${plan.category.replaceAll('_', ' ')} focus`, description: plan.isRestDay ? 'Gentle mobility, breathing, and stretching to keep your streak sustainable.' : `${plan.main.length} adaptive movements for your ${user.goal.replaceAll('_', ' ')} journey.`, preview };
  }

  getDailyQuote() {
    const quotes = this.ctx.quotesData?.quotes || [];
    if (!quotes.length) return 'You showed up. That already matters.';
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = new Date() - start;
    const dayOfYear = Math.floor(diff / 86400000);
    return quotes[dayOfYear % quotes.length];
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action } = button.dataset;
    if (action === 'start-today') this.ctx.startWorkout.execute(this.todaysPlan, this.ctx.getUser().level);
    if (action === 'browse-workouts') this.ctx.router.navigate('workouts');
    if (action === 'open-achievements') this.ctx.router.navigate('achievements');
    if (action === 'open-page') this.ctx.router.navigate(button.dataset.page);
    if (action === 'toggle-water') this.toggleWater(Number(button.dataset.index));
  }

  handleChange(event) {
    if (event.target.dataset.action === 'toggle-desk') this.setDeskMode(event.target.checked);
  }

  async toggleWater(index) {
    const profileId = this.ctx.getActiveProfileId();
    const log = await this.getDailyLog();
    const filled = new Set(log.waterGlasses || []);
    if (filled.has(index)) filled.delete(index); else filled.add(index);
    log.waterGlasses = [...filled].sort((a, b) => a - b);
    await this.ctx.db.put('dailyLogs', log);
    const habit = await getScopedDailyRecord(this.ctx.db, 'habits', profileId, todayKey(), { customHabits: [], water: 0 });
    const previousHabit = { ...habit };
    habit.water = log.waterGlasses.length;
    await this.ctx.achievementEngine.applyHabitProgress(profileId, habit, previousHabit);
    this.render();
  }

  isDeskModeEnabled() { return this.ctx.prefs.get('deskModeEnabled', false); }

  setDeskMode(enabled) {
    this.ctx.prefs.set('deskModeEnabled', enabled);
    this.lastDeskPrompt = enabled ? 'Desk mode activated.' : 'Desk mode paused.';
    if (enabled) {
      this.ctx.notifications.requestPermission().catch(() => false);
      this.ctx.prefs.set('deskModeEndsAt', Date.now() + (50 * 60 * 1000));
    } else {
      this.ctx.prefs.remove('deskModeEndsAt');
      clearInterval(this.deskTimerId);
      clearTimeout(this.deskTimeoutId);
      this.deskTimerId = null;
      this.deskTimeoutId = null;
    }
    this.render();
  }

  getDeskCountdownLabel() {
    if (!this.isDeskModeEnabled()) return 'Off';
    const endsAt = this.ctx.prefs.get('deskModeEndsAt', Date.now() + (50 * 60 * 1000));
    return formatClock(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
  }

  syncDeskTimer() {
    clearInterval(this.deskTimerId);
    clearTimeout(this.deskTimeoutId);
    this.deskTimerId = null;
    this.deskTimeoutId = null;
    if (!this.isDeskModeEnabled()) return;
    let endsAt = this.ctx.prefs.get('deskModeEndsAt');
    if (!endsAt || endsAt <= Date.now()) {
      endsAt = Date.now() + (50 * 60 * 1000);
      this.ctx.prefs.set('deskModeEndsAt', endsAt);
    }
    const tick = () => {
      const node = this.el.querySelector('#desk-countdown');
      if (!node) return;
      node.textContent = formatClock(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    };
    tick();
    this.deskTimerId = window.setInterval(tick, 1000);
    this.deskTimeoutId = window.setTimeout(() => this.fireDeskBreak(), Math.max(250, endsAt - Date.now()));
  }

  fireDeskBreak() {
    const officeMoves = this.ctx.exerciseRepo.getByCategory('office');
    const pool = officeMoves.length ? officeMoves : this.ctx.exerciseRepo.getByCategory('stretch');
    const exercise = pool[Math.floor(Math.random() * pool.length)] || { name: 'Stand and stretch', emoji: '🧍' };
    this.ctx.notifications.deskBreak(exercise.name);
    this.ctx.bus.emit(Events.DESK_BREAK, { exercise });
    this.ctx.prefs.set('deskModeEndsAt', Date.now() + (50 * 60 * 1000));
  }
}
