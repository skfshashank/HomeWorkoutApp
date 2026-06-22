export class ManageWorkouts {
  #db;
  #bus;
  #events;
  #workoutRepo;
  #getActiveProfileId;
  #getExerciseById;
  #scheduler;
  #translate;

  constructor({
    db,
    bus,
    events,
    workoutRepo,
    getActiveProfileId,
    getExerciseById,
    scheduler,
    translate
  }) {
    this.#db = db;
    this.#bus = bus;
    this.#events = events;
    this.#workoutRepo = workoutRepo;
    this.#getActiveProfileId = getActiveProfileId;
    this.#getExerciseById = getExerciseById;
    this.#scheduler = scheduler;
    this.#translate = translate || ((k, f) => f);
  }

  getPlans(filters = {}) {
    return this.#workoutRepo.filter(filters);
  }

  getPlanById(planId) {
    return this.#workoutRepo.getById(planId);
  }

  getCategories() {
    return [...new Set(this.#workoutRepo.getAll().map((plan) => plan.category))];
  }

  getPlanPreview(plan, limit = 4) {
    return (plan.main || [])
      .slice(0, limit)
      .map((item) => this.#getExerciseById(item.exerciseId)?.name || item.exerciseId)
      .join(' • ');
  }

  async getCustomWorkouts() {
    const workouts = await this.#db.getAll('customWorkouts');
    return workouts
      .filter((workout) => workout.profileId === this.#getActiveProfileId())
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  async getCustomWorkout(workoutId) {
    const workout = await this.#db.get('customWorkouts', workoutId);
    if (!workout || workout.profileId !== this.#getActiveProfileId()) return null;
    return workout;
  }

  createDraft() {
    return { name: '', duration: 20, restBetweenSets: 20, restBetweenExercises: 30, main: [] };
  }

  async saveCustomWorkout(draft, userLevel) {
    const workout = {
      id: draft.id || `custom-${Date.now().toString(36)}`,
      profileId: this.#getActiveProfileId(),
      name: draft.name.trim(),
      category: 'custom',
      difficulty: draft.difficulty || userLevel,
      duration: Number(draft.duration || 0),
      icon: '🛠️',
      description: 'Custom workout built in OpenFit Local.',
      warmUp: draft.warmUp || [],
      main: draft.main || [],
      coolDown: draft.coolDown || [],
      restBetweenSets: Number(draft.restBetweenSets || 20),
      restBetweenExercises: Number(draft.restBetweenExercises || 30),
      updatedAt: new Date().toISOString(),
      createdAt: draft.createdAt || new Date().toISOString()
    };
    await this.#db.put('customWorkouts', workout);
    this.#bus.emit(this.#events.CUSTOM_WORKOUTS_CHANGED, workout);
    return workout;
  }

  async duplicateCustomWorkout(workoutId) {
    const source = await this.getCustomWorkout(workoutId);
    if (!source) return null;

    return this.saveCustomWorkout({
      ...JSON.parse(JSON.stringify(source)),
      id: `custom-${Date.now().toString(36)}`,
      name: `${source.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, source.difficulty || 'beginner');
  }

  async deleteCustomWorkout(workoutId) {
    await this.#db.delete('customWorkouts', workoutId);
    this.#bus.emit(this.#events.CUSTOM_WORKOUTS_CHANGED, { id: workoutId });
  }

  generateDailyWorkout(user, date = new Date(), options = {}) {
    const plan = this.#scheduler.generateDaily(user, date, options);
    const t = this.#translate;
    return {
      ...plan,
      id: `daily-${plan.date || `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}`,
      name: plan.isRestDay ? t('recovery_reset', 'Recovery Reset') : `${t(`category_${plan.category}`, plan.category.replaceAll('_', ' '))} ${t('focus', 'focus')}`,
      description: plan.isRestDay
        ? t('rest_day_desc', 'Gentle mobility, breathing, and stretching to keep your streak sustainable.')
        : t('daily_workout_desc', `${plan.main.length} adaptive movements for your ${user.goal.replaceAll('_', ' ')} journey.`),
      preview: [...plan.warmUp, ...plan.main, ...plan.coolDown]
        .slice(0, 5)
        .map((item) => this.#getExerciseById(item.exerciseId)?.name || item.exerciseId)
    };
  }
}
