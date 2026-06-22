import assert from 'node:assert';
import { getLocalDateStr, getLocalMonthStr, parseDateSafe } from '../../src/core/utils/dateUtils.js';

const today = getLocalDateStr();
assert.match(today, /^\d{4}-\d{2}-\d{2}$/);

const parsed = parseDateSafe('2024-06-15');
assert.strictEqual(parsed.getDate(), 15);
assert.strictEqual(parsed.getMonth(), 5);

const month = getLocalMonthStr();
assert.match(month, /^\d{4}-\d{2}$/);

console.log('✅ dateUtils tests passed');
