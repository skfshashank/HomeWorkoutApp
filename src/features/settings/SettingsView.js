import { Events } from '../../app/eventBus.js';
import { closeAccessibleModal, openAccessibleModal } from '../../core/utils/modalAccessibility.js';

const userStores = ['users', 'profiles', 'sessions', 'measurements', 'habits', 'achievements', 'customWorkouts', 'dailyLogs', 'exerciseMeta', 'lifetimeStats', 'sorenessLogs', 'monthlyChallenges'];
const formatWeight = (user, units) => units === 'imperial' ? `${(user.weight * 2.20462).toFixed(1)} lb` : `${user.weight} kg`;
const formatHeight = (user, units) => units === 'imperial' ? `${(user.height / 2.54).toFixed(1)} in` : `${user.height} cm`;

export class SettingsView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="settings"]');
    this.modal = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');
    this.modalCleanup = null;
    this.lastFocusedElement = null;
    this.modalDismissHandler = null;

    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.el.addEventListener('change', (event) => this.handleChange(event));
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
  }

  async render() {
    const user = this.ctx.updateProfile.getUser();
    const profiles = await this.ctx.updateProfile.getProfiles();
    const {
      units,
      soundEnabled,
      voiceEnabled,
      theme,
      reminderConfig
    } = this.ctx.updateProfile.getSettings();
    const reminderTime = `${String(reminderConfig.hour).padStart(2, '0')}:${String(reminderConfig.minute).padStart(2, '0')}`;

    this.el.innerHTML = `
      <div class="page-title">Settings</div>
      <p class="page-subtitle">Manage profiles, audio options, local backups, and storage.</p>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>${user.avatar} ${user.name || 'OpenFit Athlete'}</h2>
            <p class="text-sm text-muted">${user.goal.replaceAll('_', ' ')} • ${user.focusArea.replaceAll('_', ' ')} focus • ${user.level}</p>
          </div>
          <button class="btn btn-primary btn-sm" data-action="edit-profile" data-profile-id="${user.id}">Edit</button>
        </div>
        <div class="setting-row"><span class="setting-label">Age</span><span class="setting-value">${user.age}</span></div>
        <div class="setting-row"><span class="setting-label">Height</span><span class="setting-value">${formatHeight(user, units)}</span></div>
        <div class="setting-row"><span class="setting-label">Weight</span><span class="setting-value">${formatWeight(user, units)}</span></div>
        <div class="setting-row"><span class="setting-label">Daily target</span><span class="setting-value">${user.dailyMinutes} min</span></div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>Profiles</h2>
            <p class="text-sm text-muted">Switching profiles swaps workout history, habits, measurements, and achievements.</p>
          </div>
          <button class="btn btn-primary btn-sm" data-action="add-profile">Add Profile</button>
        </div>
        ${profiles.map((profile) => `
          <div class="profile-switcher ${profile.id === user.id ? 'active' : ''}">
            <div>
              <strong>${profile.avatar} ${profile.name || 'Unnamed profile'}</strong>
              <p class="text-sm text-muted">${profile.goal.replaceAll('_', ' ')} • ${profile.level}</p>
            </div>
            <div class="flex gap-8 flex-wrap">
              ${profile.id !== user.id ? `<button class="btn btn-secondary btn-sm" data-action="switch-profile" data-profile-id="${profile.id}">Switch</button>` : '<span class="chip">Active</span>'}
              <button class="btn btn-secondary btn-sm" data-action="edit-profile" data-profile-id="${profile.id}">Edit</button>
              ${profiles.length > 1 ? `<button class="btn btn-danger btn-sm" data-action="delete-profile" data-profile-id="${profile.id}">Delete</button>` : ''}
            </div>
          </div>`).join('')}
      </section>

      <section class="card">
        <div class="setting-row"><div><div class="setting-label">Sound</div><div class="setting-value">Workout beeps and completion tones</div></div><label class="toggle"><input type="checkbox" data-action="toggle-sound" ${soundEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
        <div class="setting-row"><div><div class="setting-label">Voice Coach</div><div class="setting-value">Exercise prompts and rest guidance</div></div><label class="toggle"><input type="checkbox" data-action="toggle-voice" ${voiceEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
        <div class="setting-row"><div><div class="setting-label">Dark mode</div><div class="setting-value">${theme === 'dark' ? 'High-contrast dark theme' : 'Bright light theme'}</div></div><label class="toggle"><input type="checkbox" data-action="toggle-theme" ${theme === 'dark' ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
        <div class="setting-row"><div><div class="setting-label">Units</div><div class="setting-value">Choose how height and weight are displayed</div></div><div class="flex gap-8"><button class="chip ${units === 'metric' ? 'active' : ''}" data-action="units" data-value="metric">Metric</button><button class="chip ${units === 'imperial' ? 'active' : ''}" data-action="units" data-value="imperial">Imperial</button></div></div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>Workout Reminder</h2>
            <p class="text-sm text-muted">Shows when you open the app after your reminder time and have not finished today's workout.</p>
          </div>
          <label class="toggle"><input type="checkbox" data-action="toggle-reminder" ${reminderConfig.enabled ? 'checked' : ''} ${!this.ctx.notifications?.isAvailable ? 'disabled' : ''}><span class="toggle-slider"></span></label>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Reminder time</label>
            <input class="form-input" type="time" data-action="reminder-time" value="${reminderTime}" ${reminderConfig.enabled && this.ctx.notifications?.isAvailable ? '' : 'disabled'}>
          </div>
          <div class="form-group">
            <label class="form-label">Message preview</label>
            <div class="setting-hint">Time for your workout! 💪 Your ${user.goal.replaceAll('_', ' ')} routine is waiting.</div>
          </div>
        </div>
        <p class="text-sm text-muted">${this.ctx.notifications?.isAvailable ? 'Browser notification permission is requested when you enable reminders.' : 'This browser does not support local notifications.'}</p>
      </section>

      <section class="card"><button class="btn btn-secondary w-full mb-16" data-action="export-backup">Export backup</button><button class="btn btn-secondary w-full mb-16" data-action="import-backup">Import backup</button><input type="file" id="backup-file-input" accept="application/json" class="hidden"><button class="btn btn-danger w-full" data-action="reset-data">Reset all local data</button></section>
      <section class="card"><div class="setting-row"><span class="setting-label">App version</span><span class="setting-value">OpenFit Local v2</span></div><div class="setting-row"><span class="setting-label">Storage</span><span class="setting-value">Offline-first browser storage</span></div></section>`;
  }

  async handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'edit-profile') this.openProfileEditor(button.dataset.profileId);
    if (button.dataset.action === 'add-profile') this.openProfileEditor();
    if (button.dataset.action === 'switch-profile') await this.ctx.updateProfile.switchProfile(button.dataset.profileId);
    if (button.dataset.action === 'delete-profile') await this.deleteProfile(button.dataset.profileId);
    if (button.dataset.action === 'units') {
      this.ctx.updateProfile.setUnits(button.dataset.value);
      this.render();
    }
    if (button.dataset.action === 'export-backup') this.ctx.backup.exportToJSON();
    if (button.dataset.action === 'import-backup') this.el.querySelector('#backup-file-input')?.click();
    if (button.dataset.action === 'reset-data') this.resetData();
  }

  handleChange(event) {
    const action = event.target.dataset.action;
    if (action === 'toggle-sound') {
      this.ctx.updateProfile.setPreference('soundEnabled', event.target.checked);
      this.ctx.audio.setEnabled(event.target.checked);
      this.render();
    }
    if (action === 'toggle-voice') {
      this.ctx.updateProfile.setPreference('voiceEnabled', event.target.checked);
      this.ctx.speech.setEnabled(event.target.checked);
      this.render();
    }
    if (action === 'toggle-theme') {
      const theme = event.target.checked ? 'dark' : 'light';
      this.ctx.updateProfile.setTheme(theme);
      this.ctx.applyTheme?.(theme);
      this.render();
    }
    if (action === 'toggle-reminder') {
      const current = this.ctx.updateProfile.getReminderConfig();
      this.ctx.updateProfile.setReminderConfig({ ...current, enabled: event.target.checked });
      if (event.target.checked) {
        this.ctx.notifications?.requestPermission().catch(() => false);
      }
      this.render();
    }
    if (action === 'reminder-time') {
      const [hour = '7', minute = '0'] = String(event.target.value || '07:00').split(':');
      const current = this.ctx.updateProfile.getReminderConfig();
      this.ctx.updateProfile.setReminderConfig({
        ...current,
        hour: Number(hour),
        minute: Number(minute)
      });
      this.render();
    }
    if (event.target.id === 'backup-file-input') this.importBackup(event.target.files?.[0]);
  }

  async openProfileEditor(profileId = '') {
    const existing = await this.ctx.updateProfile.getProfileDraft(profileId);
    this.closeModal();
    openAccessibleModal(this, `
      <h2 class="mb-16" id="modal-title">${profileId ? 'Edit profile' : 'Add profile'}</h2>
      <form id="profile-form">
        <div class="grid-2"><div class="form-group"><label class="form-label">Avatar emoji</label><input class="form-input" name="avatar" value="${existing.avatar || '🙂'}"></div><div class="form-group"><label class="form-label">Name</label><input class="form-input" name="name" value="${existing.name || ''}"></div></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">Age</label><input class="form-input" name="age" type="number" value="${existing.age || 25}"></div><div class="form-group"><label class="form-label">Gender</label><select class="form-input form-select" name="gender"><option value="" ${!existing.gender ? 'selected' : ''}>Prefer not to say</option><option value="male" ${existing.gender === 'male' ? 'selected' : ''}>Male</option><option value="female" ${existing.gender === 'female' ? 'selected' : ''}>Female</option></select></div></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">Height (cm)</label><input class="form-input" name="height" type="number" value="${existing.height || 170}"></div><div class="form-group"><label class="form-label">Weight (kg)</label><input class="form-input" name="weight" type="number" step="0.1" value="${existing.weight || 70}"></div></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">Goal</label><select class="form-input form-select" name="goal"><option value="fat_loss" ${existing.goal === 'fat_loss' ? 'selected' : ''}>Fat loss</option><option value="strength" ${existing.goal === 'strength' ? 'selected' : ''}>Strength</option><option value="flexibility" ${existing.goal === 'flexibility' ? 'selected' : ''}>Flexibility</option><option value="stress_relief" ${existing.goal === 'stress_relief' ? 'selected' : ''}>Stress relief</option></select></div><div class="form-group"><label class="form-label">Focus</label><select class="form-input form-select" name="focusArea"><option value="core" ${existing.focusArea === 'core' ? 'selected' : ''}>Core</option><option value="full_body" ${existing.focusArea === 'full_body' ? 'selected' : ''}>Full body</option><option value="upper" ${existing.focusArea === 'upper' ? 'selected' : ''}>Upper body</option><option value="lower" ${existing.focusArea === 'lower' ? 'selected' : ''}>Lower body</option></select></div></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">Level</label><select class="form-input form-select" name="level"><option value="beginner" ${existing.level === 'beginner' ? 'selected' : ''}>Beginner</option><option value="intermediate" ${existing.level === 'intermediate' ? 'selected' : ''}>Intermediate</option><option value="advanced" ${existing.level === 'advanced' ? 'selected' : ''}>Advanced</option></select></div><div class="form-group"><label class="form-label">Daily Minutes</label><input class="form-input" name="dailyMinutes" type="number" value="${existing.dailyMinutes || 30}"></div></div>
        <div class="grid-2 mt-24"><button type="button" class="btn btn-secondary" data-close-profile="true">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
      </form>`, async (event) => {
      if (event.type === 'click' && event.target.closest('[data-close-profile]')) {
        this.closeModal();
        return;
      }

      const form = event.target.closest('#profile-form');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      await this.ctx.updateProfile.saveProfileDraft(profileId, {
        avatar: data.get('avatar'),
        name: data.get('name'),
        age: data.get('age'),
        gender: data.get('gender'),
        height: data.get('height'),
        weight: data.get('weight'),
        goal: data.get('goal'),
        focusArea: data.get('focusArea'),
        level: data.get('level'),
        dailyMinutes: data.get('dailyMinutes')
      }, { setActive: true });
      this.closeModal();
    });
  }

  async deleteProfile(profileId) {
    if (!window.confirm('Delete this profile from the active switcher?')) return;
    try {
      await this.ctx.updateProfile.deleteProfile(profileId);
      this.render();
    } catch (error) {
      window.alert(error.message);
    }
  }

  async importBackup(file) {
    if (!file) return;
    try {
      await this.ctx.backup.importFromJSON(file);
      await this.ctx.updateProfile.initProfiles();
      this.render();
      window.alert('Backup imported successfully.');
    } catch (error) {
      window.alert(`Import failed: ${error.message}`);
    }
  }

  async resetData() {
    if (!window.confirm('Reset all OpenFit Local data on this device?')) return;
    await this.ctx.updateProfile.resetAllData(userStores);
    window.location.reload();
  }

  closeModal(options = {}) {
    closeAccessibleModal(this, options);
  }
}
