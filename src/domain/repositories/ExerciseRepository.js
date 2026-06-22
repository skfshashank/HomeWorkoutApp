/**
 * ExerciseRepository - provides access to the exercise catalog.
 */
import { Exercise } from '../entities/Exercise.js';

export class ExerciseRepository {
  #db;
  #getProfileId;
  #exercises = [];
  #byId = new Map();
  #byCategory = new Map();
  #byMuscle = new Map();
  #byTag = new Map();

  constructor(db = null, getProfileId = () => 'default') {
    this.#db = db;
    this.#getProfileId = getProfileId;
  }

  load(rawData) {
    this.#exercises = rawData.map((data) => new Exercise({ ...data, tags: this.#resolveTags(data) }));
    this.#byId.clear();
    this.#byCategory.clear();
    this.#byMuscle.clear();
    this.#byTag.clear();

    this.#exercises.forEach((exercise) => {
      this.#byId.set(exercise.id, exercise);
      if (!this.#byCategory.has(exercise.category)) this.#byCategory.set(exercise.category, []);
      this.#byCategory.get(exercise.category).push(exercise);
      exercise.muscles.forEach((muscle) => {
        if (!this.#byMuscle.has(muscle)) this.#byMuscle.set(muscle, []);
        this.#byMuscle.get(muscle).push(exercise);
      });
      exercise.tags.forEach((tag) => {
        if (!this.#byTag.has(tag)) this.#byTag.set(tag, []);
        this.#byTag.get(tag).push(exercise);
      });
    });
  }

  getById(id) { return this.#byId.get(id) || null; }
  getAll() { return [...this.#exercises]; }
  getByCategory(category) { return this.#byCategory.get(category) || []; }
  getByMuscle(muscle) { return this.#byMuscle.get(muscle) || []; }
  getByTag(tag) { return this.#byTag.get(tag) || []; }
  getCategories() { return [...this.#byCategory.keys()]; }
  getMuscleGroups() { return [...this.#byMuscle.keys()]; }
  getTags() { return [...this.#byTag.keys()].sort(); }
  getEquipmentTypes() { return [...new Set(this.#exercises.map((exercise) => exercise.equipment))].sort(); }

  getSimilarExercises(exercise, limit = 5) {
    if (!exercise) return [];

    const sharedMuscles = (candidate) => candidate.muscles.filter((muscle) => exercise.muscles.includes(muscle)).length;
    const ranked = this.#exercises
      .filter((candidate) => candidate.id !== exercise.id && sharedMuscles(candidate) > 0 && candidate.type === exercise.type)
      .sort((left, right) => {
        const difficultyScore = Number(right.difficulty === exercise.difficulty) - Number(left.difficulty === exercise.difficulty);
        if (difficultyScore !== 0) return difficultyScore;
        return sharedMuscles(right) - sharedMuscles(left);
      });

    return ranked.slice(0, limit);
  }

  search(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return this.getAll();
    return this.#exercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(q)
      || exercise.nameHindi.toLowerCase().includes(q)
      || exercise.category.toLowerCase().includes(q)
      || exercise.muscles.some((muscle) => muscle.toLowerCase().includes(q))
      || exercise.tags.some((tag) => tag.toLowerCase().includes(q))
      || exercise.equipment.toLowerCase().includes(q)
    );
  }

  filter(filters = {}) {
    const {
      search = '',
      category = '',
      muscle = '',
      difficulty = '',
      equipment = '',
      tag = '',
      type = ''
    } = filters;

    return this.search(search).filter((exercise) => {
      if (category && category !== 'all' && exercise.category !== category) return false;
      if (muscle && muscle !== 'all' && !exercise.muscles.includes(muscle)) return false;
      if (difficulty && difficulty !== 'all' && exercise.difficulty !== difficulty) return false;
      if (equipment && equipment !== 'all' && exercise.equipment !== equipment) return false;
      if (tag && tag !== 'all' && !exercise.tags.includes(tag)) return false;
      if (type && type !== 'all' && exercise.type !== type) return false;
      return true;
    });
  }

  async toggleFavorite(exerciseId) {
    if (!this.#db) return false;
    const profileId = this.#getProfileId();
    const id = `${profileId}:${exerciseId}`;
    const current = (await this.#db.get('exerciseMeta', id)) || { id, profileId, exerciseId, favorite: false, useCount: 0 };
    current.favorite = !current.favorite;
    current.updatedAt = new Date().toISOString();
    await this.#db.put('exerciseMeta', current);
    return current.favorite;
  }

  async getFavorites() {
    if (!this.#db) return [];
    const profileId = this.#getProfileId();
    const meta = await this.#db.getAll('exerciseMeta');
    return meta
      .filter((entry) => entry.profileId === profileId && entry.favorite)
      .map((entry) => this.getById(entry.exerciseId))
      .filter(Boolean);
  }

  async getRecentlyUsed(limit = 6) {
    if (!this.#db) return [];
    const profileId = this.#getProfileId();
    const meta = await this.#db.getAll('exerciseMeta');
    return meta
      .filter((entry) => entry.profileId === profileId && entry.lastUsedAt)
      .sort((a, b) => String(b.lastUsedAt).localeCompare(String(a.lastUsedAt)))
      .slice(0, limit)
      .map((entry) => this.getById(entry.exerciseId))
      .filter(Boolean);
  }

  async recordUsage(exerciseIds = []) {
    if (!this.#db || !exerciseIds.length) return;
    const profileId = this.#getProfileId();
    const usedAt = new Date().toISOString();

    for (const exerciseId of [...new Set(exerciseIds)]) {
      const id = `${profileId}:${exerciseId}`;
      const current = (await this.#db.get('exerciseMeta', id)) || { id, profileId, exerciseId, favorite: false, useCount: 0 };
      current.lastUsedAt = usedAt;
      current.useCount = (current.useCount || 0) + 1;
      current.updatedAt = usedAt;
      await this.#db.put('exerciseMeta', current);
    }
  }

  #resolveTags(data) {
    const tags = new Set((data.tags || []).map((tag) => String(tag).toLowerCase()));
    const category = String(data.category || '').toLowerCase();
    const muscles = (data.muscles || []).map((muscle) => String(muscle).toLowerCase());
    const id = String(data.id || '').toLowerCase();
    const name = String(data.name || '').toLowerCase();

    if (category.includes('yoga') || category.includes('pranayama')) tags.add('yoga');
    if (category.includes('stretch') || category.includes('office')) tags.add('stretch');
    if (category.includes('lower') || muscles.some((muscle) => ['quads', 'hamstrings', 'glutes', 'calves'].includes(muscle))) tags.add('legs');
    if (muscles.some((muscle) => ['chest', 'shoulders', 'triceps'].includes(muscle)) || id.includes('push') || name.includes('push')) tags.add('push');
    if (muscles.some((muscle) => ['back', 'lats', 'biceps'].includes(muscle)) || id.includes('pull') || id.includes('row') || name.includes('pull')) tags.add('pull');
    if (category.includes('hiit') || category.includes('full_body') || /jump|burpee|climber|jack|high-knee|run|cardio/.test(id + name)) tags.add('cardio');

    return [...tags];
  }
}
