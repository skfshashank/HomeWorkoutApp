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

  async render() {
    const plans = this.getFilteredPlans();
    const customWorkouts = await this.getCustomWorkouts();
    const categories = ['all', ...new Set(this.ctx.workoutRepo.getAll().map((plan) => plan.category))];
    const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

    this.el.innerHTML = `
      <div class="page-title">Workout Plans</div>
      <p class="page-subtitle">Browse prebuilt plans, build your own session, or open advanced timer modes.</p>
      <section class="card"><div class="quick-links-grid"><button class="quick-link" data-action="open-library">📚 Exercise Library</button><button class="quick-link" data-action="open-custom">🛠️ Build Custom Workout</button><button class="quick-link" data-action="open-timers">⏱️ Timer Modes</button></div></section>
      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Custom Workouts</h2><p class="text-sm text-muted">Saved locally in IndexedDB and scoped to ${this.ctx.getUser().name || 'this profile'}.</p></div><button class="btn btn-primary btn-sm" data-action="open-custom">New</button></div>${customWorkouts.length ? customWorkouts.map((plan) => this.renderCustomPlan(plan)).join('') : '<p class="text-sm text-muted">No custom workouts yet. Create one from the builder.</p>'}</section>
      <section class="card"><div class="mb-16"><div class="text-sm text-muted mb-8">Categories</div><div class="tabs">${categories.map((category) => `<button class="tab ${this.filters.category === category ? 'active' : ''}" data-action="filter-category" data-value="${category}">${category.replaceAll('_', ' ')}</button>`).join('')}</div></div><div><div class="text-sm text-muted mb-8">Difficulty</div><div class="tabs">${difficulties.map((difficulty) => `<button class="tab ${this.filters.difficulty === difficulty ? 'active' : ''}" data-action="filter-difficulty" data-value="${difficulty}">${difficulty}</button>`).join('')}</div></div></section>
      <section>${plans.map((plan) => this.renderPlan(plan)).join('') || '<div class="card"><p class="text-sm text-muted">No workouts match your filters yet.</p></div>'}</section>`;
  }

  renderPlan(plan) {
    const preview = plan.main.slice(0, 3).map((item) => this.ctx.exerciseRepo.getById(item.exerciseId)?.name || item.exerciseId).join(' • ');
    return `<article class="workout-card card"><div class="flex flex-between gap-12"><div><h2>${plan.icon} ${plan.name}</h2><p class="text-sm text-muted">${plan.description}</p></div><span class="badge badge-${plan.difficulty}">${plan.difficulty}</span></div><div class="flex flex-wrap gap-8"><span class="chip">${plan.duration} min</span><span class="chip">${plan.category.replaceAll('_', ' ')}</span><span class="chip">${plan.main.length} main</span></div><p class="text-sm text-muted">${preview}</p><button class="btn btn-primary" data-action="start-plan" data-plan-id="${plan.id}">Start plan</button></article>`;
  }

  renderCustomPlan(plan) {
    const preview = (plan.main || []).slice(0, 4).map((item) => this.ctx.exerciseRepo.getById(item.exerciseId)?.name || item.exerciseId).join(' • ');
    return `<article class="card"><div class="flex flex-between gap-12 mb-8"><div><h3>🛠️ ${plan.name}</h3><p class="text-sm text-muted">${plan.duration || 0} min • ${(plan.main || []).length} exercises</p></div><span class="badge badge-${plan.difficulty || this.ctx.getUser().level}">${plan.difficulty || this.ctx.getUser().level}</span></div><p class="text-sm text-muted mb-16">${preview || 'No exercises added yet.'}</p><div class="flex gap-8 flex-wrap"><button class="btn btn-primary btn-sm" data-action="start-custom" data-workout-id="${plan.id}">Start</button><button class="btn btn-secondary btn-sm" data-action="edit-custom" data-workout-id="${plan.id}">Edit</button><button class="btn btn-danger btn-sm" data-action="delete-custom" data-workout-id="${plan.id}">Delete</button></div></article>`;
  }

  getFilteredPlans() {
    return this.ctx.workoutRepo.filter(this.filters);
  }

  async getCustomWorkouts() {
    const workouts = await this.ctx.db.getAll('customWorkouts');
    return workouts.filter((workout) => workout.profileId === this.ctx.getActiveProfileId()).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
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
      const plan = this.ctx.workoutRepo.getById(button.dataset.planId);
      if (plan) this.ctx.startWorkout.execute(plan, this.ctx.getUser().level);
    }
    if (button.dataset.action === 'open-library') this.ctx.router.navigate('exercises');
    if (button.dataset.action === 'open-custom') {
      this.ctx.customWorkoutView.openEditor();
      this.ctx.router.navigate('custom-workouts');
    }
    if (button.dataset.action === 'open-timers') this.ctx.router.navigate('timers');
    if (button.dataset.action === 'start-custom') {
      const workouts = await this.getCustomWorkouts();
      const workout = workouts.find((entry) => entry.id === button.dataset.workoutId);
      if (workout) this.ctx.startWorkout.execute(workout, this.ctx.getUser().level);
    }
    if (button.dataset.action === 'edit-custom') {
      this.ctx.customWorkoutView.openEditor(button.dataset.workoutId);
      this.ctx.router.navigate('custom-workouts');
    }
    if (button.dataset.action === 'delete-custom') {
      await this.ctx.db.delete('customWorkouts', button.dataset.workoutId);
      this.ctx.bus.emit(Events.CUSTOM_WORKOUTS_CHANGED, {});
    }
  }
}
