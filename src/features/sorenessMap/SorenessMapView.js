const colorFor = (value) => ['#1f2937', '#22c55e', '#fbbf24', '#fb923c', '#f87171'][value + 1] || '#1f2937';
const groups = ['chest', 'shoulders', 'arms', 'core', 'quads', 'calves', 'back', 'glutes', 'hamstrings'];

export class SorenessMapView {
  constructor() {
    this.ctx = null;
    this.el = null;
  }

  init(container, deps) {
    this.el = container;
    this.ctx = deps;
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on('profile:updated', () => this.render());
    this.ctx.bus.on('habit:saved', () => this.render());
  }

  async render() {
    const viewModel = await this.ctx.trackSoreness.getViewModel();
    const soreness = viewModel.soreness;

    this.el.innerHTML = `
      <div class="page-title">Muscle Soreness Map</div>
      <p class="page-subtitle">Tap each area to cycle soreness from none → mild → moderate → severe.</p>
      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Recovery score</h2><p class="text-sm text-muted">Sleep + soreness + energy feed recovery guidance.</p></div><span class="chip" style="background:${viewModel.recommendation.color}22;color:${viewModel.recommendation.color};">${viewModel.recommendation.label}</span></div>
        <div class="stat-value">${viewModel.score}</div>
      </section>
      <section class="card soreness-map-card">
        <svg viewBox="0 0 240 360" class="soreness-svg">
          <text x="55" y="24" fill="#94a3b8">Front</text><text x="170" y="24" fill="#94a3b8">Back</text>
          ${this.renderBody(50, soreness.ratings || {})}
          ${this.renderBody(150, soreness.ratings || {}, true)}
        </svg>
        <p class="text-sm text-muted mt-16">Active avoid-list: ${viewModel.avoid.length ? viewModel.avoid.join(', ') : 'None'}</p>
      </section>
      <section class="card"><h2>Recovery-friendly suggestions</h2><div class="exercise-chip-row">${viewModel.suggestions.map((exercise) => `<span class="chip">${exercise.emoji} ${exercise.name}</span>`).join('')}</div></section>`;
  }

  renderBody(offsetX, ratings, isBack = false) {
    return groups.map((group) => {
      const positions = {
        chest: [offsetX + 30, 50], shoulders: [offsetX + 30, 80], arms: [offsetX + 10, 120], core: [offsetX + 30, 135], quads: [offsetX + 25, 210], calves: [offsetX + 25, 290], back: [offsetX + 30, 120], glutes: [offsetX + 30, 175], hamstrings: [offsetX + 25, 250]
      };
      const backOnly = ['back', 'glutes', 'hamstrings'];
      const frontOnly = ['chest', 'core', 'quads', 'calves', 'shoulders', 'arms'];
      if (isBack && frontOnly.includes(group)) return '';
      if (!isBack && backOnly.includes(group)) return '';
      const [x, y] = positions[group];
      const value = Number(ratings[group] || 0);
      return `<g data-action="cycle-soreness" data-group="${group}"><rect x="${x}" y="${y}" rx="16" ry="16" width="42" height="30" fill="${colorFor(value)}" opacity="0.9"></rect><text x="${x + 21}" y="${y + 19}" text-anchor="middle" fill="#fff" font-size="10">${group.slice(0, 4)}</text></g>`;
    }).join('');
  }

  async handleClick(event) {
    const target = event.target.closest('[data-action="cycle-soreness"]');
    if (!target) return;
    await this.ctx.trackSoreness.cycleGroup(target.dataset.group);
    this.render();
  }
}
