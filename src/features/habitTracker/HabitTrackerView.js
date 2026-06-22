const moodOptions = ['😊', '😐', '😟', '😠', '😴'];

export class HabitTrackerView {
  constructor() {
    this.ctx = null;
    this.el = null;
  }

  init(container, deps) {
    this.el = container;
    this.ctx = deps;
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.el.addEventListener('input', (event) => this.handleInput(event));
    this.el.addEventListener('change', (event) => this.handleInput(event));
    this.ctx.bus.on('profile:updated', () => this.render());
  }

  async render() {
    const { habit, weekly, monthly, sleepAvg } = await this.ctx.trackHabit.getTrackerViewModel();

    this.el.innerHTML = `
      <div class="page-title">Habit Tracker</div>
      <p class="page-subtitle">Track water, sleep, steps, nutrition, mood, energy, stress, and your custom daily habits.</p>

      <section class="grid-2">
        <article class="card"><h2>Consistency</h2><div class="stat-value">${weekly}%</div><p class="text-sm text-muted">7-day consistency</p></article>
        <article class="card"><h2>Monthly</h2><div class="stat-value">${monthly}%</div><p class="text-sm text-muted">30-day consistency</p></article>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Water Intake</h2><p class="text-sm text-muted">Tap to fill 8 glasses.</p></div><span class="chip">${habit.water || 0}/8</span></div>
        <div class="water-row">${Array.from({ length: 8 }, (_, index) => `<button class="water-glass ${(habit.water || 0) > index ? 'filled' : ''}" data-action="toggle-water" data-index="${index}"></button>`).join('')}</div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Sleep Tracker</h2><p class="text-sm text-muted">Bedtime, wake time, and 7-day quality trend.</p></div><span class="chip">Avg ${sleepAvg.toFixed(1)}h</span></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Bedtime</label><input class="form-input" type="time" data-field="bedtime" value="${habit.bedtime || ''}"></div>
          <div class="form-group"><label class="form-label">Wake time</label><input class="form-input" type="time" data-field="wakeTime" value="${habit.wakeTime || ''}"></div>
          <div class="form-group"><label class="form-label">Sleep hours</label><input class="form-input" type="number" step="0.1" data-field="sleepHours" value="${habit.sleepHours || ''}"></div>
          <div class="form-group"><label class="form-label">Recommendation</label><div class="chip">${sleepAvg >= 7 ? 'Keep the rhythm' : sleepAvg >= 6 ? 'Aim for +30 min' : 'Recover with earlier sleep'}</div></div>
        </div>
      </section>

      <section class="card">
        <h2>Daily Metrics</h2>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Steps</label><input class="form-input" type="number" data-field="steps" value="${habit.steps || ''}"></div>
          <div class="form-group"><label class="form-label">Protein (g)</label><input class="form-input" type="number" data-field="protein" value="${habit.protein || ''}"></div>
          <div class="form-group"><label class="form-label">Screen time (min)</label><input class="form-input" type="number" data-field="screenTime" value="${habit.screenTime || ''}"></div>
          <div class="form-group"><label class="form-label">Mood</label><div class="mood-row">${moodOptions.map((emoji) => `<button class="mood-chip ${habit.mood === emoji ? 'active' : ''}" data-action="set-mood" data-value="${emoji}">${emoji}</button>`).join('')}</div></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Energy level</label><div class="scale-row">${[1, 2, 3, 4, 5].map((value) => `<button class="scale-chip ${Number(habit.energyLevel || 0) === value ? 'active' : ''}" data-action="set-energy" data-value="${value}">${value}</button>`).join('')}</div></div>
          <div class="form-group"><label class="form-label">Stress level</label><div class="scale-row">${[1, 2, 3, 4, 5].map((value) => `<button class="scale-chip ${Number(habit.stressLevel || 0) === value ? 'active' : ''}" data-action="set-stress" data-value="${value}">${value}</button>`).join('')}</div></div>
        </div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Custom Habits</h2><p class="text-sm text-muted">Create habit checkboxes that matter to your routine.</p></div><button class="btn btn-secondary btn-sm" data-action="open-soreness">Open soreness map</button></div>
        <div class="flex gap-8 mb-16"><input class="form-input" id="custom-habit-input" placeholder="Example: Morning walk"><button class="btn btn-primary btn-sm" data-action="add-custom-habit">Add</button></div>
        ${(habit.customHabits || []).map((item) => `<label class="habit-check"><input type="checkbox" ${item.completed ? 'checked' : ''} data-action="toggle-custom-habit" data-habit-id="${item.id}"><span>${item.label}</span></label>`).join('') || '<p class="text-sm text-muted">No custom habits added yet.</p>'}
      </section>`;
  }

  handleInput(event) {
    const field = event.target.dataset.field;
    if (!field) return;
    const value = event.target.type === 'number' ? Number(event.target.value || 0) : event.target.value;
    this.ctx.trackHabit.updateFields({ [field]: value }).then(() => this.render());
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'toggle-water') {
      this.ctx.trackHabit.toggleWater(Number(button.dataset.index)).then(() => this.render());
    }
    if (button.dataset.action === 'set-mood') this.ctx.trackHabit.updateFields({ mood: button.dataset.value }).then(() => this.render());
    if (button.dataset.action === 'set-energy') this.ctx.trackHabit.updateFields({ energyLevel: Number(button.dataset.value) }).then(() => this.render());
    if (button.dataset.action === 'set-stress') this.ctx.trackHabit.updateFields({ stressLevel: Number(button.dataset.value) }).then(() => this.render());
    if (button.dataset.action === 'add-custom-habit') {
      const input = this.el.querySelector('#custom-habit-input');
      const label = input?.value?.trim();
      if (!label) return;
      this.ctx.trackHabit.addCustomHabit(label).then(() => this.render());
      input.value = '';
    }
    if (button.dataset.action === 'toggle-custom-habit') {
      this.ctx.trackHabit.toggleCustomHabit(button.dataset.habitId).then(() => this.render());
    }
    if (button.dataset.action === 'open-soreness') this.ctx.router.navigate('recovery');
  }
}
