/**
 * Workout Entity - represents a workout plan/template.
 */
export class Workout {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.category = data.category;
    this.difficulty = data.difficulty;
    this.duration = data.duration; // estimated minutes
    this.icon = data.icon || '💪';
    this.description = data.description || '';
    this.warmUp = data.warmUp || []; // exercise IDs
    this.main = data.main || []; // exercise IDs with optional overrides
    this.coolDown = data.coolDown || [];
    this.restBetweenSets = data.restBetweenSets || 20;
    this.restBetweenExercises = data.restBetweenExercises || 30;
  }
  
  get totalExercises() {
    return this.warmUp.length + this.main.length + this.coolDown.length;
  }
  
  get allExerciseIds() {
    return [...this.warmUp, ...this.main, ...this.coolDown];
  }
}
