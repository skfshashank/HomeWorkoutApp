import { EventBus, Events } from './app/eventBus.js';
import { Router } from './app/router.js';
import { IndexedDbService } from './core/storage/indexedDb.js';
import { Preferences } from './core/storage/preferences.js';
import { SpeechService } from './core/speech/speechService.js';
import { NotificationService } from './core/notifications/notificationService.js';
import { BackupService } from './core/backup/backupService.js';
import { AudioEngine } from './core/utils/audioEngine.js';
import { Logger } from './core/logger/logger.js';
import { User } from './domain/entities/User.js';
import { ExerciseRepository } from './domain/repositories/ExerciseRepository.js';
import { WorkoutRepository } from './domain/repositories/WorkoutRepository.js';
import { RecoveryEngine } from './domain/services/RecoveryEngine.js';
import { SchedulerEngine } from './domain/services/SchedulerEngine.js';
import { ProgressionEngine } from './domain/services/ProgressionEngine.js';
import { GetExercises } from './application/exercises/GetExercises.js';
import { StartWorkout } from './application/workouts/StartWorkout.js';
import { CompleteWorkout } from './application/workouts/CompleteWorkout.js';
import { GetProgress } from './application/progress/GetProgress.js';
import { DashboardView } from './features/dashboard/DashboardView.js';
import { WorkoutsView } from './features/workoutPlayer/WorkoutsView.js';
import { TrainerView } from './features/workoutPlayer/TrainerView.js';
import { ChallengeView } from './features/challenge/ChallengeView.js';
import { ProgressView } from './features/progressTracker/ProgressView.js';
import { SettingsView } from './features/settings/SettingsView.js';
import { OnboardingView } from './features/dashboard/OnboardingView.js';

class App {
  constructor() {
    this.logger = new Logger('OpenFit');
    this.bus = new EventBus();
    this.router = new Router(this.bus);
    this.db = new IndexedDbService();
    this.prefs = new Preferences();
    this.speech = new SpeechService();
    this.notifications = new NotificationService();
    this.audio = new AudioEngine();
    this.views = {};
  }

  async init() {
    this.logger.info('Initializing OpenFit Local...');

    await this.db.init();
    this.audio.init();
    this.audio.setEnabled(this.prefs.get('soundEnabled', true));
    this.speech.setEnabled(this.prefs.get('voiceEnabled', true));

    const [exerciseData, planData, challengeData, quotesData] = await Promise.all([
      this.loadJSON('assets/plans/exercise_catalog_v1.json'),
      this.loadJSON('assets/plans/workout_plans_v1.json'),
      this.loadJSON('assets/plans/challenge_30day_v1.json'),
      this.loadJSON('assets/plans/quotes_v1.json')
    ]);

    this.exerciseRepo = new ExerciseRepository();
    this.exerciseRepo.load(exerciseData.exercises || []);

    this.workoutRepo = new WorkoutRepository();
    this.workoutRepo.load(planData.plans || []);

    this.recovery = new RecoveryEngine(this.db);
    this.scheduler = new SchedulerEngine(this.exerciseRepo, this.workoutRepo);
    this.progression = new ProgressionEngine(this.db, this.prefs);

    this.getExercises = new GetExercises(this.exerciseRepo);
    this.startWorkout = new StartWorkout(this.exerciseRepo, this.progression, this.bus);
    this.completeWorkout = new CompleteWorkout(this.db, this.bus, this.progression);
    this.getProgress = new GetProgress(this.db);
    this.backup = new BackupService(this.db, this.prefs);

    const userData = this.prefs.get('user');
    if (!userData) {
      this.showOnboarding(challengeData, quotesData);
    } else {
      this.initViews(new User(userData), challengeData, quotesData);
    }

    this.setupNav();
    this.router.navigate('dashboard');
    this.registerSW();
    this.logger.info('App initialized successfully');
  }

  showOnboarding(challengeData, quotesData) {
    const onboarding = new OnboardingView(this.prefs, this.bus);
    onboarding.render();
    const off = this.bus.on(Events.PROFILE_UPDATED, (user) => {
      off();
      document.getElementById('onboarding').classList.remove('active');
      this.initViews(new User(user), challengeData, quotesData);
      this.router.navigate('dashboard');
    });
  }

  initViews(user, challengeData, quotesData) {
    const ctx = {
      bus: this.bus,
      router: this.router,
      db: this.db,
      prefs: this.prefs,
      audio: this.audio,
      speech: this.speech,
      notifications: this.notifications,
      exerciseRepo: this.exerciseRepo,
      workoutRepo: this.workoutRepo,
      scheduler: this.scheduler,
      progression: this.progression,
      recovery: this.recovery,
      getExercises: this.getExercises,
      startWorkout: this.startWorkout,
      completeWorkout: this.completeWorkout,
      getProgress: this.getProgress,
      backup: this.backup,
      challengeData,
      quotesData,
      logger: this.logger,
      getUser: () => new User(this.prefs.get('user') || user)
    };

    this.views.dashboard = new DashboardView(ctx);
    this.views.workouts = new WorkoutsView(ctx);
    this.views.challenge = new ChallengeView(ctx);
    this.views.progress = new ProgressView(ctx);
    this.views.settings = new SettingsView(ctx);
    this.views.trainer = new TrainerView(ctx);

    Object.values(this.views).forEach((view) => view.render?.());
    this.renderSupportPages(ctx);

    this.bus.on(Events.PROFILE_UPDATED, () => this.renderSupportPages(ctx));
  }

  renderSupportPages(ctx) {
    const user = ctx.getUser();
    const exercises = ctx.exerciseRepo.getAll().slice(0, 8);
    const exercisesPage = document.querySelector('[data-page="exercises"]');
    if (exercisesPage) {
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
    if (habitsPage) {
      habitsPage.innerHTML = `
        <div class="page-title">Habit Signals</div>
        <p class="page-subtitle">Hydration, workouts, and recovery signals are tracked automatically.</p>
        <div class="card">
          <div class="grid-3">
            <div class="stat-card"><div class="stat-value">8</div><div class="stat-label">Water Goal</div></div>
            <div class="stat-card"><div class="stat-value">${user.dailyMinutes}</div><div class="stat-label">Daily Minutes</div></div>
            <div class="stat-card"><div class="stat-value">${user.level}</div><div class="stat-label">Current Level</div></div>
          </div>
        </div>`;
    }

    const recoveryPage = document.querySelector('[data-page="recovery"]');
    if (recoveryPage) {
      recoveryPage.innerHTML = `
        <div class="page-title">Recovery</div>
        <p class="page-subtitle">OpenFit adapts intensity using streaks, habits, and RPE feedback.</p>
        <div class="card">
          <h3>Adaptive engine ready</h3>
          <p class="text-sm text-muted">Finish workouts, rate effort, and the recovery engine will automatically guide lighter or harder days.</p>
        </div>`;
    }
  }

  setupNav() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => this.router.navigate(btn.dataset.nav));
    });
  }

  async loadJSON(path) {
    try {
      const res = await fetch(path);
      return await res.json();
    } catch (e) {
      this.logger.error(`Failed to load ${path}:`, e);
      return { exercises: [], plans: [], days: [], quotes: [] };
    }
  }

  registerSW() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
}

const app = new App();
app.init().catch((err) => console.error('Boot failed:', err));
