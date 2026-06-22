/**
 * Use Case: Get exercises with filtering.
 */
export class GetExercises {
  #repo;

  constructor(exerciseRepo) {
    this.#repo = exerciseRepo;
  }

  execute(filters = {}) {
    if (Object.keys(filters).length > 0) return this.#repo.filter(filters);
    return this.#repo.getAll();
  }

  getById(id) { return this.#repo.getById(id); }
  getAll() { return this.#repo.getAll(); }
  getByCategory(category) { return this.#repo.getByCategory(category); }
  getByTag(tag) { return this.#repo.getByTag(tag); }
  getCategories() { return this.#repo.getCategories(); }
  getMuscleGroups() { return this.#repo.getMuscleGroups(); }
  getTags() { return this.#repo.getTags(); }
  getEquipmentTypes() { return this.#repo.getEquipmentTypes(); }
  getSimilarExercises(exercise, limit = 5) { return this.#repo.getSimilarExercises(exercise, limit); }
  toggleFavorite(exerciseId) { return this.#repo.toggleFavorite(exerciseId); }
  getFavorites() { return this.#repo.getFavorites(); }
  getRecentlyUsed(limit = 6) { return this.#repo.getRecentlyUsed(limit); }
}
