import { Events } from '../../app/eventBus.js';
import { User } from '../../domain/entities/User.js';

const userStores = ['users', 'sessions', 'measurements', 'habits', 'achievements', 'customWorkouts', 'dailyLogs'];
const formatWeight = (user, units) => units === 'imperial' ? `${(user.weight * 2.20462).toFixed(1)} lb` : `${user.weight} kg`;
const formatHeight = (user, units) => units === 'imperial' ? `${(user.height / 2.54).toFixed(1)} in` : `${user.height} cm`;

export class SettingsView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="settings"]');
    this.modal = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');
    this.modalCleanup = null;

    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.el.addEventListener('change', (event) => this.handleChange(event));
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
  }

  render() {
    const user = this.ctx.getUser();
    const units = this.ctx.prefs.get('units', 'metric');
    const soundEnabled = this.ctx.prefs.get('soundEnabled', true);
    const voiceEnabled = this.ctx.prefs.get('voiceEnabled', true);

    this.el.innerHTML = `
      <div class="page-title">Settings</div>
      <p class="page-subtitle">Manage your profile, feedback options, and local backup controls.</p>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>${user.name || 'OpenFit Athlete'}</h2>
            <p class="text-sm text-muted">${user.goal.replaceAll('_', ' ')} • ${user.focusArea.replaceAll('_', ' ')} focus • ${user.level}</p>
          </div>
          <button class="btn btn-primary btn-sm" data-action="edit-profile">Edit</button>
        </div>
        <div class="setting-row"><span class="setting-label">Age</span><span class="setting-value">${user.age}</span></div>
        <div class="setting-row"><span class="setting-label">Height</span><span class="setting-value">${formatHeight(user, units)}</span></div>
        <div class="setting-row"><span class="setting-label">Weight</span><span class="setting-value">${formatWeight(user, units)}</span></div>
        <div class="setting-row"><span class="setting-label">Daily target</span><span class="setting-value">${user.dailyMinutes} min</span></div>
      </section>

      <section class="card">
        <div class="setting-row">
          <div>
            <div class="setting-label">Sound</div>
            <div class="setting-value">Workout beeps and completion tones</div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-action="toggle-sound" ${soundEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Voice Coach</div>
            <div class="setting-value">Exercise prompts and rest guidance</div>
          </div>
          <label class="toggle">
            <input type="checkbox" data-action="toggle-voice" ${voiceEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">Units</div>
            <div class="setting-value">Choose how height and weight are displayed</div>
          </div>
          <div class="flex gap-8">
            <button class="chip ${units === 'metric' ? 'active' : ''}" data-action="units" data-value="metric">Metric</button>
            <button class="chip ${units === 'imperial' ? 'active' : ''}" data-action="units" data-value="imperial">Imperial</button>
          </div>
        </div>
      </section>

      <section class="card">
        <button class="btn btn-secondary w-full mb-16" data-action="export-backup">Export backup</button>
        <button class="btn btn-secondary w-full mb-16" data-action="import-backup">Import backup</button>
        <input type="file" id="backup-file-input" accept="application/json" class="hidden">
        <button class="btn btn-danger w-full" data-action="reset-data">Reset all local data</button>
      </section>

      <section class="card">
        <div class="setting-row"><span class="setting-label">App version</span><span class="setting-value">OpenFit Local v1</span></div>
        <div class="setting-row"><span class="setting-label">Storage</span><span class="setting-value">Offline-first browser storage</span></div>
      </section>`;
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    if (button.dataset.action === 'edit-profile') this.openProfileEditor();
    if (button.dataset.action === 'units') {
      this.ctx.prefs.set('units', button.dataset.value);
      this.render();
    }
    if (button.dataset.action === 'export-backup') this.ctx.backup.exportToJSON();
    if (button.dataset.action === 'import-backup') this.el.querySelector('#backup-file-input')?.click();
    if (button.dataset.action === 'reset-data') this.resetData();
  }

  handleChange(event) {
    const action = event.target.dataset.action;
    if (action === 'toggle-sound') {
      this.ctx.prefs.set('soundEnabled', event.target.checked);
      this.ctx.audio.setEnabled(event.target.checked);
      this.render();
    }
    if (action === 'toggle-voice') {
      this.ctx.prefs.set('voiceEnabled', event.target.checked);
      this.ctx.speech.setEnabled(event.target.checked);
      this.render();
    }
    if (event.target.id === 'backup-file-input') this.importBackup(event.target.files?.[0]);
  }

  openProfileEditor() {
    const user = this.ctx.getUser();
    this.closeModal();
    this.modalContent.innerHTML = `
      <h2 class="mb-16">Edit profile</h2>
      <form id="profile-form">
        <div class="form-group"><label class="form-label">Name</label><input class="form-input" name="name" value="${user.name}"></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Age</label><input class="form-input" name="age" type="number" value="${user.age}"></div>
          <div class="form-group"><label class="form-label">Gender</label><select class="form-input form-select" name="gender"><option value="" ${!user.gender ? 'selected' : ''}>Prefer not to say</option><option value="male" ${user.gender === 'male' ? 'selected' : ''}>Male</option><option value="female" ${user.gender === 'female' ? 'selected' : ''}>Female</option></select></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Height (cm)</label><input class="form-input" name="height" type="number" value="${user.height}"></div>
          <div class="form-group"><label class="form-label">Weight (kg)</label><input class="form-input" name="weight" type="number" step="0.1" value="${user.weight}"></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Goal</label><select class="form-input form-select" name="goal"><option value="fat_loss" ${user.goal === 'fat_loss' ? 'selected' : ''}>Fat loss</option><option value="strength" ${user.goal === 'strength' ? 'selected' : ''}>Strength</option><option value="flexibility" ${user.goal === 'flexibility' ? 'selected' : ''}>Flexibility</option><option value="stress_relief" ${user.goal === 'stress_relief' ? 'selected' : ''}>Stress relief</option></select></div>
          <div class="form-group"><label class="form-label">Focus</label><select class="form-input form-select" name="focusArea"><option value="core" ${user.focusArea === 'core' ? 'selected' : ''}>Core</option><option value="full_body" ${user.focusArea === 'full_body' ? 'selected' : ''}>Full body</option><option value="upper" ${user.focusArea === 'upper' ? 'selected' : ''}>Upper body</option><option value="lower" ${user.focusArea === 'lower' ? 'selected' : ''}>Lower body</option></select></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Level</label><select class="form-input form-select" name="level"><option value="beginner" ${user.level === 'beginner' ? 'selected' : ''}>Beginner</option><option value="intermediate" ${user.level === 'intermediate' ? 'selected' : ''}>Intermediate</option><option value="advanced" ${user.level === 'advanced' ? 'selected' : ''}>Advanced</option></select></div>
          <div class="form-group"><label class="form-label">Daily Minutes</label><input class="form-input" name="dailyMinutes" type="number" value="${user.dailyMinutes}"></div>
        </div>
        <div class="grid-2 mt-24">
          <button type="button" class="btn btn-secondary" data-close-profile="true">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>`;
    this.modal.classList.add('active');
    this.modalCleanup = (event) => {
      if (event.type === 'click' && (event.target === this.modal || event.target.closest('[data-close-profile]'))) {
        this.closeModal();
        return;
      }
      const form = event.target.closest('#profile-form');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      const next = new User({
        ...user,
        name: data.get('name') || '',
        age: Number(data.get('age')) || user.age,
        gender: data.get('gender') || '',
        height: Number(data.get('height')) || user.height,
        weight: Number(data.get('weight')) || user.weight,
        goal: data.get('goal') || user.goal,
        focusArea: data.get('focusArea') || user.focusArea,
        level: data.get('level') || user.level,
        dailyMinutes: Number(data.get('dailyMinutes')) || user.dailyMinutes
      });
      this.ctx.prefs.set('user', next);
      this.ctx.bus.emit(Events.PROFILE_UPDATED, next);
      this.closeModal();
    };
    this.modal.addEventListener('click', this.modalCleanup);
    this.modal.addEventListener('submit', this.modalCleanup);
  }

  async importBackup(file) {
    if (!file) return;
    try {
      await this.ctx.backup.importFromJSON(file);
      const restoredUser = this.ctx.prefs.get('user');
      if (restoredUser) this.ctx.bus.emit(Events.PROFILE_UPDATED, restoredUser);
      this.render();
      alert('Backup imported successfully.');
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  }

  async resetData() {
    if (!confirm('Reset all OpenFit Local data on this device?')) return;
    await Promise.all(userStores.map((store) => this.ctx.db.clear(store)));
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('openfit_')) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    location.reload();
  }

  closeModal() {
    if (this.modalCleanup) {
      this.modal.removeEventListener('click', this.modalCleanup);
      this.modal.removeEventListener('submit', this.modalCleanup);
      this.modalCleanup = null;
    }
    this.modal.classList.remove('active');
    this.modalContent.innerHTML = '';
  }
}
