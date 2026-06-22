import { Events } from '../../app/eventBus.js';

export class WorkoutsView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="workouts"]');
    this.filters = { category: 'all', difficulty: 'all' };
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
    this.ctx.bus.on(Events.CUSTOM_WORKOUTS_CHANGED, () => this.render());
  }

  t(key, fallback = key) {
    return this.ctx.i18n?.t(key) || fallback;
  }

  async render() {
    const plans = this.ctx.manageWorkouts.getPlans(this.filters);
    const customWorkouts = await this.ctx.manageWorkouts.getCustomWorkouts();
    const categories = ['all', ...this.ctx.manageWorkouts.getCategories()];
    const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];
    const user = this.ctx.updateProfile.getUser();

    this.el.innerHTML = `
      <div class="page-title">${this.t('workout_plans', 'Workout Plans')}</div>
      <p class="page-subtitle">${this.t('workouts_subtitle', 'Browse prebuilt plans, build your own session, or open advanced timer modes.')}</p>
      <section class="card"><div class="quick-links-grid"><button class="quick-link" data-action="open-library">📚 ${this.t('exercise_library_title', 'Exercise Library')}</button><button class="quick-link" data-action="open-custom">🛠️ ${this.t('build_custom_workout', 'Build Custom Workout')}</button><button class="quick-link" data-action="open-timers">⏱️ ${this.t('timer_modes', 'Timer Modes')}</button></div></section>
      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('custom_workouts', 'Custom Workouts')}</h2><p class="text-sm text-muted">${this.t('custom_workouts_subtitle', 'Saved locally in IndexedDB and scoped to')} ${user.name || this.t('profile_suffix', 'this profile')}.</p></div><button class="btn btn-primary btn-sm" data-action="open-custom">${this.t('new', 'New')}</button></div>${customWorkouts.length ? customWorkouts.map((plan) => this.renderCustomPlan(plan, user.level)).join('') : `<p class="text-sm text-muted">${this.t('no_custom_workouts', 'No custom workouts yet. Create one from the builder.')}</p>`}</section>
      <section class="card"><div class="mb-16"><div class="text-sm text-muted mb-8">${this.t('categories', 'Categories')}</div><div class="tabs">${categories.map((category) => `<button class="tab ${this.filters.category === category ? 'active' : ''}" data-action="filter-category" data-value="${category}">${this.formatFilterValue(category)}</button>`).join('')}</div></div><div><div class="text-sm text-muted mb-8">${this.t('difficulty', 'Difficulty')}</div><div class="tabs">${difficulties.map((difficulty) => `<button class="tab ${this.filters.difficulty === difficulty ? 'active' : ''}" data-action="filter-difficulty" data-value="${difficulty}">${this.formatFilterValue(difficulty)}</button>`).join('')}</div></div></section>
      <section>${plans.map((plan) => this.renderPlan(plan)).join('') || `<div class="card"><p class="text-sm text-muted">${this.t('no_matching_workouts', 'No workouts match your filters yet.')}</p></div>`}</section>`;
  }

  formatFilterValue(value) {
    if (!value) return '';
    if (value === 'all') return this.t('all', 'All');
    return this.t(value, value.replaceAll('_', ' '));
  }

  translatePlanName(plan) {
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

  renderPlan(plan) {
    const preview = this.ctx.manageWorkouts.getPlanPreview(plan, 3);
    return `<article class="workout-card card"><div class="flex flex-between gap-12"><div><h2>${plan.icon} ${this.translatePlanName(plan)}</h2><p class="text-sm text-muted">${plan.description}</p></div><span class="badge badge-${plan.difficulty}">${this.formatFilterValue(plan.difficulty)}</span></div><div class="flex flex-wrap gap-8"><span class="chip">${plan.duration} min</span><span class="chip">${this.formatFilterValue(plan.category)}</span><span class="chip">${plan.main.length} main</span></div><p class="text-sm text-muted">${preview}</p><button class="btn btn-primary" data-action="start-plan" data-plan-id="${plan.id}">${this.t('start_plan', 'Start plan')}</button></article>`;
  }

  renderCustomPlan(plan, fallbackDifficulty) {
    const preview = this.ctx.manageWorkouts.getPlanPreview(plan);
    return `<article class="card"><div class="flex flex-between gap-12 mb-8"><div><h3>🛠️ ${plan.name}</h3><p class="text-sm text-muted">${plan.duration || 0} min • ${(plan.main || []).length} ${this.t('exercises', 'Exercises').toLowerCase()}</p></div><span class="badge badge-${plan.difficulty || fallbackDifficulty}">${this.formatFilterValue(plan.difficulty || fallbackDifficulty)}</span></div><p class="text-sm text-muted mb-16">${preview || this.t('no_exercises_added', 'No exercises added yet.')}</p><div class="flex gap-8 flex-wrap"><button class="btn btn-primary btn-sm" data-action="start-custom" data-workout-id="${plan.id}">${this.t('start', 'Start')}</button><button class="btn btn-secondary btn-sm" data-action="edit-custom" data-workout-id="${plan.id}">${this.t('edit', 'Edit')}</button><button class="btn btn-secondary btn-sm" data-action="duplicate-custom" data-workout-id="${plan.id}">${this.t('duplicate', 'Duplicate')}</button><button class="btn btn-danger btn-sm" data-action="delete-custom" data-workout-id="${plan.id}">${this.t('delete', 'Delete')}</button></div></article>`;
  }

  async handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'filter-category') {
      this.filters.category = button.dataset.value;
      return this.render();
    }
    if (button.dataset.action === 'filter-difficulty') {
      this.filters.difficulty = button.dataset.value;
      return this.render();
    }
    if (button.dataset.action === 'start-plan') {
      const plan = this.ctx.manageWorkouts.getPlanById(button.dataset.planId);
      if (plan) this.ctx.startWorkout.execute(plan, this.ctx.updateProfile.getUser().level);
    }
    if (button.dataset.action === 'open-library') this.ctx.router.navigate('exercises');
    if (button.dataset.action === 'open-custom') {
      this.ctx.openCustomWorkoutEditor();
      this.ctx.router.navigate('custom-workouts');
    }
    if (button.dataset.action === 'open-timers') this.ctx.router.navigate('timers');
    if (button.dataset.action === 'start-custom') {
      const workout = await this.ctx.manageWorkouts.getCustomWorkout(button.dataset.workoutId);
      if (workout) this.ctx.startWorkout.execute(workout, this.ctx.updateProfile.getUser().level);
    }
    if (button.dataset.action === 'edit-custom') {
      this.ctx.openCustomWorkoutEditor(button.dataset.workoutId);
      this.ctx.router.navigate('custom-workouts');
    }
    if (button.dataset.action === 'duplicate-custom') {
      await this.ctx.manageWorkouts.duplicateCustomWorkout(button.dataset.workoutId);
      this.render();
    }
    if (button.dataset.action === 'delete-custom') {
      await this.ctx.manageWorkouts.deleteCustomWorkout(button.dataset.workoutId);
    }
  }
}
