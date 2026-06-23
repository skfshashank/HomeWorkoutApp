import { Events } from '../../app/eventBus.js';
import { getWeekDates, parseDateSafe } from '../../core/utils/dateUtils.js';

const formatClock = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const dayLabel = (dateStr) => parseDateSafe(dateStr).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);

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

  t(key, fallback = key) {
    return this.ctx.i18n?.t(key) || fallback;
  }

  translateValue(value) {
    return this.ctx.i18n?.translateValue?.(value) || String(value || '').replaceAll('_', ' ');
  }

  greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return this.t('greeting_morning', 'Good Morning');
    if (hour < 17) return this.t('greeting_afternoon', 'Good Afternoon');
    return this.t('greeting_evening', 'Good Evening');
  }

  async render() {
    const user = this.ctx.updateProfile.getUser();
    const [progress, achievementSnapshot, recentExercises] = await Promise.all([
      this.ctx.getProgress.execute(),
      this.ctx.getAchievements.getDashboardSnapshot(),
      this.ctx.getExercises.getRecentlyUsed(4)
    ]);

    const streak = progress.streak;
    const dailyLog = progress.dailyLog;
    const completedDates = new Set(progress.completedDates);
    const weekDates = getWeekDates();
    const todayProgress = dailyLog.workoutCompleted ? 100 : Math.min(100, Math.round(((dailyLog.minutes || 0) / Math.max(user.dailyMinutes, 1)) * 100));
    this.todaysPlan = this.ctx.manageWorkouts.generateDailyWorkout(user, new Date(), { streak });
    const quote = this.getDailyQuote();
    const water = dailyLog.waterGlasses || [];
    const nextAchievement = achievementSnapshot.nextAchievement;

    this.el.innerHTML = `
      <div class="dashboard-header mb-16">
        <div>
          <div class="page-title">${user.avatar} ${this.greeting()}, ${user.name || this.t('athlete', 'Athlete')} ✨</div>
          <p class="page-subtitle">${this.t('dashboard_subtitle', 'Your local-first coach for workouts, habits, recovery, and milestones.')}</p>
        </div>
        <div class="offline-badge" role="status" aria-label="${this.t('app_works_offline', 'App works offline')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><circle cx="12" cy="20" r="1"></circle>
          </svg>
          <span>${this.t('offline_ready', 'Offline Ready')}</span>
        </div>
      </div>
      <section class="card hero-card card--hero">
        <div class="flex flex-between gap-12"><div><div class="text-sm text-muted">${this.t('daily_completion', 'Daily completion')}</div><h2>${todayProgress}% ${this.t('done_label', 'done')}</h2><p class="text-sm text-muted">${this.t('target', 'Target')}: ${user.dailyMinutes} ${this.t('minutes', 'min')} • ${this.t('goal', 'Goal')}: ${this.translateValue(user.goal)}</p></div>${this.renderProgressRing(todayProgress)}</div>
        <div class="grid-3 mt-16"><div class="stat-card"><div class="stat-value">${dailyLog.calories || 0}</div><div class="stat-label">${this.t('calories', 'Calories')}</div></div><div class="stat-card"><div class="stat-value">${dailyLog.minutes || 0}</div><div class="stat-label">${this.t('minutes', 'Minutes')}</div></div><div class="stat-card"><div class="stat-value">${achievementSnapshot.stats.level}</div><div class="stat-label">${this.t('xp_level', 'XP Level')}</div></div></div>
      </section>
      <section class="stack-cards">
        <article class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('streak', 'Streak')}</h2><p class="text-sm text-muted">${this.t('streak_hint', 'Consistency compounds faster than intensity.')}</p></div><div class="streak-display"><div class="streak-fire">🔥</div><div><div class="streak-number">${streak}</div><div class="streak-label">${this.t('day_streak', 'day streak')}</div></div></div></div><div class="grid-7">${weekDates.map((dateStr) => `<div class="calendar-cell ${completedDates.has(dateStr) ? 'completed' : ''} ${dateStr === progress.dailyLog.date ? 'today' : ''}"><strong>${dayLabel(dateStr)}</strong><span class="day-label">${parseDateSafe(dateStr).getDate()}</span></div>`).join('')}</div></article>
        ${this.renderAchievementCard(achievementSnapshot, nextAchievement)}
      </section>
      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('today_workout', "Today's Workout")}</h2><p class="text-sm text-muted">${this.t('today_workout_subtitle', 'Generated from your goal, level, streak, and plan library.')}</p></div><span class="badge badge-${user.level}">${user.level}</span></div><div class="workout-card"><div class="flex flex-between gap-12"><div><strong>${this.translatePlanName(this.todaysPlan)}</strong><p class="text-sm text-muted">${this.todaysPlan.description}</p></div><div class="flex flex-col gap-8"><span class="chip">${this.todaysPlan.estimatedMinutes} ${this.t('minutes', 'min')}</span><span class="chip">${this.todaysPlan.estimatedCalories} ${this.t('calories', 'kcal')}</span></div></div><div class="flex flex-wrap gap-8">${this.todaysPlan.preview.map((item) => `<span class="chip">${item}</span>`).join('')}</div><div class="flex flex-wrap gap-12 mt-16"><button class="btn btn-primary" data-action="start-today">${this.todaysPlan.isRestDay ? this.t('start_recovery_flow', 'Start recovery flow') : this.t('start_workout', 'Start workout')}</button><button class="btn btn-secondary" data-action="browse-workouts">${this.t('browse_plans', 'Browse plans')}</button></div></div></section>
      <section class="grid-2">${this.renderWaterTracker(water)}${this.renderDeskTimer()}</section>
      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('quick_tools', 'Quick tools')}</h2><p class="text-sm text-muted">${this.t('quick_tools_subtitle', 'Open your library, habits, recovery, timers, and custom builder.')}</p></div></div><div class="quick-links-grid">${this.renderQuickLinks()}</div></section>
      <section class="card card--secondary"><h2>${this.t('recently_used', 'Recently Used')}</h2><div class="flex flex-wrap gap-8">${recentExercises.length ? recentExercises.map((exercise) => `<span class="chip">${exercise.emoji} ${exercise.name}</span>`).join('') : `<span class="text-sm text-muted">${this.t('recently_used_empty', 'Complete a workout to populate your recent exercise bank.')}</span>`}</div></section>
      ${this.renderQuote(quote)}`;
    this.syncDeskTimer();
  }

  renderAchievementCard(achievementSnapshot, nextAchievement) {
    if (this.ctx.features?.achievements === false) return '';
    const nextLabel = nextAchievement
      ? `${this.t('next', 'Next')}: ${this.translateAchievementText(nextAchievement, 'title')} (${nextAchievement.progress.percent}%)`
      : this.t('legendary_all_unlocked', 'Everything unlocked. Legendary.');
    return `<article class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('achievement_xp', 'Achievement XP')}</h2><p class="text-sm text-muted">${achievementSnapshot.unlockedCount} ${this.t('unlocked', 'unlocked')} • ${achievementSnapshot.stats.xp} ${this.t('xp_total', 'XP total')}</p></div><span class="chip">${this.t('level_short', 'Lvl')} ${achievementSnapshot.stats.level}</span></div><div class="progress-meter mb-8"><span style="width:${achievementSnapshot.stats.xp % 100}%"></span></div><p class="text-sm text-muted">${nextLabel}</p><button class="btn btn-secondary mt-16 w-full" data-action="open-achievements">${this.t('achievements', 'Achievements')}</button></article>`;
  }

  renderWaterTracker(water) {
    return `<article class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('water_tracker', 'Water Tracker')}</h2><p class="text-sm text-muted">${this.t('tap_each_glass', 'Tap each glass as you finish it.')}</p></div><span class="chip">${water.length}/8</span></div><div class="water-row">${Array.from({ length: 8 }, (_, index) => `<button class="water-glass ${water.includes(index) ? 'filled' : ''}" data-action="toggle-water" data-index="${index}" aria-label="${this.t('glass', 'Glass')} ${index + 1} ${this.t('of', 'of')} 8" aria-pressed="${water.includes(index) ? 'true' : 'false'}"></button>`).join('')}</div></article>`;
  }

  renderDeskTimer() {
    return `<article class="card card--secondary desk-timer-card"><div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('desk_mode', 'Desk Mode')}</h2><p class="text-sm text-muted">${this.t('desk_mode_subtitle', '50-minute movement reminders with office exercises.')}</p></div><label class="toggle"><input type="checkbox" data-action="toggle-desk" ${this.isDeskModeEnabled() ? 'checked' : ''}><span class="toggle-slider"></span></label></div><div class="desk-timer-display" id="desk-countdown">${this.getDeskCountdownLabel()}</div><p class="text-sm text-muted mt-8">${this.lastDeskPrompt || (this.isDeskModeEnabled() ? this.t('desk_mode_armed', 'Desk mode is armed.') : this.t('desk_mode_prompt', 'Enable to get notified before posture gets grumpy.'))}</p></article>`;
  }

  renderQuote(quote) {
    return `<section class="card card--secondary"><h2>${this.t('quote_of_day', 'Quote of the Day')}</h2><p class="text-sm" style="font-size:1rem;line-height:1.7;">“${quote}”</p></section>`;
  }

  renderQuickLinks() {
    const quickLinks = [
      ['exerciseLibrary', 'exercises', `📚 ${this.t('exercise_library_title', 'Exercise Library')}`],
      ['customWorkouts', 'custom-workouts', `🛠️ ${this.t('build_custom_workout', 'Build Custom Workout')}`],
      ['habits', 'habits', `💧 ${this.t('habit_tracker', 'Habit Tracker')}`],
      ['soreness', 'recovery', `🩹 ${this.t('soreness_map', 'Soreness Map')}`],
      ['timers', 'timers', `⏱️ ${this.t('interval_timers', 'Interval Timers')}`],
      ['progress', 'progress', `📈 ${this.t('progress_tools', 'Progress Tools')}`]
    ];
    return quickLinks
      .filter(([feature]) => this.ctx.features?.[feature] !== false)
      .map(([, page, label]) => `<button class="quick-link" data-action="open-page" data-target="${page}">${label}</button>`)
      .join('');
  }

  renderProgressRing(percent) {
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return `<div class="progress-ring" style="width:96px;height:96px;"><svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true"><circle class="ring-bg" cx="50" cy="50" r="38" stroke-width="8"></circle><circle class="ring-fill" cx="50" cy="50" r="38" stroke-width="8" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle></svg><div class="ring-center"><strong>${percent}%</strong></div></div>`;
  }

  getDailyQuote() {
    const quotes = this.ctx.quotesData?.quotes || [];
    if (!quotes.length) return this.t('quote_fallback', 'You showed up. That already matters.');
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = new Date() - start;
    const dayOfYear = Math.floor(diff / 86400000);
    return quotes[dayOfYear % quotes.length];
  }

  translateAchievementText(achievement, field = 'title') {
    const achievementId = achievement?.achievementId || achievement?.id;
    if (!achievementId) return achievement?.[field] || '';
    const key = `achievement_${achievementId}_${field === 'title' ? 'title' : 'desc'}`;
    return this.t(key, achievement?.[field] || '');
  }

  translatePlanName(plan) {
    if (!plan?.name) return '';
    const keyById = {
      'belly-fat-burner-beginner': 'plan_belly_fat_burner',
      'belly-fat-burner-intermediate': 'plan_belly_fat_burner',
      'belly-fat-burner-advanced': 'plan_belly_fat_burner',
      'morning-yoga-flow': 'plan_morning_yoga_flow',
      'hiit-fat-blast': 'plan_hiit_fat_blast',
      'office-break-stretch': 'plan_office_break_stretch',
      'core-crusher-beginner': 'plan_core_crusher',
      'core-crusher-intermediate': 'plan_core_crusher',
      'night-relaxation-yoga': 'plan_night_relaxation_yoga',
      'quick-burn-15': 'plan_quick_burn_15',
      'no-jump-cardio': 'plan_no_jump_cardio',
      'full-body-toning-beginner': 'plan_full_body_toning',
      'full-body-toning-intermediate': 'plan_full_body_toning',
      'pranayama-meditation': 'plan_pranayama_meditation',
      'lower-body-blast': 'plan_lower_body_blast',
      'upper-body-strength': 'plan_upper_body_strength',
      'desk-worker-relief': 'plan_desk_worker_relief',
      'weekend-warrior': 'plan_weekend_warrior'
    };
    const key = keyById[plan.id];
    return key ? this.t(key, plan.name) : plan.name;
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action } = button.dataset;
    if (action === 'start-today') this.ctx.startWorkout.execute(this.todaysPlan, this.ctx.updateProfile.getUser().level);
    if (action === 'browse-workouts') this.ctx.router.navigate('workouts');
    if (action === 'open-achievements') this.ctx.router.navigate('achievements');
    if (action === 'open-page') this.ctx.router.navigate(button.dataset.target);
    if (action === 'toggle-water') this.toggleWater(Number(button.dataset.index));
  }

  handleChange(event) {
    if (event.target.dataset.action === 'toggle-desk') this.setDeskMode(event.target.checked);
  }

  async toggleWater(index) {
    await this.ctx.trackHabit.toggleWater(index);
    this.render();
  }

  isDeskModeEnabled() {
    return this.ctx.trackHabit.isDeskModeEnabled();
  }

  setDeskMode(enabled) {
    this.lastDeskPrompt = enabled ? this.t('desk_mode_activated', 'Desk mode activated.') : this.t('desk_mode_paused', 'Desk mode paused.');
    if (enabled) {
      this.ctx.notifications.requestPermission().catch(() => false);
      this.ctx.trackHabit.setDeskMode(true);
    } else {
      this.ctx.trackHabit.setDeskMode(false);
      clearInterval(this.deskTimerId);
      clearTimeout(this.deskTimeoutId);
      this.deskTimerId = null;
      this.deskTimeoutId = null;
    }
    this.render();
  }

  getDeskCountdownLabel() {
    if (!this.isDeskModeEnabled()) return this.t('off', 'Off');
    const endsAt = this.ctx.trackHabit.getDeskModeEndsAt(Date.now() + (50 * 60 * 1000));
    return formatClock(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
  }

  syncDeskTimer() {
    clearInterval(this.deskTimerId);
    clearTimeout(this.deskTimeoutId);
    this.deskTimerId = null;
    this.deskTimeoutId = null;
    if (!this.isDeskModeEnabled()) return;
    let endsAt = this.ctx.trackHabit.getDeskModeEndsAt();
    if (!endsAt || endsAt <= Date.now()) {
      endsAt = this.ctx.trackHabit.renewDeskMode();
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
    const officeMoves = this.ctx.getExercises.getByCategory('office');
    const pool = officeMoves.length ? officeMoves : this.ctx.getExercises.getByCategory('stretch');
    const exercise = pool[Math.floor(Math.random() * pool.length)] || { name: 'Stand and stretch', emoji: '🧍' };
    this.ctx.notifications.deskBreak(exercise.name);
    this.ctx.bus.emit(Events.DESK_BREAK, { exercise });
    this.ctx.trackHabit.renewDeskMode();
  }
}
