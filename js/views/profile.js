export class ProfileView {
  constructor(bus, profile, storage, container) {
    this.bus = bus;
    this.profile = profile;
    this.storage = storage;
    this.container = container;
    this.exportPayload = '';
    this.container.addEventListener('click', (event) => this.handleClick(event));
    this.container.addEventListener('submit', (event) => this.handleSubmit(event));
    this.bus.on('profile:exported', ({ json }) => {
      this.exportPayload = json;
      this.render();
    });
  }

  render() {
    const profile = this.profile.get();
    const bmi = this.profile.getBMI();
    const derivedLevel = this.profile.getLevel();
    this.container.innerHTML = `
      <section class="card stack">
        <div class="section-header">
          <div>
            <h2>Profile & settings</h2>
            <p class="tiny muted">Everything is saved locally for offline use.</p>
          </div>
          <span class="chip">BMI ${bmi}</span>
        </div>
        <form class="stack" id="profile-form">
          <div class="grid-2">
            <label class="form-group"><span>Name</span><input class="input" name="name" value="${profile.name}"></label>
            <label class="form-group"><span>Age</span><input class="input" type="number" name="age" value="${profile.age}"></label>
            <label class="form-group"><span>Height (cm)</span><input class="input" type="number" name="heightCm" value="${profile.heightCm}"></label>
            <label class="form-group"><span>Weight (kg)</span><input class="input" type="number" name="weightKg" value="${profile.weightKg}"></label>
            <label class="form-group"><span>Goal</span>
              <select class="select" name="goal">
                ${['belly_fat', 'yoga', 'stress', 'strength', 'mobility'].map((goal) => `<option value="${goal}" ${profile.goal === goal ? 'selected' : ''}>${goal.replaceAll('_', ' ')}</option>`).join('')}
              </select>
            </label>
            <label class="form-group"><span>Focus</span>
              <select class="select" name="focus">
                ${['core', 'office', 'yoga', 'upper', 'lower', 'full_body'].map((focus) => `<option value="${focus}" ${profile.focus === focus ? 'selected' : ''}>${focus.replaceAll('_', ' ')}</option>`).join('')}
              </select>
            </label>
            <label class="form-group"><span>Level</span>
              <select class="select" name="level">
                ${['beginner', 'intermediate', 'advanced'].map((level) => `<option value="${level}" ${profile.level === level ? 'selected' : ''}>${level}</option>`).join('')}
              </select>
            </label>
            <label class="form-group"><span>Session minutes</span><input class="input" type="number" name="sessionMinutes" value="${profile.sessionMinutes}"></label>
            <label class="form-group"><span>Water goal</span><input class="input" type="number" name="dailyWaterGoal" value="${profile.dailyWaterGoal}"></label>
            <label class="form-group"><span>Training days/week</span><input class="input" type="number" name="targetDaysPerWeek" value="${profile.targetDaysPerWeek}"></label>
          </div>
          <div class="inline-between">
            <div>
              <p class="small">Voice coach</p>
              <p class="tiny muted">Current adaptive level: ${derivedLevel}</p>
            </div>
            <label class="toggle">
              <input type="checkbox" name="voiceEnabled" ${profile.voiceEnabled ? 'checked' : ''}>
              <span class="toggle__track"></span>
              <span class="toggle__thumb"></span>
            </label>
          </div>
          <button class="btn btn-primary" type="submit">Save profile</button>
        </form>
      </section>

      <section class="card stack">
        <h3>Backup & restore</h3>
        <p class="tiny muted">Export your local data or paste JSON to restore it.</p>
        <textarea class="textarea" id="backup-json" placeholder="Backup JSON appears here...">${this.exportPayload}</textarea>
        <div class="inline-actions">
          <button class="btn btn-ghost" type="button" data-action="export-data">Export</button>
          <button class="btn btn-accent" type="button" data-action="import-data">Import</button>
        </div>
      </section>`;
  }

  handleSubmit(event) {
    if (event.target.id !== 'profile-form') return;
    event.preventDefault();
    const formData = new FormData(event.target);
    this.bus.emit('profile:save', {
      name: formData.get('name'),
      age: Number(formData.get('age')),
      heightCm: Number(formData.get('heightCm')),
      weightKg: Number(formData.get('weightKg')),
      goal: formData.get('goal'),
      focus: formData.get('focus'),
      level: formData.get('level'),
      sessionMinutes: Number(formData.get('sessionMinutes')),
      dailyWaterGoal: Number(formData.get('dailyWaterGoal')),
      targetDaysPerWeek: Number(formData.get('targetDaysPerWeek')),
      voiceEnabled: formData.get('voiceEnabled') === 'on'
    });
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'export-data') {
      this.bus.emit('profile:export');
    }
    if (button.dataset.action === 'import-data') {
      const payload = this.container.querySelector('#backup-json')?.value?.trim();
      if (payload) {
        this.bus.emit('profile:import', { json: payload });
      }
    }
  }
}
