// Downloads real human exercise-demonstration photos (start + end position) from
// the open-source free-exercise-db for every catalog exercise that has a match,
// preferring clean bodyweight/beginner demos. Writes:
//   assets/exercises/<id>/0.jpg, 1.jpg        (the demo images)
//   assets/exercises/manifest.json            (ids that have photos, for the SW)
//   src/core/animation/demoManifest.js        (Set of ids, imported by the app)
//
// Re-run any time with:  node tools/fetch_demos.cjs

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'exercises');
const CATALOG = path.join(ROOT, 'assets', 'plans', 'exercise_catalog_v1.json');
const DB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const RAW_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function getText(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d)); }).on('error', rej);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) return reject(new Error('HTTP ' + response.statusCode));
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

// Map awkward catalog ids/names to a db search term.
const SYNONYMS = [
  [/pushup|push-up|pushups/, 'push-up'],
  [/wide-push/, 'push-up'],
  [/diamond-push|close-grip/, 'push-up'],
  [/knee-push/, 'push-up'],
  [/sumo-squat/, 'plie squat'],
  [/jump-squat/, 'jump squat'],
  [/squat-to-press|squat-thrust|desk-chair-squat|bodyweight-squat/, 'bodyweight squat'],
  [/squat/, 'bodyweight squat'],
  [/reverse-lunge|forward-lunge/, 'lunge'],
  [/lunge/, 'lunge'],
  [/side-plank/, 'side bridge'],
  [/plank-shoulder|shoulder-taps-plank/, 'plank'],
  [/plank/, 'plank'],
  [/bicycle-crunch/, 'air bicycle'],
  [/reverse-crunch/, 'crunch'],
  [/crunch/, 'crunch'],
  [/russian/, 'russian twist'],
  [/leg-raise|leg-raises/, 'leg raise'],
  [/flutter|scissor/, 'flutter kick'],
  [/glute-bridge|single-leg-bridge/, 'glute bridge'],
  [/mountain-climber/, 'mountain climber'],
  [/calf-raise|calf-raises/, 'calf raise'],
  [/tricep-dip|dips/, 'bench dip'],
  [/wall-push/, 'push-up'],
  [/inchworm/, 'inchworm'],
  [/superman/, 'superman'],
  [/toe-touch/, 'toe touch'],
  [/wrist-circle/, 'wrist circles'],
  [/arm-circle/, 'arm circles'],
  [/shoulder-shrug|seated-shoulder-shrug/, 'shrug'],
  [/quad-stretch/, 'quad stretch'],
  [/hamstring/, 'hamstring stretch'],
  [/shoulder-stretch/, 'shoulder stretch'],
];

// Score a db candidate for a given exercise: higher is better/cleaner.
function score(db, nId, nName) {
  const dn = norm(db.name);
  let s = 0;
  if (dn === nName || dn === nId) s += 100;
  if (dn.includes(nName) || nName.includes(dn)) s += 40;
  if (dn.includes(nId) || nId.includes(dn)) s += 30;
  if (db.level === 'beginner') s += 8;
  if (db.category === 'strength' || db.category === 'cardio') s += 4;
  if (Array.isArray(db.images) && db.images.length >= 2) s += 6; // need 2 for motion
  return s;
}

// This is a bodyweight HOME app: only accept demos that need no equipment, so
// we never show a barbell/dumbbell/machine gym photo. Equipment exercises fall
// back to the humanoid figure instead.
const BODYWEIGHT_EQUIP = new Set(['body only', 'none', '']);
const isBodyweight = (d) => d.equipment == null || BODYWEIGHT_EQUIP.has(d.equipment);

function bestMatch(db, ex) {
  const nId = norm(ex.id);
  const nName = norm(ex.name);
  let term = null;
  for (const [re, t] of SYNONYMS) { if (re.test(ex.id) || re.test(norm(ex.name))) { term = norm(t); break; } }

  const candidates = db
    .map((d) => {
      if (!isBodyweight(d)) return null;
      const dn = norm(d.name);
      const direct = dn.includes(nName) || nName.includes(dn) || dn.includes(nId) || nId.includes(dn);
      const viaTerm = term && dn.includes(term);
      if (!direct && !viaTerm) return null;
      return { d, s: score(d, nId, nName) + (viaTerm ? 20 : 0) };
    })
    .filter(Boolean)
    .sort((a, b) => b.s - a.s);

  return candidates.length ? candidates[0].d : null;
}

(async () => {
  const cat = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const exercises = cat.exercises || [];
  console.log('Fetching free-exercise-db ...');
  const db = JSON.parse(await getText(DB_URL));
  console.log(`Loaded ${db.length} db exercises. Matching ${exercises.length} app exercises ...\n`);

  const withPhotos = [];

  for (const ex of exercises) {
    const match = bestMatch(db, ex);
    const imgs = match && Array.isArray(match.images) ? match.images.slice(0, 2) : [];
    if (!match || imgs.length === 0) {
      console.log(`  [skip] ${ex.id}  -> figure fallback`);
      continue;
    }
    // Ensure two frames (duplicate if only one) so the player can alternate.
    if (imgs.length === 1) imgs.push(imgs[0]);

    const dir = path.join(OUT_DIR, ex.id);
    fs.mkdirSync(dir, { recursive: true });
    try {
      await download(RAW_BASE + imgs[0], path.join(dir, '0.jpg'));
      await download(RAW_BASE + imgs[1], path.join(dir, '1.jpg'));
      withPhotos.push(ex.id);
      console.log(`  [ok]   ${ex.id}  <- "${match.name}"`);
    } catch (err) {
      console.log(`  [fail] ${ex.id}  (${err.message}) -> figure fallback`);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    }
  }

  // manifest.json (consumed by the service worker for offline precache)
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(withPhotos, null, 2));

  // demoManifest.js (imported by the app to choose photo vs figure)
  const moduleBody =
    '// AUTO-GENERATED by tools/fetch_demos.cjs - do not edit by hand.\n' +
    '// Exercise ids that have real demonstration photos in assets/exercises/<id>/.\n' +
    'export const PHOTO_EXERCISES = new Set(' + JSON.stringify(withPhotos.sort()) + ');\n';
  fs.writeFileSync(path.join(ROOT, 'src', 'core', 'animation', 'demoManifest.js'), moduleBody);

  console.log(`\nDone. ${withPhotos.length}/${exercises.length} exercises now have real demo photos.`);
  console.log('Wrote assets/exercises/manifest.json and src/core/animation/demoManifest.js');
})();
