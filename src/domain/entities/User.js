/**
 * User Entity - user profile and preferences.
 */
export class User {
  constructor(data = {}) {
    this.id = data.id || 'default';
    this.name = data.name || '';
    this.gender = data.gender || '';
    this.age = data.age || 25;
    this.height = data.height || 170; // cm
    this.weight = data.weight || 70; // kg
    this.goal = data.goal || 'fat_loss'; // fat_loss|strength|flexibility|stress_relief
    this.focusArea = data.focusArea || 'core'; // core|full_body|upper|lower
    this.level = data.level || 'beginner'; // beginner|intermediate|advanced
    this.dailyMinutes = data.dailyMinutes || 30;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.equipment = data.equipment || 'none';
    this.injuries = data.injuries || [];
  }
  
  get bmi() {
    const h = this.height / 100;
    return +(this.weight / (h * h)).toFixed(1);
  }
  
  get bmiCategory() {
    const b = this.bmi;
    if (b < 18.5) return 'Underweight';
    if (b < 25) return 'Normal';
    if (b < 30) return 'Overweight';
    return 'Obese';
  }
  
  get dailyCalorieTarget() {
    // Rough TDEE estimation
    const bmr = this.gender === 'male'
      ? 88.36 + (13.4 * this.weight) + (4.8 * this.height) - (5.7 * this.age)
      : 447.6 + (9.2 * this.weight) + (3.1 * this.height) - (4.3 * this.age);
    return Math.round(bmr * 1.2); // sedentary multiplier
  }
}
