import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { ExerciseRepository } from '../../src/domain/repositories/ExerciseRepository.js';
import { GetExercises } from '../../src/application/exercises/GetExercises.js';

const raw = JSON.parse(await readFile(new URL('../../assets/plans/exercise_catalog_v1.json', import.meta.url), 'utf8'));

const repo = new ExerciseRepository();
repo.load(raw.exercises);

const getExercises = new GetExercises(repo);
const combo = getExercises.execute({
  search: 'crunch',
  muscle: 'abs',
  difficulty: 'beginner',
  equipment: 'none'
});

assert.ok(combo.length > 0, 'expected combo search to return results');
assert.ok(combo.every((exercise) => exercise.name.toLowerCase().includes('crunch')
  && exercise.muscles.includes('abs')
  && exercise.difficulty === 'beginner'
  && exercise.equipment === 'none'));

const narrower = getExercises.execute({
  search: 'crunch',
  difficulty: 'advanced'
});

assert.deepStrictEqual(narrower, [], 'advanced crunch search should respect difficulty filter');

console.log('✅ exercise repo tests passed');
