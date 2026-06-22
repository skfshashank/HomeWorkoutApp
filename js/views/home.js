const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export class HomeView {
  constructor(bus, profile, progress, generator, quotes, desk, container) {
    this.bus = bus;
    this.profile = profile;
    this.progress = progress;
    this.generator = generator;
    this.quotes = quotes;
    this.desk = desk;
    this.container = container;
    this.notice = '';
    this.container.addEventListener('click', (event) => this.handleClick(event));
    this.bus.on('desk:break', ({ exercise }) => {
      this.notice = `Desk break suggestion: ${exercise.name} • ${exercise.type === 'time' ? `${exercise.levels.beginner}s` : `${exercise.levels.beginner} reps`}`;
      this.render();
    });
  }

  progressRing(percent) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return `
      <div class="progress-ring">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.08)" stroke-width="8" fill="none"></circle>
          <circle cx="50" cy="50" r="42" stroke="url(#homeRing)" stroke-width="8" stroke-linecap="round" fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
          <defs>
            <linearGradient id="homeRing" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#22c55e"></stop>
              <stop offset="50%" stop-color="#60a5fa"></stop>
              <stop offset="100%" stop-color="#a855f7"></stop>
            </linearGradient>
          </defs>
        </svg>
        <div class="progress-ring__label"><div><strong>${percent}%</strong><div class="tiny muted">weekly</div></div></div>
      </div>`;
  }

  waterGlasses(goal, filled) {
    return Array.from({ length: goal }, (_, index) => {
      const active = filled.includes(index);
      return `
        <button class="water-glass ${active ? 'is-filled' : ''}" type="button" data-action="toggle-water" data-index="${index}" aria-label="Water glass ${index + 1}">
          <span class="water-glass__fill" style="height:${active ? '100%' : '18%'}"></span>
        </button>`;
    }).join('');
  }

  renderRoutineList(items) {
    return items.map((exercise) => `
      <li class="history-item">
        <div class="inline-between">
          <div>
            <strong>${exercise.emoji} ${exercise.name}</strong>
            <p class="tiny muted">${exercise.nameHindi}</p>
          </div>
          <span class="tag">${exercise.targetLabel || (exercise.type === 'time' ? `${exercise.levels.beginner}s` : `${exercise.levels.beginner} reps`)}</span>
        </div>
      </li>`).join('');
  }

  render() {
    const profile = this.profile.get();
    const todayStats = this.progress.getTodayStats();
    const consistency = this.progress.getWeeklyConsistency();
    const streak = this.progress.getStreak();
    const routine = this.generator.generateDaily(profile);
    const quote = this.quotes[new Date().getDate() % this.quotes.length];
    const hydration = this.progress.getDailyHydration();
    this.container.innerHTML = `
      <section class="card stack">
        <div class="inline-between">
          <div>
            <p class="eyebrow">${greeting()}</p>
            <h2>${profile.name}</h2>
            <p class="muted">Focus: ${profile.goal.replaceAll('_', ' ')} • ${profile.sessionMinutes} min plan</p>
          </div>
          ${this.progressRing(consistency)}
        </div>
        <div class="grid-3">
          <article class="stat-item"><span class="tiny muted">Today</span><strong>${todayStats.workouts}</strong><span class="tiny muted">sessions</span></article>
          <article class="stat-item"><span class="tiny muted">Calories</span><strong>${todayStats.calories}</strong><span class="tiny muted">burned</span></article>
          <article class="stat-item"><span class="tiny muted">Streak</span><strong>${streak}</strong><span class="tiny muted">days</span></article>
        </div>
      </section>

      <section class="card stack">
        <div class="section-header">
          <div>
            <h3>Today's adaptive workout</h3>
            <p class="tiny muted">Date-seeded variety with RPE adjustments.</p>
          </div>
          <span class="badge badge-${profile.level}">${profile.level}</span>
        </div>
        ${routine.isRestDay ? `<div class="note">${routine.message}</div>` : ''}
        <div class="workout-card">
          <div class="workout-card__top">
            <div>
              <h4>${routine.name}</h4>
              <p class="small muted">${routine.duration} min • ${routine.main.length} main movements</p>
            </div>
            <div class="workout-card__meta">
              <span class="chip">Warm-up ${routine.warmUp.length}</span>
              <span class="chip">Main ${routine.main.length}</span>
              <span class="chip">Cool-down ${routine.coolDown.length}</span>
            </div>
          </div>
          <div class="grid-2">
            <div>
              <h4>Warm-up</h4>
              <ul class="list-clean">${this.renderRoutineList(routine.warmUp)}</ul>
            </div>
            <div>
              <h4>Main set</h4>
              <ul class="list-clean">${this.renderRoutineList(routine.main)}</ul>
            </div>
          </div>
          <div>
            <h4>Cool-down</h4>
            <ul class="list-clean">${this.renderRoutineList(routine.coolDown)}</ul>
          </div>
          <div class="inline-actions">
            <button class="btn btn-primary" type="button" data-action="start-daily">Start today's session</button>
            <button class="btn btn-ghost" type="button" data-action="browse-workouts">Browse plans</button>
          </div>
        </div>
      </section>

      <section class="grid-2">
        <article class="card stack">
          <div class="section-header">
            <div>
              <h3>Hydration</h3>
              <p class="tiny muted">Tap to log water.</p>
            </div>
            <span class="chip">${hydration.length}/${profile.dailyWaterGoal}</span>
          </div>
          <div class="water-row">${this.waterGlasses(profile.dailyWaterGoal, hydration)}</div>
        </article>
        <article class="card stack">
          <div class="section-header">
            <div>
              <h3>Desk mode</h3>
              <p class="tiny muted">50-minute anti-sit reminder.</p>
            </div>
            <label class="toggle">
              <input type="checkbox" data-action="toggle-desk" ${profile.deskMode ? 'checked' : ''}>
              <span class="toggle__track"></span>
              <span class="toggle__thumb"></span>
            </label>
          </div>
          <p class="small muted">${profile.deskMode ? 'Desk breaks are armed.' : 'Enable reminders to keep hips and posture fresh.'}</p>
          ${this.notice ? `<div class="note">${this.notice}</div>` : ''}
        </article>
      </section>

      <section class="card stack">
        <h3>Mindset</h3>
        <p class="quote">“${quote}”</p>
      </section>`;
  }

  handleClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'start-daily') {
      this.bus.emit('workout:start', { source: 'home', routine: this.generator.generateDaily(this.profile.get()) });
    }
    if (action === 'browse-workouts') {
      this.bus.emit('page:navigate', { page: 'workouts' });
    }
    if (action === 'toggle-water') {
      this.bus.emit('hydration:toggle', { index: Number(event.target.closest('[data-index]').dataset.index) });
    }
  }
}
