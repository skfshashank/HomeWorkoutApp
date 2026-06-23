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
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => {
      // Don't re-render if a modal is open (would destroy it)
      if (this.modalCleanup) return;
      this.render();
    });
  }

  t(key, fallback = key) {
    return this.ctx.i18n?.t(key) || fallback;
  }

  format(key, values, fallback) {
    return this.ctx.i18n?.format?.(key, values) || fallback;
  }

  translateValue(value, fallback = '') {
    return this.ctx.i18n?.translateValue?.(value) || fallback || String(value || '');
  }

  async render() {
    const user = this.ctx.updateProfile.getUser();
    const profiles = await this.ctx.updateProfile.getProfiles();
    const settings = this.ctx.updateProfile.getSettings();
    const reminderConfig = settings.reminderConfig;
    const reminderTime = `${String(reminderConfig.hour).padStart(2, '0')}:${String(reminderConfig.minute).padStart(2, '0')}`;

    this.el.innerHTML = `
      <div class="page-title">${this.t('settings', 'Settings')}</div>
      <p class="page-subtitle">${this.t('settings_manage_subtitle', 'Manage profiles, audio options, local backups, and storage.')}</p>
      ${this.renderProfileSection(user, profiles, settings.units)}
      ${this.renderPreferencesSection(settings, reminderTime, user)}
      ${this.renderDataSection()}`;
  }

  renderProfileSection(user, profiles, units) {
    return `
      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>${user.avatar} ${user.name || 'OpenFit Athlete'}</h2>
            <p class="text-sm text-muted">${this.translateValue(user.goal, user.goal.replaceAll('_', ' '))} • ${this.translateValue(user.focusArea, user.focusArea.replaceAll('_', ' '))} • ${this.translateValue(user.level, user.level)}</p>
          </div>
          <button class="btn btn-primary btn-sm" data-action="edit-profile" data-profile-id="${user.id}">${this.t('edit', 'Edit')}</button>
        </div>
        <div class="setting-row"><span class="setting-label">${this.t('age', 'Age')}</span><span class="setting-value">${user.age}</span></div>
        <div class="setting-row"><span class="setting-label">${this.t('height', 'Height')}</span><span class="setting-value">${formatHeight(user, units)}</span></div>
        <div class="setting-row"><span class="setting-label">${this.t('weight', 'Weight')}</span><span class="setting-value">${formatWeight(user, units)}</span></div>
        <div class="setting-row"><span class="setting-label">${this.t('daily_target', 'Daily target')}</span><span class="setting-value">${user.dailyMinutes} min</span></div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>${this.t('profiles', 'Profiles')}</h2>
            <p class="text-sm text-muted">${this.t('profiles_subtitle', 'Switching profiles swaps workout history, habits, measurements, and achievements.')}</p>
          </div>
          <button class="btn btn-primary btn-sm" data-action="add-profile">${this.t('add_profile', 'Add Profile')}</button>
        </div>
        ${profiles.map((profile) => `
          <div class="profile-switcher ${profile.id === user.id ? 'active' : ''}">
            <div>
              <strong>${profile.avatar} ${profile.name || this.t('unnamed_profile', 'Unnamed profile')}</strong>
              <p class="text-sm text-muted">${this.translateValue(profile.goal, profile.goal.replaceAll('_', ' '))} • ${this.translateValue(profile.level, profile.level)}</p>
            </div>
            <div class="flex gap-8 flex-wrap">
              ${profile.id !== user.id ? `<button class="btn btn-secondary btn-sm" data-action="switch-profile" data-profile-id="${profile.id}">${this.t('switch', 'Switch')}</button>` : `<span class="chip">${this.t('active', 'Active')}</span>`}
              <button class="btn btn-secondary btn-sm" data-action="edit-profile" data-profile-id="${profile.id}">${this.t('edit', 'Edit')}</button>
              ${profiles.length > 1 ? `<button class="btn btn-danger btn-sm" data-action="delete-profile" data-profile-id="${profile.id}">${this.t('delete', 'Delete')}</button>` : ''}
            </div>
          </div>`).join('')}
      </section>`;
  }

  renderPreferencesSection(settings, reminderTime, user) {
    const {
      language,
      units,
      soundEnabled,
      voiceEnabled,
      theme,
      reminderConfig
    } = settings;

    return `
      <section class="card">
        <div class="setting-row"><div><div class="setting-label">${this.t('language', 'Language')}</div><div class="setting-value">${language === 'hi' ? this.t('hindi', 'हिंदी') : this.t('english', 'English')}</div></div><div class="flex gap-8"><button class="chip ${language === 'en' ? 'active' : ''}" data-action="language" data-value="en">${this.t('english', 'English')}</button><button class="chip ${language === 'hi' ? 'active' : ''}" data-action="language" data-value="hi">${this.t('hindi', 'हिंदी')}</button></div></div>
        <div class="setting-row"><div><div class="setting-label">${this.t('sound', 'Sound')}</div><div class="setting-value">${this.t('sound_description', 'Workout beeps and completion tones')}</div></div><label class="toggle"><input type="checkbox" data-action="toggle-sound" ${soundEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
        <div class="setting-row"><div><div class="setting-label">${this.t('voice_coach', 'Voice Coach')}</div><div class="setting-value">${this.t('voice_description', 'Exercise prompts and rest guidance')}</div></div><label class="toggle"><input type="checkbox" data-action="toggle-voice" ${voiceEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
        <div class="setting-row"><div><div class="setting-label">${this.t('dark_mode', 'Dark mode')}</div><div class="setting-value">${theme === 'dark' ? this.t('dark_theme_description', 'High-contrast dark theme') : this.t('light_theme_description', 'Bright light theme')}</div></div><label class="toggle"><input type="checkbox" data-action="toggle-theme" ${theme === 'dark' ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
        <div class="setting-row"><div><div class="setting-label">${this.t('units', 'Units')}</div><div class="setting-value">${this.t('units_description', 'Choose how height and weight are displayed')}</div></div><div class="flex gap-8"><button class="chip ${units === 'metric' ? 'active' : ''}" data-action="units" data-value="metric">${this.t('metric', 'Metric')}</button><button class="chip ${units === 'imperial' ? 'active' : ''}" data-action="units" data-value="imperial">${this.t('imperial', 'Imperial')}</button></div></div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>${this.t('workout_reminder', 'Workout Reminder')}</h2>
            <p class="text-sm text-muted">${this.t('reminder_subtitle', 'Shows when you open the app after your reminder time and have not finished today\'s workout.')}</p>
          </div>
          <label class="toggle"><input type="checkbox" data-action="toggle-reminder" ${reminderConfig.enabled ? 'checked' : ''} ${!this.ctx.notifications?.isAvailable ? 'disabled' : ''}><span class="toggle-slider"></span></label>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">${this.t('reminder_time', 'Reminder time')}</label>
            <input class="form-input" type="time" data-action="reminder-time" value="${reminderTime}" ${reminderConfig.enabled && this.ctx.notifications?.isAvailable ? '' : 'disabled'}>
          </div>
          <div class="form-group">
            <label class="form-label">${this.t('message_preview', 'Message preview')}</label>
            <div class="setting-hint">${this.format('reminder_preview_body', { goal: this.translateValue(user.goal, user.goal.replaceAll('_', ' ')) }, `Time for your workout! 💪 Your ${user.goal.replaceAll('_', ' ')} routine is waiting.`)}</div>
          </div>
        </div>
        <p class="text-sm text-muted">${this.ctx.notifications?.isAvailable ? this.t('notifications_permission_hint', 'Browser notification permission is requested when you enable reminders.') : this.t('notifications_not_supported', 'This browser does not support local notifications.')}</p>
      </section>`;
  }

  renderDataSection() {
    return `
      <section class="card"><button class="btn btn-secondary w-full mb-16" data-action="export-backup">${this.t('export_backup', 'Export backup')}</button><button class="btn btn-secondary w-full mb-16" data-action="import-backup">${this.t('import_backup', 'Import backup')}</button><input type="file" id="backup-file-input" accept="application/json" class="hidden"><button class="btn btn-danger w-full" data-action="reset-data">${this.t('reset_all_data', 'Reset all local data')}</button></section>
      <section class="card"><div class="setting-row"><span class="setting-label">${this.t('app_version', 'App version')}</span><span class="setting-value">${this.t('app_version_value', 'OpenFit Local v2')}</span></div><div class="setting-row"><span class="setting-label">${this.t('storage', 'Storage')}</span><span class="setting-value">${this.t('storage_value', 'Offline-first browser storage')}</span></div></section>`;
  }

  async handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'edit-profile') this.openProfileEditor(button.dataset.profileId);
    if (button.dataset.action === 'add-profile') this.openProfileEditor();
    if (button.dataset.action === 'switch-profile') await this.ctx.updateProfile.switchProfile(button.dataset.profileId);
    if (button.dataset.action === 'delete-profile') await this.deleteProfile(button.dataset.profileId);
    if (button.dataset.action === 'language') {
      this.ctx.updateProfile.setLanguage(button.dataset.value);
      this.ctx.i18n?.setLang(button.dataset.value);
      this.ctx.bus.emit(Events.PROFILE_UPDATED, this.ctx.updateProfile.getUser());
      this.render();
    }
    if (button.dataset.action === 'units') {
      this.ctx.updateProfile.setUnits(button.dataset.value);
      this.render();
    }
    if (button.dataset.action === 'export-backup') this.ctx.backup.exportToJSON();
    if (button.dataset.action === 'import-backup') this.el.querySelector('#backup-file-input')?.click();
    if (button.dataset.action === 'reset-data') this.resetData();
  }

  handleChange(event) {
    // Ignore change events while modal is open
    if (this.modalCleanup) return;
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
      <h2 class="mb-16" id="modal-title">${profileId ? this.t('edit_profile', 'Edit profile') : this.t('add_profile_title', 'Add profile')}</h2>
      <form id="profile-form">
        <div class="grid-2"><div class="form-group"><label class="form-label">${this.t('avatar_emoji', 'Avatar emoji')}</label><input class="form-input" name="avatar" value="${existing.avatar || '🙂'}"></div><div class="form-group"><label class="form-label">${this.t('name', 'Name')}</label><input class="form-input" name="name" value="${existing.name || ''}"></div></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">${this.t('age', 'Age')}</label><input class="form-input" name="age" type="number" value="${existing.age || 25}"></div><div class="form-group"><label class="form-label">${this.t('gender', 'Gender')}</label><select class="form-input form-select" name="gender"><option value="" ${!existing.gender ? 'selected' : ''}>${this.t('prefer_not_to_say', 'Prefer not to say')}</option><option value="male" ${existing.gender === 'male' ? 'selected' : ''}>${this.t('male', 'Male')}</option><option value="female" ${existing.gender === 'female' ? 'selected' : ''}>${this.t('female', 'Female')}</option></select></div></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">${this.t('height', 'Height')} (cm)</label><input class="form-input" name="height" type="number" value="${existing.height || 170}"></div><div class="form-group"><label class="form-label">${this.t('weight', 'Weight')} (kg)</label><input class="form-input" name="weight" type="number" step="0.1" value="${existing.weight || 70}"></div></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">${this.t('goal_label', 'Goal')}</label><select class="form-input form-select" name="goal"><option value="fat_loss" ${existing.goal === 'fat_loss' ? 'selected' : ''}>${this.t('fat_loss', 'Fat loss')}</option><option value="strength" ${existing.goal === 'strength' ? 'selected' : ''}>${this.t('strength', 'Strength')}</option><option value="flexibility" ${existing.goal === 'flexibility' ? 'selected' : ''}>${this.t('flexibility', 'Flexibility')}</option><option value="stress_relief" ${existing.goal === 'stress_relief' ? 'selected' : ''}>${this.t('stress_relief', 'Stress relief')}</option></select></div><div class="form-group"><label class="form-label">${this.t('focus_label', 'Focus')}</label><select class="form-input form-select" name="focusArea"><option value="core" ${existing.focusArea === 'core' ? 'selected' : ''}>${this.t('core', 'Core')}</option><option value="full_body" ${existing.focusArea === 'full_body' ? 'selected' : ''}>${this.t('full_body', 'Full body')}</option><option value="upper" ${existing.focusArea === 'upper' ? 'selected' : ''}>${this.t('upper', 'Upper body')}</option><option value="lower" ${existing.focusArea === 'lower' ? 'selected' : ''}>${this.t('lower', 'Lower body')}</option></select></div></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">${this.t('level_label', 'Level')}</label><select class="form-input form-select" name="level"><option value="beginner" ${existing.level === 'beginner' ? 'selected' : ''}>${this.t('beginner', 'Beginner')}</option><option value="intermediate" ${existing.level === 'intermediate' ? 'selected' : ''}>${this.t('intermediate', 'Intermediate')}</option><option value="advanced" ${existing.level === 'advanced' ? 'selected' : ''}>${this.t('advanced', 'Advanced')}</option></select></div><div class="form-group"><label class="form-label">${this.t('daily_minutes', 'Daily Minutes')}</label><input class="form-input" name="dailyMinutes" type="number" value="${existing.dailyMinutes || 30}"></div></div>
        <div class="grid-2 mt-24"><button type="button" class="btn btn-secondary" data-close-profile="true">${this.t('cancel', 'Cancel')}</button><button type="submit" class="btn btn-primary">${this.t('save', 'Save')}</button></div>
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
    if (!window.confirm(this.t('delete_profile_confirm', 'Delete this profile from the active switcher?'))) return;
    try {
      await this.ctx.updateProfile.deleteProfile(profileId);
      this.render();
    } catch (error) {
      const message = error.message === 'Keep at least one profile in OpenFit Local.'
        ? this.t('error_keep_one_profile', 'Keep at least one profile in OpenFit Local.')
        : error.message;
      window.alert(message);
    }
  }

  async importBackup(file) {
    if (!file) return;
    try {
      await this.ctx.backup.importFromJSON(file);
      await this.ctx.updateProfile.initProfiles();
      this.render();
      window.alert(this.t('backup_imported_success', 'Backup imported successfully.'));
    } catch (error) {
      window.alert(`${this.t('import_failed_prefix', 'Import failed')}: ${error.message}`);
    }
  }

  async resetData() {
    if (!window.confirm(this.t('reset_data_confirm', 'Reset all OpenFit Local data on this device?'))) return;
    await this.ctx.updateProfile.resetAllData(userStores);
    window.location.reload();
  }

  closeModal(options = {}) {
    closeAccessibleModal(this, options);
    // Re-render after modal closes to reflect any changes
    this.render();
  }
}
