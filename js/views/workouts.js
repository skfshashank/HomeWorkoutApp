export class WorkoutsView {
  constructor(bus, plans, exercises, container) {
    this.bus = bus;
    this.plans = plans;
    this.exercises = exercises;
    this.container = container;
    this.filters = { category: 'all', difficulty: 'all' };
    this.container.addEventListener('click', (event) => this.handleClick(event));
  }

  get filteredPlans() {
    return this.plans.filter((plan) => (this.filters.category === 'all' || plan.category === this.filters.category)
      && (this.filters.difficulty === 'all' || plan.difficulty === this.filters.difficulty));
  }

  planCard(plan) {
    return `
      <article class="workout-card transition-pop">
        <div class="workout-card__top">
          <div>
            <h4>${plan.icon} ${plan.name}</h4>
            <p class="small muted">${plan.description}</p>
          </div>
          <span class="badge badge-${plan.difficulty}">${plan.difficulty}</span>
        </div>
        <div class="cluster">
          <span class="chip">${plan.duration} min</span>
          <span class="chip">${plan.main.length} main</span>
          <span class="chip">${plan.category.replaceAll('_', ' ')}</span>
        </div>
        <div class="tiny muted">Warm-up: ${plan.warmUp.map((id) => this.exercises[id]?.name || id).join(', ')}</div>
        <div class="inline-actions">
          <button class="btn btn-primary" type="button" data-action="start-plan" data-plan-id="${plan.id}">Start plan</button>
        </div>
      </article>`;
  }

  render() {
    const categories = ['all', ...new Set(this.plans.map((plan) => plan.category))];
    const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];
    this.container.innerHTML = `
      <section class="card stack">
        <div class="section-header">
          <div>
            <h2>Workout Library</h2>
            <p class="tiny muted">Modular plans for belly fat, yoga, office mobility, and quick sweat.</p>
          </div>
          <span class="chip">${this.filteredPlans.length} plans</span>
        </div>
        <div class="stack">
          <div>
            <p class="tiny muted">Category</p>
            <div class="cluster">${categories.map((category) => `<button class="tab ${this.filters.category === category ? 'is-active' : ''}" type="button" data-action="filter-category" data-value="${category}">${category.replaceAll('_', ' ')}</button>`).join('')}</div>
          </div>
          <div>
            <p class="tiny muted">Difficulty</p>
            <div class="cluster">${difficulties.map((difficulty) => `<button class="tab ${this.filters.difficulty === difficulty ? 'is-active' : ''}" type="button" data-action="filter-difficulty" data-value="${difficulty}">${difficulty}</button>`).join('')}</div>
          </div>
        </div>
      </section>
      <section class="plan-grid">
        ${this.filteredPlans.map((plan) => this.planCard(plan)).join('')}
      </section>`;
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, value, planId } = button.dataset;
    if (action === 'filter-category') {
      this.filters.category = value;
      this.render();
    }
    if (action === 'filter-difficulty') {
      this.filters.difficulty = value;
      this.render();
    }
    if (action === 'start-plan') {
      this.bus.emit('workout:start', { source: 'workouts', planId });
    }
  }
}
