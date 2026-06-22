import { Events } from '../../app/eventBus.js';

export class WorkoutsView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="workouts"]');
    this.filters = { category: 'all', difficulty: 'all' };
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
  }

  render() {
    const plans = this.getFilteredPlans();
    const categories = ['all', ...new Set(this.ctx.workoutRepo.getAll().map((plan) => plan.category))];
    const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

    this.el.innerHTML = `
      <div class="page-title">Workout Plans</div>
      <p class="page-subtitle">Browse your full plan library, filter by category, and jump right into training.</p>

      <section class="card">
        <div class="mb-16">
          <div class="text-sm text-muted mb-8">Categories</div>
          <div class="tabs">${categories.map((category) => `
            <button class="tab ${this.filters.category === category ? 'active' : ''}" data-action="filter-category" data-value="${category}">${category.replaceAll('_', ' ')}</button>`).join('')}</div>
        </div>
        <div>
          <div class="text-sm text-muted mb-8">Difficulty</div>
          <div class="tabs">${difficulties.map((difficulty) => `
            <button class="tab ${this.filters.difficulty === difficulty ? 'active' : ''}" data-action="filter-difficulty" data-value="${difficulty}">${difficulty}</button>`).join('')}</div>
        </div>
      </section>

      <section>
        ${plans.map((plan) => this.renderPlan(plan)).join('') || '<div class="card"><p class="text-sm text-muted">No workouts match your filters yet.</p></div>'}
      </section>`;
  }

  renderPlan(plan) {
    const preview = plan.main.slice(0, 3)
      .map((item) => this.ctx.exerciseRepo.getById(item.exerciseId)?.name || item.exerciseId)
      .join(' • ');

    return `
      <article class="workout-card card">
        <div class="flex flex-between gap-12">
          <div>
            <h2>${plan.icon} ${plan.name}</h2>
            <p class="text-sm text-muted">${plan.description}</p>
          </div>
          <span class="badge badge-${plan.difficulty}">${plan.difficulty}</span>
        </div>
        <div class="flex flex-wrap gap-8">
          <span class="chip">${plan.duration} min</span>
          <span class="chip">${plan.category.replaceAll('_', ' ')}</span>
          <span class="chip">${plan.main.length} main</span>
        </div>
        <p class="text-sm text-muted">${preview}</p>
        <button class="btn btn-primary" data-action="start-plan" data-plan-id="${plan.id}">Start plan</button>
      </article>`;
  }

  getFilteredPlans() {
    return this.ctx.workoutRepo.filter(this.filters);
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    if (button.dataset.action === 'filter-category') {
      this.filters.category = button.dataset.value;
      this.render();
    }

    if (button.dataset.action === 'filter-difficulty') {
      this.filters.difficulty = button.dataset.value;
      this.render();
    }

    if (button.dataset.action === 'start-plan') {
      const user = this.ctx.getUser();
      const plan = this.ctx.workoutRepo.getById(button.dataset.planId);
      if (!plan) return;
      this.ctx.startWorkout.execute(plan, user.level);
    }
  }
}
