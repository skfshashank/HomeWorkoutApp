import { getProfileRecords, getScopedDailyRecord, todayKey } from '../../core/storage/profileData.js';

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
    const soreness = await getScopedDailyRecord(this.ctx.db, 'sorenessLogs', this.ctx.getActiveProfileId(), todayKey(), { ratings: {} });
    const habit = await getScopedDailyRecord(this.ctx.db, 'habits', this.ctx.getActiveProfileId(), todayKey(), { customHabits: [] });
    const activeGroups = Object.entries(soreness.ratings || {}).filter(([, value]) => Number(value) > 0).map(([group]) => group);
    const score = await this.ctx.recovery.calculateScore({
      sleep: Number(habit.sleepHours || 0),
      energy: Number(habit.energyLevel || 0) >= 4 ? 'high' : Number(habit.energyLevel || 0) <= 2 ? 'low' : 'medium',
      mood: habit.mood === '😊' ? 'great' : habit.mood === '😟' || habit.mood === '😠' ? 'bad' : 'okay',
      soreness: activeGroups
    });
    const recommendation = this.ctx.recovery.getRecommendation(score);
    const avoid = this.ctx.recovery.getMusclestoAvoid(activeGroups);
    const suggestions = this.ctx.exerciseRepo.getAll().filter((exercise) => !exercise.muscles.some((muscle) => avoid.includes(muscle))).slice(0, 6);

    this.el.innerHTML = `
      <div class="page-title">Muscle Soreness Map</div>
      <p class="page-subtitle">Tap each area to cycle soreness from none → mild → moderate → severe.</p>
      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Recovery score</h2><p class="text-sm text-muted">Sleep + soreness + energy feed recovery guidance.</p></div><span class="chip" style="background:${recommendation.color}22;color:${recommendation.color};">${recommendation.label}</span></div>
        <div class="stat-value">${score}</div>
      </section>
      <section class="card soreness-map-card">
        <svg viewBox="0 0 240 360" class="soreness-svg">
          <text x="55" y="24" fill="#94a3b8">Front</text><text x="170" y="24" fill="#94a3b8">Back</text>
          ${this.renderBody(50, soreness.ratings || {})}
          ${this.renderBody(150, soreness.ratings || {}, true)}
        </svg>
        <p class="text-sm text-muted mt-16">Active avoid-list: ${avoid.length ? avoid.join(', ') : 'None'}</p>
      </section>
      <section class="card"><h2>Recovery-friendly suggestions</h2><div class="exercise-chip-row">${suggestions.map((exercise) => `<span class="chip">${exercise.emoji} ${exercise.name}</span>`).join('')}</div></section>`;
  }

  renderBody(offsetX, ratings, isBack = false) {
    return groups.map((group, index) => {
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
    const log = await getScopedDailyRecord(this.ctx.db, 'sorenessLogs', this.ctx.getActiveProfileId(), todayKey(), { ratings: {} });
    const group = target.dataset.group;
    const current = Number(log.ratings?.[group] || 0);
    log.ratings = log.ratings || {};
    log.ratings[group] = (current + 1) % 4;
    await this.ctx.db.put('sorenessLogs', log);
    this.render();
  }
}
