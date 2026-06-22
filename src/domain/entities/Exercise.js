/**
 * Exercise Entity - immutable value object representing an exercise.
 */
export class Exercise {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.nameHindi = data.nameHindi || '';
    this.category = data.category; // belly_fat|yoga|pranayama|hiit|upper|lower|core|stretch|office|full_body
    this.muscles = data.muscles || [];
    this.type = data.type; // 'reps' | 'time'
    this.levels = data.levels; // { beginner: 12, intermediate: 20, advanced: 30 }
    this.setsDefault = data.setsDefault || 3;
    this.caloriesPerSet = data.caloriesPerSet || 5;
    this.animation = data.animation || '';
    this.emoji = data.emoji || '💪';
    this.description = data.description || '';
    this.steps = data.steps || [];
    this.tips = data.tips || [];
    this.breathing = data.breathing || '';
    this.commonMistakes = data.commonMistakes || [];
    this.equipment = data.equipment || 'none';
    this.difficulty = data.difficulty || 'beginner';
  }
  
  getTarget(level) {
    return this.levels[level] || this.levels.beginner;
  }
  
  getScaledTarget(level, multiplier = 1.0) {
    const base = this.getTarget(level);
    return Math.round(base * multiplier);
  }
  
  get isTimeBased() { return this.type === 'time'; }
  get isRepBased() { return this.type === 'reps'; }
  
  get targetLabel() {
    return this.isTimeBased ? 'seconds' : 'reps';
  }
}
