import assert from 'node:assert';
import { ProgressionEngine } from '../../src/domain/services/ProgressionEngine.js';

const createStorage = () => {
  const state = { history: [], multiplier: 1.0 };
  return {
    getHistory: () => state.history,
    saveHistory: (history) => { state.history = history; },
    getMultiplier: () => state.multiplier,
    saveMultiplier: (multiplier) => { state.multiplier = multiplier; }
  };
};

const easyStorage = createStorage();
const easyEngine = new ProgressionEngine({ storage: easyStorage, getDateStr: () => '2024-06-15' });

await easyEngine.recordRPE('too_easy');
await easyEngine.recordRPE('too_easy');
await easyEngine.recordRPE('too_easy');

assert.strictEqual(easyEngine.shouldLevelUp(), true);
const easyResult = await easyEngine.checkAutoProgression();
assert.strictEqual(easyResult.shouldProgress, true);
assert.strictEqual(easyStorage.getMultiplier(), 1.1);

const hardStorage = createStorage();
const hardEngine = new ProgressionEngine({ storage: hardStorage, getDateStr: () => '2024-06-15' });

await hardEngine.recordRPE('exhausting');
await hardEngine.recordRPE('exhausting');

assert.strictEqual(hardEngine.shouldDeload(), true);
const hardResult = await hardEngine.checkAutoProgression();
assert.strictEqual(hardResult.shouldProgress, false);
assert.strictEqual(hardStorage.getMultiplier(), 0.85);

console.log('✅ progression engine tests passed');
