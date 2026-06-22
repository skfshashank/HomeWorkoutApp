/**
 * ExerciseRepository - provides access to the exercise catalog.
 * Reads from static JSON catalog bundled with app.
 */
import { Exercise } from '../entities/Exercise.js';

export class ExerciseRepository {
  #exercises = [];
  #byId = new Map();
  #byCategory = new Map();
  #byMuscle = new Map();
  
  load(rawData) {
    this.#exercises = rawData.map(d => new Exercise(d));
    this.#exercises.forEach(ex => {
      this.#byId.set(ex.id, ex);
      // Index by category
      if (!this.#byCategory.has(ex.category)) this.#byCategory.set(ex.category, []);
      this.#byCategory.get(ex.category).push(ex);
      // Index by muscle
      ex.muscles.forEach(m => {
        if (!this.#byMuscle.has(m)) this.#byMuscle.set(m, []);
        this.#byMuscle.get(m).push(ex);
      });
    });
  }
  
  getById(id) { return this.#byId.get(id) || null; }
  getAll() { return [...this.#exercises]; }
  getByCategory(cat) { return this.#byCategory.get(cat) || []; }
  getByMuscle(muscle) { return this.#byMuscle.get(muscle) || []; }
  getCategories() { return [...this.#byCategory.keys()]; }
  getMuscleGroups() { return [...this.#byMuscle.keys()]; }
  
  search(query) {
    const q = query.toLowerCase();
    return this.#exercises.filter(ex => 
      ex.name.toLowerCase().includes(q) || 
      ex.nameHindi.toLowerCase().includes(q) ||
      ex.category.includes(q) ||
      ex.muscles.some(m => m.includes(q))
    );
  }
  
  filter({ category, muscle, difficulty, type }) {
    let results = this.#exercises;
    if (category) results = results.filter(e => e.category === category);
    if (muscle) results = results.filter(e => e.muscles.includes(muscle));
    if (difficulty) results = results.filter(e => e.difficulty === difficulty);
    if (type) results = results.filter(e => e.type === type);
    return results;
  }
}
