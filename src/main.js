import { EventBus, Events } from './app/eventBus.js';
import { Router } from './app/router.js';
import { AppBootstrap } from './app/bootstrap.js';
import { IndexedDbService } from './core/storage/indexedDb.js';
import { Preferences } from './core/storage/preferences.js';
import { SpeechService } from './core/speech/speechService.js';
import { NotificationService } from './core/notifications/notificationService.js';
import { BackupService } from './core/backup/backupService.js';
import { AudioEngine } from './core/utils/audioEngine.js';
import { Logger } from './core/logger/logger.js';
import { getLocalDateStr, today, daysBetween } from './core/utils/dateUtils.js';
import { getProfileRecords, getScopedDailyRecord, sortByDateDesc, todayKey } from './core/storage/profileData.js';
import { ExerciseRepository } from './domain/repositories/ExerciseRepository.js';
import { WorkoutRepository } from './domain/repositories/WorkoutRepository.js';
import { RecoveryEngine } from './domain/services/RecoveryEngine.js';
import { SchedulerEngine } from './domain/services/SchedulerEngine.js';
import { ProgressionEngine } from './domain/services/ProgressionEngine.js';
import { AchievementEngine } from './domain/services/AchievementEngine.js';
import { GetExercises } from './application/exercises/GetExercises.js';
import { StartWorkout } from './application/workouts/StartWorkout.js';
import { CompleteWorkout } from './application/workouts/CompleteWorkout.js';
import { ManageWorkouts } from './application/workouts/ManageWorkouts.js';
import { WorkoutNotes } from './application/workouts/WorkoutNotes.js';
import { GetProgress } from './application/progress/GetProgress.js';
import { TrackHabit } from './application/habits/TrackHabit.js';
import { GetChallenge } from './application/challenges/GetChallenge.js';
import { UpdateProfile } from './application/profile/UpdateProfile.js';
import { GetRecovery } from './application/recovery/GetRecovery.js';
import { TrackSoreness } from './application/soreness/TrackSoreness.js';
import { GetAchievements } from './application/achievements/GetAchievements.js';
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
    this.bootstrap = new AppBootstrap({ router: this.router, logger: this.logger });
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
    this.applyTheme(this.prefs.get('theme', 'dark'));
    this.prefs.set('featureFlags', this.prefs.getFeatureFlags());
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
    const getActiveProfileId = () => this.profileManager.getActiveProfileId();
    const getRecordsForProfile = (storeName, profileId) => getProfileRecords(this.db, storeName, profileId);
    const achievementStorage = {
      getStats: (profileId = getActiveProfileId()) => this.db.get('lifetimeStats', profileId),
      saveStats: (stats) => this.db.put('lifetimeStats', stats),
      getUnlocked: (profileId = getActiveProfileId()) => getRecordsForProfile('achievements', profileId),
      saveUnlocked: (achievement) => this.db.put('achievements', achievement)
    };
    const recoveryStorage = {
      getLogs: async (profileId, days = 30) => {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - Math.max(0, days - 1));
        const thresholdDate = todayKey(threshold);
        const logs = await getRecordsForProfile('dailyLogs', profileId);
        return logs.filter((entry) => String(entry.date || '') >= thresholdDate);
      },
      getHabits: (profileId, date = todayKey()) => getScopedDailyRecord(this.db, 'habits', profileId, date, { soreness: [] })
    };
    const progressionStorage = {
      getHistory: () => this.prefs.get(`rpe_history_${getActiveProfileId()}`, []),
      saveHistory: (history) => this.prefs.set(`rpe_history_${getActiveProfileId()}`, history),
      getMultiplier: () => this.prefs.get(`progression_multiplier_${getActiveProfileId()}`, 1.0),
      saveMultiplier: (multiplier) => this.prefs.set(`progression_multiplier_${getActiveProfileId()}`, multiplier)
    };

    this.recovery = new RecoveryEngine({
      storage: recoveryStorage,
      getActiveProfileId,
      getDateStr: todayKey
    });
    this.scheduler = new SchedulerEngine(this.exerciseRepo, this.workoutRepo, todayKey);
    this.progression = new ProgressionEngine({
      storage: progressionStorage,
      getDateStr: todayKey
    });
    this.achievementEngine = new AchievementEngine({
      storage: achievementStorage,
      bus: this.bus,
      events: Events,
      getActiveProfileId,
      exerciseRepo: this.exerciseRepo,
      getProfileRecords: getRecordsForProfile,
      sortByDateDesc,
      todayKey
    });
    this.achievementEngine.init();

    this.getExercises = new GetExercises(this.exerciseRepo);
    this.getAchievements = new GetAchievements({
      achievementEngine: this.achievementEngine,
      getActiveProfileId: () => this.profileManager.getActiveProfileId()
    });
    this.trackHabit = new TrackHabit({
      db: this.db,
      prefs: this.prefs,
      bus: this.bus,
      events: Events,
      getActiveProfileId: () => this.profileManager.getActiveProfileId(),
      getLocalDateStr,
      getProfileRecords,
      getScopedDailyRecord,
      applyHabitProgress: (...args) => this.getAchievements.applyHabitProgress(...args)
    });
    this.getProgress = new GetProgress({
      db: this.db,
      getActiveProfileId: () => this.profileManager.getActiveProfileId(),
      getProfileRecords,
      getScopedDailyRecord,
      todayKey
    });
    this.getRecovery = new GetRecovery({
      db: this.db,
      recoveryEngine: this.recovery,
      getActiveProfileId: () => this.profileManager.getActiveProfileId(),
      getLocalDateStr,
      getScopedDailyRecord
    });
    this.manageWorkouts = new ManageWorkouts({
      db: this.db,
      bus: this.bus,
      events: Events,
      workoutRepo: this.workoutRepo,
      getActiveProfileId: () => this.profileManager.getActiveProfileId(),
      getExerciseById: (exerciseId) => this.getExercises.getById(exerciseId),
      scheduler: this.scheduler
    });
    this.getChallenge = new GetChallenge({
      db: this.db,
      prefs: this.prefs,
      bus: this.bus,
      events: Events,
      getActiveProfileId: () => this.profileManager.getActiveProfileId(),
      today,
      daysBetween,
      getProfileRecords,
      exerciseRepo: this.exerciseRepo,
      achievementGateway: this.getAchievements
    });
    this.updateProfile = new UpdateProfile({
      db: this.db,
      prefs: this.prefs,
      bus: this.bus,
      events: Events,
      profileManager: this.profileManager,
      getLocalDateStr,
      syncMeasurementProgress: (profileId) => this.getAchievements.syncMeasurementProgress(profileId)
    });
    this.trackSoreness = new TrackSoreness({
      db: this.db,
      getActiveProfileId: () => this.profileManager.getActiveProfileId(),
      getScopedDailyRecord,
      todayKey,
      recoveryEngine: this.recovery,
      trackHabit: this.trackHabit,
      getExercises: this.getExercises
    });
    this.startWorkout = new StartWorkout({
      exerciseRepo: this.exerciseRepo,
      progressionEngine: this.progression,
      bus: this.bus,
      events: Events
    });
    this.completeWorkout = new CompleteWorkout({
      db: this.db,
      bus: this.bus,
      events: Events,
      progressionEngine: this.progression,
      getActiveProfileId: () => this.profileManager.getActiveProfileId(),
      exerciseRepo: this.exerciseRepo,
      todayKey,
      getScopedDailyRecord
    });
    this.workoutNotes = new WorkoutNotes(this.db);
    this.backup = new BackupService(this.db, this.prefs);

    if (!existingProfile) {
      this.showOnboarding(challengeData, quotesData);
    } else {
      this.initViews(challengeData, quotesData);
    }

    this.bootstrap.init('dashboard');
    await this.checkWorkoutReminder();
    this.logger.info('App initialized successfully');
  }

  showOnboarding(challengeData, quotesData) {
    const onboarding = new OnboardingView(this.updateProfile);
    onboarding.render();
    const off = this.bus.on(Events.PROFILE_UPDATED, async () => {
      off();
      document.getElementById('onboarding').classList.remove('active');
      this.initViews(challengeData, quotesData);
      this.router.navigate('dashboard');
    });
  }

  initViews(challengeData, quotesData) {
    const features = this.prefs.getFeatureFlags();
    const openCustomWorkoutEditor = (workoutId = '') => this.views.customWorkout?.openEditor(workoutId);
    const addExerciseToCustomWorkout = (exerciseId) => this.views.customWorkout?.addExerciseById(exerciseId);

    this.registerView('dashboard', new DashboardView({
      bus: this.bus,
      router: this.router,
      getProgress: this.getProgress,
      trackHabit: this.trackHabit,
      getAchievements: this.getAchievements,
      manageWorkouts: this.manageWorkouts,
      startWorkout: this.startWorkout,
      getExercises: this.getExercises,
      updateProfile: this.updateProfile,
      notifications: this.notifications,
      quotesData,
      features
    }), { page: 'dashboard' });

    this.registerView('workouts', new WorkoutsView({
      bus: this.bus,
      router: this.router,
      manageWorkouts: this.manageWorkouts,
      startWorkout: this.startWorkout,
      updateProfile: this.updateProfile,
      openCustomWorkoutEditor
    }), { page: 'workouts' });

    this.registerView('trainer', new TrainerView({
      bus: this.bus,
      router: this.router,
      speech: this.speech,
      audio: this.audio,
      completeWorkout: this.completeWorkout,
      workoutNotes: this.workoutNotes,
      getExercises: this.getExercises,
      getProgress: this.getProgress
    }), { page: 'dashboard' });

    this.registerView('challenge', new ChallengeView({
      bus: this.bus,
      getChallenge: this.getChallenge,
      startWorkout: this.startWorkout,
      getExercises: this.getExercises,
      updateProfile: this.updateProfile,
      challengeData
    }), { page: 'challenge', feature: 'challenge' });

    this.registerView('progress', new ProgressView({
      bus: this.bus,
      router: this.router,
      getProgress: this.getProgress,
      updateProfile: this.updateProfile,
      features
    }), { page: 'progress', feature: 'progress' });

    this.registerView('settings', new SettingsView({
      bus: this.bus,
      updateProfile: this.updateProfile,
      backup: this.backup,
      audio: this.audio,
      speech: this.speech,
      notifications: this.notifications,
      applyTheme: (theme) => this.applyTheme(theme)
    }), { page: 'settings', feature: 'settings' });

    const exerciseLibrary = new ExerciseLibraryView();
    this.registerView('exerciseLibrary', exerciseLibrary, {
      page: 'exercises',
      feature: 'exerciseLibrary',
      init: (view, pageEl) => view.init(pageEl, {
        bus: this.bus,
        router: this.router,
        getExercises: this.getExercises,
        openCustomWorkoutEditor,
        addExerciseToCustomWorkout
      })
    });

    const customWorkoutView = new CustomWorkoutView();
    this.registerView('customWorkout', customWorkoutView, {
      page: 'custom-workouts',
      feature: 'customWorkouts',
      init: (view, pageEl) => view.init(pageEl, {
        bus: this.bus,
        router: this.router,
        manageWorkouts: this.manageWorkouts,
        getExercises: this.getExercises,
        updateProfile: this.updateProfile
      })
    });

    const habitsView = new HabitTrackerView();
    this.registerView('habits', habitsView, {
      page: 'habits',
      feature: 'habitSignals',
      init: (view, pageEl) => view.init(pageEl, {
        bus: this.bus,
        router: this.router,
        trackHabit: this.trackHabit
      })
    });

    const sorenessView = new SorenessMapView();
    this.registerView('soreness', sorenessView, {
      page: 'recovery',
      feature: ['soreness', 'recoveryInsights'],
      init: (view, pageEl) => view.init(pageEl, {
        bus: this.bus,
        trackSoreness: this.trackSoreness
      })
    });

    const achievementView = new AchievementView();
    this.registerView('achievements', achievementView, {
      page: 'achievements',
      feature: 'achievements',
      init: (view, pageEl) => view.init(pageEl, {
        bus: this.bus,
        router: this.router,
        getAchievements: this.getAchievements
      })
    });

    const timersView = new TimerModesView();
    this.registerView('timers', timersView, {
      page: 'timers',
      feature: 'timers',
      init: (view, pageEl) => view.init(pageEl, {
        bus: this.bus,
        speech: this.speech
      })
    });

    Object.values(this.views).forEach((view) => view.render?.());
  }

  registerView(name, view, { page, feature = null, init = null }) {
    const featureKeys = Array.isArray(feature) ? feature : (feature ? [feature] : []);
    const enabled = featureKeys.every((featureKey) => this.prefs.isFeatureEnabled(featureKey));
    const pageNode = document.querySelector(`[data-page="${page}"]`);
    const navNode = document.querySelector(`[data-nav="${page}"]`);
    if (pageNode) pageNode.hidden = !enabled;
    if (navNode) navNode.hidden = !enabled;
    if (!enabled) return null;

    if (init && pageNode) {
      init(view, pageNode);
    }
    this.views[name] = view;
    return view;
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

  applyTheme(theme = 'dark') {
    const nextTheme = theme === 'light' ? 'light-theme' : 'dark-theme';
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(nextTheme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#050816');
    }
  }

  async checkWorkoutReminder() {
    const reminder = this.updateProfile?.getReminderConfig?.();
    if (!reminder?.enabled) return;

    const user = this.updateProfile.getUser();
    if (!user?.goal) return;

    const now = new Date();
    const reminderAt = new Date(now);
    reminderAt.setHours(reminder.hour, reminder.minute, 0, 0);
    if (now < reminderAt) return;

    const todayDate = today();
    if (this.prefs.get('reminderLastShownDate', '') === todayDate) return;

    const progress = await this.getProgress.execute();
    if (progress.dailyLog?.workoutCompleted) return;

    const notification = this.notifications.workoutReminder(user.goal.replaceAll('_', ' '));
    if (notification) {
      this.prefs.set('reminderLastShownDate', todayDate);
    }
  }
}

const app = new App();
app.init().catch((error) => console.error('Boot failed:', error));
