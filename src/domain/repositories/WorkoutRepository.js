/**
 * WorkoutRepository - provides access to workout plans.
 */
import { Workout } from '../entities/Workout.js';

export class WorkoutRepository {
  #workouts = [];
  #byId = new Map();
  
  load(rawData) {
    this.#workouts = rawData.map(d => new Workout(d));
    this.#workouts.forEach(w => this.#byId.set(w.id, w));
  }
  
  getById(id) { return this.#byId.get(id) || null; }
  getAll() { return [...this.#workouts]; }
  
  getByCategory(cat) { return this.#workouts.filter(w => w.category === cat); }
  getByDifficulty(diff) { return this.#workouts.filter(w => w.difficulty === diff); }
  
  filter({ category, difficulty }) {
    let results = this.#workouts;
    if (category && category !== 'all') results = results.filter(w => w.category === category);
    if (difficulty && difficulty !== 'all') results = results.filter(w => w.difficulty === difficulty);
    return results;
  }
}
