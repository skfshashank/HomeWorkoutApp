import { Events } from '../../app/eventBus.js';
import { closeAccessibleModal, openAccessibleModal } from '../../core/utils/modalAccessibility.js';
import { upgradeSelects } from '../../core/utils/customDropdown.js';

export class ExerciseLibraryView {
  constructor() {
    this.ctx = null;
    this.el = null;
    this.filters = { search: '', muscle: 'all', difficulty: 'all', equipment: 'all', category: 'all', tag: 'all' };
    this.modal = null;
    this.modalContent = null;
    this.modalCleanup = null;
    this.lastFocusedElement = null;
    this.modalDismissHandler = null;
  }

  init(container, deps) {
    this.el = container;
    this.ctx = deps;
    this.modal = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.el.addEventListener('input', (event) => this.handleInput(event));
    this.el.addEventListener('change', (event) => this.handleInput(event));
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.safeRender());
    this.ctx.bus.on(Events.PAGE_CHANGED, ({ page }) => {
      if (page === 'exercises') this.safeRender();
    });
  }

  t(key, fallback = key) {
    return this.ctx.i18n?.t(key) || fallback;
  }

  safeRender() {
    if (!this.el) return;
    this.el.innerHTML = `<div class="page-title">Exercise Library</div><p class="text-sm text-muted">Loading exercises...</p>`;
    this.render().catch((err) => {
      console.error('ExerciseLibraryView render error:', err);
      this.el.innerHTML = `<div class="page-title">Exercise Library</div><div class="card"><p>Error: ${err?.message || 'Unknown error'}</p><button class="btn btn-primary mt-16" onclick="history.back()">Go Back</button></div>`;
    });
  }

  async render() {
    const [favorites, recent] = await Promise.all([
      this.ctx.getExercises.getFavorites(),
      this.ctx.getExercises.getRecentlyUsed(6)
    ]);
    const exercises = this.ctx.getExercises.execute(this.filters);
    const muscles = ['all', ...this.ctx.getExercises.getMuscleGroups()];
    const equipment = ['all', ...this.ctx.getExercises.getEquipmentTypes()];
    const categories = ['all', ...this.ctx.getExercises.getCategories()];
    const tags = ['all', ...this.ctx.getExercises.getTags()];
    const favoriteIds = new Set(favorites.map((exercise) => exercise.id));

    this.el.innerHTML = `
      <div class="page-title">${this.t('exercise_library_title', 'Exercise Library')}</div>
      <p class="page-subtitle">${this.t('exercise_library_subtitle', 'Search English + Hindi names, filter by muscle/difficulty/equipment/tags, and keep favorites local-first.')}</p>

      <section class="card">
        <div class="form-group"><label class="form-label">${this.t('search', 'Search')}</label><input class="form-input" data-filter="search" value="${this.filters.search}" placeholder="${this.t('search_placeholder', 'Crunches / क्रंचेज / yoga')}"></div>
        <div class="grid-2">
          ${this.renderSelect(this.t('muscle_group', 'Muscle group'), 'muscle', muscles, this.filters.muscle)}
          ${this.renderSelect(this.t('difficulty', 'Difficulty'), 'difficulty', ['all', 'beginner', 'intermediate', 'advanced'], this.filters.difficulty)}
          ${this.renderSelect(this.t('equipment', 'Equipment'), 'equipment', equipment, this.filters.equipment)}
          ${this.renderSelect(this.t('category', 'Category'), 'category', categories, this.filters.category)}
        </div>
        <div class="form-group mt-16"><label class="form-label">${this.t('training_tag', 'Training tag')}</label><div class="tabs">${tags.map((tag) => `<button class="tab ${this.filters.tag === tag ? 'active' : ''}" data-action="set-tag" data-tag="${tag}">${this.formatOption(tag)}</button>`).join('')}</div></div>
      </section>

      <section class="card"><h2>${this.t('favorites', 'Favorites')}</h2><div class="exercise-chip-row">${favorites.length ? favorites.map((exercise) => `<button class="chip" data-action="open-detail" data-exercise-id="${exercise.id}">${exercise.emoji} ${exercise.name}</button>`).join('') : `<span class="text-sm text-muted">${this.t('favorites_empty', 'Tap the star on any exercise to favorite it.')}</span>`}</div></section>
      <section class="card"><h2>${this.t('recently_used', 'Recently Used')}</h2><div class="exercise-chip-row">${recent.length ? recent.map((exercise) => `<button class="chip" data-action="open-detail" data-exercise-id="${exercise.id}">${exercise.emoji} ${exercise.name}</button>`).join('') : `<span class="text-sm text-muted">${this.t('recent_exercises_empty', 'Finish a workout and your recent exercises will appear here.')}</span>`}</div></section>
      <section>${exercises.map((exercise) => this.renderCard(exercise, favoriteIds.has(exercise.id))).join('') || `<div class="card"><p class="text-sm text-muted">${this.t('no_exercises_match', 'No exercises match those filters yet.')}</p></div>`}</section>`;
    upgradeSelects(this.el);
  }

  formatOption(option) {
    if (option === 'all') return this.t('all', 'All');
    return this.t(option, option.replaceAll('_', ' '));
  }

  renderSelect(label, key, options, value) {
    return `<div class="form-group"><label class="form-label">${label}</label><select class="form-input form-select" data-filter="${key}">${options.map((option) => `<option value="${option}" ${option === value ? 'selected' : ''}>${this.formatOption(option)}</option>`).join('')}</select></div>`;
  }

  renderCard(exercise, favorite) {
    return `
      <article class="card exercise-library-card">
        <div class="flex flex-between gap-12">
          <div>
            <h3>${exercise.emoji} ${exercise.name}</h3>
            <p class="text-sm text-muted">${exercise.nameHindi || '—'} • ${exercise.tags.join(' • ') || exercise.category}</p>
          </div>
          <button class="favorite-btn ${favorite ? 'active' : ''}" data-action="toggle-favorite" data-exercise-id="${exercise.id}">${favorite ? '★' : '☆'}</button>
        </div>
        <div class="flex flex-wrap gap-8 mb-8"><span class="badge badge-${exercise.difficulty}">${this.formatOption(exercise.difficulty)}</span>${exercise.muscles.map((muscle) => `<span class="chip">${this.formatOption(muscle)}</span>`).join('')}</div>
        <p class="text-sm text-muted mb-8">${exercise.description}</p>
        <p class="text-sm mb-8"><strong>${this.t('instructions', 'Instructions')}:</strong> ${(exercise.steps || []).slice(0, 2).join(' ')}</p>
        <p class="text-sm text-muted"><strong>${this.t('breathing', 'Breathing')}:</strong> ${exercise.breathing || this.t('breathing_fallback', 'Breathe steadily and keep good form.')}</p>
        <div class="flex gap-8 mt-16 flex-wrap">
          <button class="btn btn-secondary btn-sm" data-action="open-detail" data-exercise-id="${exercise.id}">${this.t('view_details', 'View details')}</button>
          <button class="btn btn-primary btn-sm" data-action="add-to-custom" data-exercise-id="${exercise.id}">${this.t('add_to_custom_workout', 'Add to custom workout')}</button>
        </div>
      </article>`;
  }

  handleInput(event) {
    const key = event.target.dataset.filter;
    if (!key) return;
    this.filters[key] = event.target.value;
    this.render();
  }

  async handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const exerciseId = button.dataset.exerciseId;
    if (button.dataset.action === 'toggle-favorite') {
      await this.ctx.getExercises.toggleFavorite(exerciseId);
      this.render();
    }
    if (button.dataset.action === 'set-tag') {
      this.filters.tag = button.dataset.tag;
      this.render();
    }
    if (button.dataset.action === 'open-detail') this.openDetail(exerciseId);
    if (button.dataset.action === 'add-to-custom') {
      this.ctx.openCustomWorkoutEditor();
      this.ctx.addExerciseToCustomWorkout(exerciseId);
      this.ctx.router.navigate('custom-workouts');
    }
  }

  openDetail(exerciseId) {
    const exercise = this.ctx.getExercises.getById(exerciseId);
    if (!exercise) return;
    this.closeModal();
    openAccessibleModal(this, `
      <div class="exercise-detail">
        <div class="exercise-demo w-full mb-16"><div class="exercise-demo__avatar ${exercise.animation || ''}">${exercise.emoji}</div><div class="exercise-demo__caption"><h2 id="modal-title">${exercise.name}</h2><div class="text-sm text-muted">${exercise.nameHindi || this.t('animated_demo_description', 'Animated demo description')} • ${exercise.category.replaceAll('_', ' ')}</div></div></div>
        <p class="text-sm mb-16">${exercise.description}</p>
        <div class="card card-compact mb-16"><strong>${this.t('how_to_do_it', 'How to do it')}</strong><ul style="padding-left:18px;list-style:disc;">${(exercise.steps || []).map((step) => `<li>${step}</li>`).join('')}</ul></div>
        <div class="card card-compact mb-16"><strong>${this.t('breathing_tips', 'Breathing tips')}</strong><p class="text-sm text-muted">${exercise.breathing || this.t('breathing_tips_fallback', 'Keep a smooth inhale/exhale rhythm.')}</p></div>
        <div class="card card-compact mb-16"><strong>${this.t('coach_tips', 'Coach tips')}</strong><p class="text-sm text-muted">${(exercise.tips || []).join(' • ') || this.t('coach_tips_fallback', 'Move slow, stay controlled, and stop if form breaks.')}</p></div>
        <div class="grid-2"><button class="btn btn-secondary" data-close-modal="true">${this.t('close', 'Close')}</button><button class="btn btn-primary" data-add-custom="${exercise.id}">${this.t('add_to_custom_workout', 'Add to custom workout')}</button></div>
      </div>`, (event) => {
      const addButton = event.target.closest('[data-add-custom]');
      if (addButton) {
        this.ctx.openCustomWorkoutEditor();
        this.ctx.addExerciseToCustomWorkout(addButton.dataset.addCustom);
        this.closeModal();
        this.ctx.router.navigate('custom-workouts');
      }
    });
  }

  closeModal(options = {}) {
    closeAccessibleModal(this, options);
  }
}
