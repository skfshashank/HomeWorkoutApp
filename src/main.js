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
import { AchievementEngine } from './domain/services/AchievementEngine.js';
import { GetExercises } from './application/exercises/GetExercises.js';
import { StartWorkout } from './application/workouts/StartWorkout.js';
import { CompleteWorkout } from './application/workouts/CompleteWorkout.js';
import { GetProgress } from './application/progress/GetProgress.js';
import { DashboardView } from './features/dashboard/DashboardView.js';
import { WorkoutsView } from './features/workoutPlayer/WorkoutsView.js';
import { TrainerView } from './features/workoutPlayer/TrainerView.js';
import { CustomWorkoutView } from './features/workoutPlayer/CustomWorkoutView.js';
import { TimerModesView } from './features/workoutPlayer/TimerModesView.js';
import { ChallengeView } from './features/challenge/ChallengeView.js';
import { ProgressView } from './features/progressTracker/ProgressView.js';
import { SettingsView } from './features/settings/SettingsView.js';
import { ProfileManager } from './features/settings/ProfileManager.js';
import { AchievementView } from './features/achievements/AchievementView.js';
import { ExerciseLibraryView } from './features/exerciseLibrary/ExerciseLibraryView.js';
import { HabitTrackerView } from './features/habitTracker/HabitTrackerView.js';
import { SorenessMapView } from './features/sorenessMap/SorenessMapView.js';
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

    this.profileManager = new ProfileManager(this.db, this.prefs, this.bus);
    const existingProfile = await this.profileManager.init();

    const [exerciseData, planData, challengeData, quotesData] = await Promise.all([
      this.loadJSON('assets/plans/exercise_catalog_v1.json'),
      this.loadJSON('assets/plans/workout_plans_v1.json'),
      this.loadJSON('assets/plans/challenge_30day_v1.json'),
      this.loadJSON('assets/plans/quotes_v1.json')
    ]);

    this.exerciseRepo = new ExerciseRepository(this.db, () => this.profileManager.getActiveProfileId());
    this.exerciseRepo.load(exerciseData.exercises || []);

    this.workoutRepo = new WorkoutRepository();
    this.workoutRepo.load(planData.plans || []);

    this.recovery = new RecoveryEngine(this.db, () => this.profileManager.getActiveProfileId());
    this.scheduler = new SchedulerEngine(this.exerciseRepo, this.workoutRepo);
    this.progression = new ProgressionEngine(this.db, this.prefs, () => this.profileManager.getActiveProfileId());
    this.achievementEngine = new AchievementEngine(this.db, this.bus, () => this.profileManager.getActiveProfileId(), this.exerciseRepo);
    this.achievementEngine.init();

    this.getExercises = new GetExercises(this.exerciseRepo);
    this.startWorkout = new StartWorkout(this.exerciseRepo, this.progression, this.bus);
    this.completeWorkout = new CompleteWorkout(this.db, this.bus, this.progression, () => this.profileManager.getActiveProfileId(), this.exerciseRepo);
    this.getProgress = new GetProgress(this.db, () => this.profileManager.getActiveProfileId());
    this.backup = new BackupService(this.db, this.prefs);

    if (!existingProfile) {
      this.showOnboarding(challengeData, quotesData);
    } else {
      this.initViews(new User(existingProfile), challengeData, quotesData);
    }

    this.setupNav();
    this.router.navigate('dashboard');
    this.registerSW();
    this.logger.info('App initialized successfully');
  }

  showOnboarding(challengeData, quotesData) {
    const onboarding = new OnboardingView(this.prefs, this.bus);
    onboarding.render();
    const off = this.bus.on(Events.PROFILE_UPDATED, async (user) => {
      off();
      const savedProfile = await this.profileManager.saveProfile(user, { setActive: true });
      document.getElementById('onboarding').classList.remove('active');
      this.initViews(new User(savedProfile), challengeData, quotesData);
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
      achievementEngine: this.achievementEngine,
      profileManager: this.profileManager,
      getExercises: this.getExercises,
      startWorkout: this.startWorkout,
      completeWorkout: this.completeWorkout,
      getProgress: this.getProgress,
      backup: this.backup,
      challengeData,
      quotesData,
      logger: this.logger,
      getActiveProfileId: () => this.profileManager.getActiveProfileId(),
      getUser: () => new User(this.prefs.get('user') || user)
    };

    this.views.dashboard = new DashboardView(ctx);
    this.views.workouts = new WorkoutsView(ctx);
    this.views.challenge = new ChallengeView(ctx);
    this.views.progress = new ProgressView(ctx);
    this.views.settings = new SettingsView(ctx);
    this.views.trainer = new TrainerView(ctx);

    this.views.exerciseLibrary = new ExerciseLibraryView();
    this.views.exerciseLibrary.init(document.querySelector('[data-page="exercises"]'), ctx);

    this.views.customWorkout = new CustomWorkoutView();
    this.views.customWorkout.init(document.querySelector('[data-page="custom-workouts"]'), ctx);
    ctx.customWorkoutView = this.views.customWorkout;

    this.views.habits = new HabitTrackerView();
    this.views.habits.init(document.querySelector('[data-page="habits"]'), ctx);

    this.views.soreness = new SorenessMapView();
    this.views.soreness.init(document.querySelector('[data-page="recovery"]'), ctx);

    this.views.achievements = new AchievementView();
    this.views.achievements.init(document.querySelector('[data-page="achievements"]'), ctx);

    this.views.timers = new TimerModesView();
    this.views.timers.init(document.querySelector('[data-page="timers"]'), ctx);

    Object.values(this.views).forEach((view) => view.render?.());
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
    } catch (error) {
      this.logger.error(`Failed to load ${path}:`, error);
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
app.init().catch((error) => console.error('Boot failed:', error));
