import { EXERCISES, EXERCISE_INDEX } from './data/exercises.js';
import { WORKOUT_PLANS, WORKOUT_PLAN_INDEX } from './data/plans.js';
import { THIRTY_DAY_CHALLENGE } from './data/challenges.js';
import { QUOTES } from './data/quotes.js';
import { ProfileModel } from './models/profile.js';
import { ProgressModel } from './models/progress.js';
import { WorkoutModel, WORKOUT_STATES } from './models/workout.js';
import { StorageService } from './services/storage.js';
import { AudioService } from './services/audio.js';
import { VoiceService } from './services/voice.js';
import { GeneratorService } from './services/generator.js';
import { RPEService } from './services/rpe.js';
import { TimerService } from './services/timer.js';
import { MotionService } from './services/motion.js';
import { DeskService } from './services/desk.js';
import { HomeView } from './views/home.js';
import { WorkoutsView } from './views/workouts.js';
import { TrainerView } from './views/trainer.js';
import { ChallengeView } from './views/challenge.js';
import { ProgressView } from './views/progress.js';
import { ProfileView } from './views/profile.js';

export class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, fn) {
    this.listeners[event] ??= new Set();
    this.listeners[event].add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this.listeners[event]?.delete(fn);
  }

  emit(event, data) {
    this.listeners[event]?.forEach((fn) => fn(data));
  }
}

export class Router {
  constructor(bus) {
    this.bus = bus;
    this.pages = [...document.querySelectorAll('[data-page]')];
    this.navItems = [...document.querySelectorAll('[data-page-link]')];
    this.currentPage = 'home';
  }

  navigate(page) {
    this.currentPage = page;
    this.pages.forEach((node) => {
      const active = node.dataset.page === page;
      node.hidden = !active;
      node.classList.toggle('is-active', active);
    });
    this.navItems.forEach((node) => node.classList.toggle('is-active', node.dataset.pageLink === page));
    this.bus.emit('page:changed', { page });
  }
}

export class App {
  constructor() {
    this.bus = new EventBus();
    this.storage = new StorageService();
    this.profile = new ProfileModel(this.storage);
    this.progress = new ProgressModel(this.storage);
    this.rpe = new RPEService(this.storage);
    this.audio = new AudioService();
    this.voice = new VoiceService();
    this.timer = new TimerService(this.bus);
    this.motion = new MotionService(this.bus, this.voice);
    this.generator = new GeneratorService(EXERCISES, WORKOUT_PLANS, this.progress, this.rpe);
    this.desk = new DeskService(this.bus, EXERCISES);
    this.workout = new WorkoutModel(this.storage, this.bus, EXERCISE_INDEX, this.progress, this.rpe);
    this.router = new Router(this.bus);
    this.currentWorkoutContext = null;

    this.views = {
      home: new HomeView(this.bus, this.profile, this.progress, this.generator, QUOTES, this.desk, document.querySelector('#page-home')),
      workouts: new WorkoutsView(this.bus, WORKOUT_PLANS, EXERCISE_INDEX, document.querySelector('#page-workouts')),
      challenge: new ChallengeView(this.bus, THIRTY_DAY_CHALLENGE, this.progress, EXERCISE_INDEX, document.querySelector('#page-challenge')),
      progress: new ProgressView(this.bus, this.progress, THIRTY_DAY_CHALLENGE, document.querySelector('#page-progress')),
      profile: new ProfileView(this.bus, this.profile, this.storage, document.querySelector('#page-profile'))
    };
    this.trainerView = new TrainerView(this.bus, this.workout, this.audio, this.voice, this.timer, this.motion, document.querySelector('#trainer-overlay'));
  }

  bindDom() {
    document.querySelectorAll('[data-page-link]').forEach((button) => {
      button.addEventListener('click', () => this.bus.emit('page:navigate', { page: button.dataset.pageLink }));
    });
    document.querySelector('#page-home')?.addEventListener('change', (event) => {
      const input = event.target.closest('[data-action="toggle-desk"]');
      if (input) {
        this.bus.emit('desk:toggle', { enabled: input.checked });
      }
    });
  }

