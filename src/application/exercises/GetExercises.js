/**
 * Use Case: Get exercises with filtering.
 */
export class GetExercises {
  #repo;
  
  constructor(exerciseRepo) {
    this.#repo = exerciseRepo;
  }
  
  execute(filters = {}) {
    if (filters.search) return this.#repo.search(filters.search);
    if (Object.keys(filters).length > 0) return this.#repo.filter(filters);
    return this.#repo.getAll();
  }
  
  getCategories() { return this.#repo.getCategories(); }
  getMuscleGroups() { return this.#repo.getMuscleGroups(); }
  getById(id) { return this.#repo.getById(id); }
}
