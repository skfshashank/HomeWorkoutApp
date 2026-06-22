import { Events } from './eventBus.js';

const FEATURE_PAGE_MAP = {
  challenge: 'challenge',
  progress: 'progress',
  settings: 'settings',
  exerciseLibrary: 'exercises',
  habitSignals: 'habits',
  recoveryInsights: 'recovery'
};

export class AppBootstrap {
  #bus;
  #router;
  #prefs;
  #logger;
  #exerciseRepo;
  #trackHabit;
  #getRecovery;
  #getUser;

  constructor({ bus, router, prefs, logger, exerciseRepo, trackHabit, getRecovery, getUser }) {
    this.#bus = bus;
    this.#router = router;
    this.#prefs = prefs;
    this.#logger = logger;
    this.#exerciseRepo = exerciseRepo;
    this.#trackHabit = trackHabit;
    this.#getRecovery = getRecovery;
    this.#getUser = getUser;
  }

  async init() {
    this.applyFeatureFlags();
    this.bindNavigation();
    this.bindEvents();
    await this.refreshSupportPages();
    this.registerServiceWorker();
  }

  getInitialPage() {
    if (this.isFeatureEnabled('challenge') || this.isFeatureEnabled('progress') || this.isFeatureEnabled('settings')) {
      return 'dashboard';
    }
    return 'dashboard';
  }

  isFeatureEnabled(feature) {
    const flags = this.#prefs.get('featureFlags', {});
    return flags[feature] !== false;
  }

  applyFeatureFlags() {
    Object.entries(FEATURE_PAGE_MAP).forEach(([feature, page]) => {
      const enabled = this.isFeatureEnabled(feature);
      const pageNode = document.querySelector(`[data-page="${page}"]`);
      if (pageNode) pageNode.hidden = !enabled;
      const navNode = document.querySelector(`[data-nav="${page}"]`);
      if (navNode) navNode.hidden = !enabled;
    });
  }

  bindNavigation() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.hidden) return;
        this.#router.navigate(btn.dataset.nav);
      });
    });
  }

  bindEvents() {
    const refresh = () => this.refreshSupportPages().catch((error) => this.#logger.error('Support page refresh failed', error));
    this.#bus.on(Events.PROFILE_UPDATED, refresh);
    this.#bus.on(Events.WORKOUT_COMPLETED, refresh);
    this.#bus.on(Events.HABIT_COMPLETED, refresh);
  }

  async refreshSupportPages() {
    const [habitSummary, recovery] = await Promise.all([
      this.#trackHabit.getHabitSummary(),
      this.#getRecovery.execute()
    ]);
    const user = this.#getUser();
    const exercises = this.#exerciseRepo.getAll().slice(0, 8);

    const exercisesPage = document.querySelector('[data-page="exercises"]');
    if (exercisesPage && !exercisesPage.hidden) {
      exercisesPage.innerHTML = `
        <div class="page-title">Exercise Library</div>
        <p class="page-subtitle">Quick catalog preview powered by the loaded exercise JSON.</p>
        <div class="grid-2">
          ${exercises.map((exercise) => `
            <article class="card">
              <div class="flex flex-between gap-8 mb-8">
                <strong>${exercise.emoji} ${exercise.name}</strong>
                <span class="badge badge-${exercise.difficulty}">${exercise.difficulty}</span>
              </div>
              <p class="text-sm text-muted">${exercise.description}</p>
            </article>`).join('')}
        </div>`;
    }

    const habitsPage = document.querySelector('[data-page="habits"]');
    if (habitsPage && !habitsPage.hidden) {
      habitsPage.innerHTML = `
        <div class="page-title">Habit Signals</div>
        <p class="page-subtitle">Hydration, workouts, and recovery signals are tracked automatically.</p>
        <div class="card">
          <div class="grid-3">
            <div class="stat-card"><div class="stat-value">${habitSummary.waterCount}/8</div><div class="stat-label">Water Goal</div></div>
            <div class="stat-card"><div class="stat-value">${habitSummary.sleep ?? '—'}</div><div class="stat-label">Sleep (hrs)</div></div>
            <div class="stat-card"><div class="stat-value">${habitSummary.steps ?? 0}</div><div class="stat-label">Steps</div></div>
          </div>
          <div class="grid-3 mt-16">
            <div class="stat-card"><div class="stat-value">${user.dailyMinutes}</div><div class="stat-label">Daily Minutes</div></div>
            <div class="stat-card"><div class="stat-value">${user.level}</div><div class="stat-label">Current Level</div></div>
            <div class="stat-card"><div class="stat-value">${habitSummary.energy}</div><div class="stat-label">Energy</div></div>
          </div>
        </div>`;
    }

    const recoveryPage = document.querySelector('[data-page="recovery"]');
    if (recoveryPage && !recoveryPage.hidden) {
      recoveryPage.innerHTML = `
        <div class="page-title">Recovery</div>
        <p class="page-subtitle">OpenFit adapts intensity using streaks, habits, and RPE feedback.</p>
        <div class="card">
          <div class="grid-3">
            <div class="stat-card"><div class="stat-value">${recovery.score}</div><div class="stat-label">Recovery Score</div></div>
            <div class="stat-card"><div class="stat-value">${recovery.consecutiveDays}</div><div class="stat-label">Active Days</div></div>
            <div class="stat-card"><div class="stat-value">${recovery.recommendation.label}</div><div class="stat-label">Recommendation</div></div>
          </div>
          <p class="text-sm text-muted mt-16">Avoid overloading: ${recovery.musclesToAvoid.length ? recovery.musclesToAvoid.join(', ') : 'No major restrictions today.'}</p>
        </div>`;
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        this.#logger.error('Service worker registration failed', error);
      });
    }
  }
}
