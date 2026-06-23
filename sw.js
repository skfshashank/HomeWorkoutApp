const CACHE_NAME = 'openfit-v15';
const PRECACHE = [
  'index.html',
  'manifest.json',
  'css/main.css',
  'css/components.css',
  'css/animations.css',
  'src/main.js',
  'src/app/bootstrap.js',
  'src/app/eventBus.js',
  'src/app/router.js',
  'src/application/achievements/GetAchievements.js',
  'src/application/challenges/GetChallenge.js',
  'src/application/exercises/GetExercises.js',
  'src/application/habits/TrackHabit.js',
  'src/application/profile/UpdateProfile.js',
  'src/application/progress/GetProgress.js',
  'src/application/recovery/GetRecovery.js',
  'src/application/soreness/TrackSoreness.js',
  'src/application/workouts/CompleteWorkout.js',
  'src/application/workouts/ManageWorkouts.js',
  'src/application/workouts/StartWorkout.js',
  'src/application/workouts/WorkoutNotes.js',
  'src/core/backup/backupService.js',
  'src/core/logger/logger.js',
  'src/core/notifications/notificationService.js',
  'src/core/speech/speechService.js',
  'src/core/storage/indexedDb.js',
  'src/core/storage/preferences.js',
  'src/core/storage/profileData.js',
  'src/core/utils/audioEngine.js',
  'src/core/utils/dateUtils.js',
  'src/core/utils/exerciseSvg.js',
  'src/core/utils/i18n.js',
  'src/core/utils/modalAccessibility.js',
  'src/domain/entities/Exercise.js',
  'src/domain/entities/Habit.js',
  'src/domain/entities/User.js',
  'src/domain/entities/Workout.js',
  'src/domain/repositories/ExerciseRepository.js',
  'src/domain/repositories/WorkoutRepository.js',
  'src/domain/services/AchievementEngine.js',
  'src/domain/services/ProgressionEngine.js',
  'src/domain/services/RecoveryEngine.js',
  'src/domain/services/SchedulerEngine.js',
  'src/features/achievements/AchievementView.js',
  'src/features/challenge/ChallengeView.js',
  'src/features/dashboard/DashboardView.js',
  'src/features/dashboard/OnboardingView.js',
  'src/features/exerciseLibrary/ExerciseLibraryView.js',
  'src/features/habitTracker/HabitTrackerView.js',
  'src/features/progressTracker/ProgressView.js',
  'src/features/settings/ProfileManager.js',
  'src/features/settings/SettingsView.js',
  'src/features/sorenessMap/SorenessMapView.js',
  'src/features/workoutPlayer/CustomWorkoutView.js',
  'src/features/workoutPlayer/TimerModesView.js',
  'src/features/workoutPlayer/TrainerView.js',
  'src/features/workoutPlayer/WorkoutsView.js',
  'assets/icons/icon-512.svg',
  'assets/plans/challenge_30day_v1.json',
  'assets/plans/exercise_catalog_v1.json',
  'assets/plans/quotes_v1.json',
  'assets/plans/workout_plans_v1.json'
].map((file) => new URL(file, self.location).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isAppCode = url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html');

  if (isAppCode) {
    // Network-first for app code: always get fresh version, fall back to cache offline
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match(new URL('index.html', self.location).toString())))
    );
  } else {
    // Cache-first for assets (images, JSON data, fonts)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match(new URL('index.html', self.location).toString()));
      })
    );
  }
});
