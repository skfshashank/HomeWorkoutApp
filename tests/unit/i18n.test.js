import assert from 'node:assert';
import { I18n, strings } from '../../src/core/utils/i18n.js';

const enKeys = Object.keys(strings.en).sort();
const hiKeys = Object.keys(strings.hi).sort();

assert.deepStrictEqual(hiKeys, enKeys, 'Hindi translations must cover every English key');

const i18n = new I18n('en');
assert.strictEqual(i18n.t('start'), 'Start');
assert.strictEqual(i18n.translateValue('fat_loss'), 'Weight Loss');
assert.strictEqual(i18n.translateValue('belly_fat'), 'Belly Fat');

i18n.setLang('hi');
assert.strictEqual(i18n.t('start'), 'शुरू करें');
assert.strictEqual(i18n.t('home'), 'होम');
assert.strictEqual(i18n.translateValue('fat_loss'), 'वज़न कम करना');
assert.strictEqual(i18n.translateValue('upper'), 'ऊपरी शरीर');

console.log('✅ i18n tests passed');
