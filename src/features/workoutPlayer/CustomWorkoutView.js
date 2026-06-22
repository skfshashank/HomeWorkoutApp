export class CustomWorkoutView {
  constructor() {
    this.ctx = null;
    this.el = null;
    this.draft = null;
    this.editingId = '';
    this.libraryFilters = { search: '', muscle: 'all', difficulty: 'all', tag: 'all' };
  }

  init(container, deps) {
    this.el = container;
    this.ctx = deps;
    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.el.addEventListener('input', (event) => this.handleInput(event));
    this.el.addEventListener('change', (event) => this.handleInput(event));
    this.ctx.bus.on('profile:updated', () => this.resetDraft());
  }

  async render() {
    await this.ensureDraft();
    const exercises = this.ctx.getExercises.execute(this.libraryFilters).slice(0, 24);
    const muscles = ['all', ...this.ctx.getExercises.getMuscleGroups()];
    const tags = ['all', ...this.ctx.getExercises.getTags()];

    this.el.innerHTML = `
      <div class="page-title">Custom Workout Creator</div>
      <p class="page-subtitle">Build your own workout, fine-tune reps/duration/sets/rest, and save it for this profile.</p>

      <section class="card">
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Workout name</label><input class="form-input" data-draft="name" value="${this.draft.name}"></div>
          <div class="form-group"><label class="form-label">Estimated duration (min)</label><input class="form-input" type="number" data-draft="duration" value="${this.draft.duration}"></div>
          <div class="form-group"><label class="form-label">Rest between sets (sec)</label><input class="form-input" type="number" data-draft="restBetweenSets" value="${this.draft.restBetweenSets}"></div>
          <div class="form-group"><label class="form-label">Rest between exercises (sec)</label><input class="form-input" type="number" data-draft="restBetweenExercises" value="${this.draft.restBetweenExercises}"></div>
        </div>
        <div class="flex gap-8 flex-wrap">
          <button class="btn btn-primary" data-action="save-workout">Save workout</button>
          ${this.editingId ? '<button class="btn btn-secondary" data-action="duplicate-workout">Duplicate</button>' : ''}
          ${this.editingId ? '<button class="btn btn-danger" data-action="delete-workout">Delete</button>' : ''}
          <button class="btn btn-secondary" data-action="back-workouts">Back to workouts</button>
        </div>
      </section>

      <section class="card">
        <h2>Selected exercises</h2>
        ${this.draft.main.length ? this.draft.main.map((item, index) => this.renderDraftItem(item, index)).join('') : '<p class="text-sm text-muted">Add exercises from the library below.</p>'}
      </section>

      <section class="card">
        <h2>Add from library</h2>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Search</label><input class="form-input" data-library="search" value="${this.libraryFilters.search}" placeholder="Search exercise"></div>
          <div class="form-group"><label class="form-label">Muscle</label><select class="form-input form-select" data-library="muscle">${muscles.map((muscle) => `<option value="${muscle}" ${muscle === this.libraryFilters.muscle ? 'selected' : ''}>${muscle}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Difficulty</label><select class="form-input form-select" data-library="difficulty">${['all', 'beginner', 'intermediate', 'advanced'].map((level) => `<option value="${level}" ${level === this.libraryFilters.difficulty ? 'selected' : ''}>${level}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Tag</label><select class="form-input form-select" data-library="tag">${tags.map((tag) => `<option value="${tag}" ${tag === this.libraryFilters.tag ? 'selected' : ''}>${tag}</option>`).join('')}</select></div>
        </div>
        <div class="exercise-picker-grid">${exercises.map((exercise) => `<button class="picker-chip" data-action="add-exercise" data-exercise-id="${exercise.id}">${exercise.emoji} ${exercise.name}</button>`).join('')}</div>
      </section>`;
  }

  renderDraftItem(item, index) {
    const exercise = this.ctx.getExercises.getById(item.exerciseId);
    return `
      <div class="custom-workout-item">
        <div class="flex flex-between gap-12 mb-8"><strong>${exercise?.emoji || '💪'} ${exercise?.name || item.exerciseId}</strong><div class="flex gap-8"><button class="btn btn-secondary btn-sm" data-action="move-up" data-index="${index}">↑</button><button class="btn btn-secondary btn-sm" data-action="move-down" data-index="${index}">↓</button><button class="btn btn-danger btn-sm" data-action="remove-exercise" data-index="${index}">Remove</button></div></div>
        <div class="grid-4 custom-grid">
          <div class="form-group"><label class="form-label">Sets</label><input class="form-input" type="number" data-item-field="sets" data-index="${index}" value="${item.sets}"></div>
          <div class="form-group"><label class="form-label">${exercise?.isTimeBased ? 'Duration (sec)' : 'Reps'}</label><input class="form-input" type="number" data-item-field="targetOverride" data-index="${index}" value="${item.targetOverride}"></div>
          <div class="form-group"><label class="form-label">Rest (sec)</label><input class="form-input" type="number" data-item-field="restSec" data-index="${index}" value="${item.restSec}"></div>
          <div class="form-group"><label class="form-label">Type</label><div class="chip">${exercise?.targetLabel || 'target'}</div></div>
        </div>
      </div>`;
  }

  resetDraft() {
    this.editingId = '';
    this.draft = null;
    this.render();
  }

  async ensureDraft() {
    if (this.draft) return;
    if (this.editingId) {
      const workout = await this.ctx.manageWorkouts.getCustomWorkout(this.editingId);
      if (workout) {
        this.draft = JSON.parse(JSON.stringify(workout));
        return;
      }
    }
    this.draft = this.ctx.manageWorkouts.createDraft();
  }

  openEditor(workoutId = '') {
    this.editingId = workoutId || '';
    this.draft = null;
    this.render();
  }

  addExerciseById(exerciseId) {
    const exercise = this.ctx.getExercises.getById(exerciseId);
    if (!exercise) return;
    if (!this.draft) this.draft = this.ctx.manageWorkouts.createDraft();
    this.draft.main.push({ exerciseId, sets: exercise.setsDefault || 2, targetOverride: exercise.getTarget(this.ctx.updateProfile.getUser().level), restSec: 20 });
    this.render();
  }

  handleInput(event) {
    if (event.target.dataset.draft) {
      const key = event.target.dataset.draft;
      this.draft[key] = event.target.type === 'number' ? Number(event.target.value || 0) : event.target.value;
    }
    if (event.target.dataset.library) {
      this.libraryFilters[event.target.dataset.library] = event.target.value;
      this.render();
    }
    if (event.target.dataset.itemField) {
      const item = this.draft.main[Number(event.target.dataset.index)];
      if (!item) return;
      item[event.target.dataset.itemField] = Number(event.target.value || 0);
    }
  }

  async handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    await this.ensureDraft();
    const index = Number(button.dataset.index);

    if (button.dataset.action === 'add-exercise') this.addExerciseById(button.dataset.exerciseId);
    if (button.dataset.action === 'remove-exercise') {
      this.draft.main.splice(index, 1);
      this.render();
    }
    if (button.dataset.action === 'move-up' && index > 0) {
      [this.draft.main[index - 1], this.draft.main[index]] = [this.draft.main[index], this.draft.main[index - 1]];
      this.render();
    }
    if (button.dataset.action === 'move-down' && index < this.draft.main.length - 1) {
      [this.draft.main[index + 1], this.draft.main[index]] = [this.draft.main[index], this.draft.main[index + 1]];
      this.render();
    }
    if (button.dataset.action === 'save-workout') await this.saveWorkout();
    if (button.dataset.action === 'duplicate-workout' && this.editingId) {
      const workout = await this.ctx.manageWorkouts.duplicateCustomWorkout(this.editingId);
      if (workout?.id) {
        this.openEditor(workout.id);
      }
    }
    if (button.dataset.action === 'delete-workout' && this.editingId) {
      await this.ctx.manageWorkouts.deleteCustomWorkout(this.editingId);
      this.openEditor();
      this.ctx.router.navigate('workouts');
    }
    if (button.dataset.action === 'back-workouts') this.ctx.router.navigate('workouts');
  }

  async saveWorkout() {
    if (!this.draft.name.trim() || !this.draft.main.length) {
      alert('Add a workout name and at least one exercise.');
      return;
    }
    const workout = await this.ctx.manageWorkouts.saveCustomWorkout({
      ...this.draft,
      id: this.editingId || this.draft.id
    }, this.ctx.updateProfile.getUser().level);
    this.editingId = workout.id;
    this.draft = JSON.parse(JSON.stringify(workout));
    this.ctx.router.navigate('workouts');
  }
}
