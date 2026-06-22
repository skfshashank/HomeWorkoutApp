import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const testsDir = path.resolve('tests', 'unit');
const entries = (await readdir(testsDir)).filter((file) => file.endsWith('.test.js')).sort();

let failed = 0;

for (const file of entries) {
  try {
    await import(pathToFileURL(path.join(testsDir, file)).href);
  } catch (error) {
    failed += 1;
    console.error(`❌ ${file} failed`);
    console.error(error);
  }
}

if (failed) {
  console.error(`\n${failed} test file(s) failed.`);
  process.exit(1);
}

console.log(`\n✅ ${entries.length} test file(s) passed.`);