  bindBus() {
    this.bus.on('page:navigate', ({ page }) => this.router.navigate(page));
    this.bus.on('page:changed', ({ page }) => this.views[page]?.render());
    this.bus.on('hydration:toggle', ({ index }) => {
      this.progress.toggleWater(index, this.profile.get().dailyWaterGoal);
      this.views.home.render();
    });
    this.bus.on('desk:toggle', ({ enabled }) => {
      if (enabled) this.desk.startDeskMode();
      else this.desk.stopDeskMode();
      this.profile.update({ deskMode: enabled });
      this.views.home.render();
      this.views.profile.render();
    });
    this.bus.on('profile:save', (payload) => {
      const saved = this.profile.save(payload);
      this.voice.setEnabled(saved.voiceEnabled);
      this.renderAll();
    });
    this.bus.on('profile:export', () => {
      this.bus.emit('profile:exported', { json: JSON.stringify(this.storage.exportAll(), null, 2) });
    });
    this.bus.on('profile:import', ({ json }) => {
      this.storage.importAll(json);
      const profile = this.profile.get();
      this.voice.setEnabled(profile.voiceEnabled);
      if (profile.deskMode) this.desk.startDeskMode();
      else this.desk.stopDeskMode();
      this.renderAll();
    });
    this.bus.on('workout:start', (payload) => this.startWorkout(payload));
    this.bus.on('workout:toggle-pause', () => {
      const snapshot = this.workout.getSnapshot();
      if (snapshot.state === WORKOUT_STATES.PAUSED) {
        this.workout.resume();
        this.timer.resume();
      } else {
        this.workout.pause();
        this.timer.pause();
      }
    });
    this.bus.on('workout:skip', () => {
      this.timer.stop(true);
      this.motion.stopCounting();
      this.workout.skipExercise();
    });
    this.bus.on('workout:previous', () => {
      this.timer.stop(true);
      this.motion.stopCounting();
      this.workout.goPrevious();
    });
    this.bus.on('workout:finish-rest', () => {
      this.timer.stop(true);
      this.workout.finishRest();
    });
    this.bus.on('workout:complete-set', () => {
      this.timer.stop(true);
      this.workout.completeSet();
    });
    this.bus.on('workout:override-target', ({ exerciseId, target }) => this.workout.overrideTarget(exerciseId, target));
    this.bus.on('workout:dismiss', () => {
      this.currentWorkoutContext = null;
      this.timer.stop(true);
      this.motion.stopCounting();
      this.workout.dismiss();
    });
    this.bus.on('workout:complete', () => {
      if (this.currentWorkoutContext?.challengeDay) {
        this.progress.markChallengeDay(this.currentWorkoutContext.challengeDay);
      }
      this.renderAll();
    });
    this.bus.on('rpe:record', ({ rating }) => {
      this.currentWorkoutContext = null;
      this.rpe.record(rating);
      this.timer.stop(true);
      this.motion.stopCounting();
      this.workout.dismiss();
      this.renderAll();
    });
    this.bus.on('desk:updated', () => this.views.home.render());
  }

  routineToPlan(routine) {
    const asItems = (items = []) => items.map((exercise) => typeof exercise === 'string'
      ? exercise
      : ({ id: exercise.id, target: exercise.target || exercise.levels?.beginner, sets: exercise.sets || exercise.setsDefault }));
    return {
      id: routine.id,
      name: routine.name,
      difficulty: routine.difficulty,
      warmUp: asItems(routine.warmUp),
      main: asItems(routine.main),
      coolDown: asItems(routine.coolDown)
    };
  }

  challengeDayToPlan(day) {
    const exercises = day.exercises || [];
    return {
      id: `challenge-day-${day.day}`,
      name: day.label,
      difficulty: day.intensity > 1 ? 'advanced' : day.intensity > 0.8 ? 'intermediate' : 'beginner',
      warmUp: ['sunrise-march', 'arm-circles'],
      main: exercises.slice(0, -1),
      coolDown: [exercises.at(-1) || 'childs-pose']
    };
  }

  startWorkout(payload) {
    this.currentWorkoutContext = payload;
    let plan;
    if (payload.planId) {
      plan = WORKOUT_PLAN_INDEX[payload.planId];
    } else if (payload.routine) {
      plan = this.routineToPlan(payload.routine);
    } else if (payload.challengePlan) {
      plan = this.challengeDayToPlan(payload.challengePlan);
    }
    if (!plan) return;
    this.workout.start(plan, { profile: { ...this.profile.get(), level: this.profile.getLevel() }, source: payload.source || 'app' });
  }

  renderAll() {
    Object.values(this.views).forEach((view) => view.render());
  }

  registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
    navigator.serviceWorker.register('./sw.js').catch(() => null);
  }

  init() {
    const existed = this.profile.exists();
    if (!existed) {
      this.profile.save(this.profile.get());
    }
    const profile = this.profile.get();
    this.voice.setEnabled(profile.voiceEnabled);
    if (profile.deskMode) this.desk.startDeskMode();
    this.bindDom();
    this.bindBus();
    this.renderAll();
    this.trainerView.render(this.workout.getSnapshot());
    this.router.navigate(existed ? 'home' : 'profile');
    this.registerServiceWorker();
  }
}

if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.openFitApp = app;
    app.init();
  });
}

