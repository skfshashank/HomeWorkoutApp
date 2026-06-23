const fs = require('fs');
const path = require('path');
const https = require('https');

const ANIMATIONS_DIR = path.join(__dirname, '../animations');

const exercises = [
  'ab-rollout-towel', 'anulom-vilom', 'arm-circles', 'balasana', 'bear-crawl', 'bhramari',
  'bhujangasana', 'bicycle-crunches', 'bird-dog', 'boat-hold', 'bodyweight-squats', 'burpees-hiit',
  'burpees', 'butt-kicks', 'calf-raises', 'cat-cow-stretch', 'cat-cow', 'chest-opener', 'crunches',
  'dead-bug-core', 'dead-bug', 'deep-belly-breathing', 'desk-chair-squats', 'desk-neck-rolls',
  'desk-push-ups', 'dhanurasana', 'diamond-push-ups', 'donkey-kicks', 'downward-dog', 'dumbbell',
  'fast-feet', 'fire-hydrants', 'flutter-kicks', 'forward-lunges', 'glute-bridges', 'halasana',
  'hamstring-stretch-standing', 'heel-taps', 'high-knees', 'hip-flexor-stretch-standing',
  'hip-flexor-stretch', 'hollow-hold', 'inchworm', 'inchworms', 'jump-squats-hiit',
  'jump-squats-lower', 'jumping-jacks', 'kapalbhati', 'knee-push-ups', 'knee-to-elbow-plank',
  'lateral-shuffles', 'leg-raises', 'lunges', 'matsyasana', 'mountain-climbers', 'naukasana',
  'neck-rolls', 'padmasana', 'paschimottanasana', 'pike-push-ups', 'plank-hip-dips',
  'plank-hold-core', 'plank-hold', 'plank-jacks-hiit', 'plank-jacks', 'plank-shoulder-taps',
  'plank-to-pushup', 'plank-walk', 'push-ups-standard', 'push-ups', 'quad-stretch',
  'reverse-crunches', 'reverse-lunges', 'reverse-snow-angels', 'running', 'russian-twists',
  'scissor-kicks', 'seated-shoulder-shrugs', 'seated-spinal-twist', 'setu-bandhasana',
  'shavasana', 'sheetali', 'shoulder-stretch', 'shoulder-taps-plank', 'side-leg-raises',
  'side-plank-core', 'side-plank', 'single-leg-bridges', 'skaters', 'spinal-twist-lying',
  'sprawl', 'squat-jumps', 'squat-thrusts', 'squat-to-press', 'squats', 'standing-calf-raises',
  'star-jumps', 'sumo-squats', 'superman-core', 'superman-hold', 'surya-namaskar', 'tadasana',
  'toe-touches', 'tricep-dips-chair', 'trikonasana', 'tuck-jumps', 'turkish-getup-lite',
  'ujjayi', 'ustrasana', 'utkatasana', 'v-ups', 'vajrasana', 'virabhadrasana-i',
  'virabhadrasana-ii', 'walk-out-pushup', 'wall-push-ups', 'wall-sit', 'wide-push-ups',
  'workout-general', 'wrist-circles', 'yoga'
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
  if (!fs.existsSync(ANIMATIONS_DIR)) {
    fs.mkdirSync(ANIMATIONS_DIR, { recursive: true });
  }

  console.log('Fetching open source exercise database...');
  let db = [];
  try {
    const dbUrl = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
    const resp = await new Promise((resolve, reject) => {
      https.get(dbUrl, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
    db = JSON.parse(resp);
    console.log(`Loaded ${db.length} exercises from remote DB.`);
  } catch (err) {
    console.error('Failed to load remote DB:', err.message);
    console.log('Will use fallback placeholders.');
  }

  let downloaded = 0;

  for (const exId of exercises) {
    const targetPath = path.join(ANIMATIONS_DIR, `${exId}.gif`);
    if (fs.existsSync(targetPath)) continue;

    const normalizedExId = normalizeName(exId);
    
    // Attempt fuzzy match
    let match = db.find(item => normalizeName(item.name).includes(normalizedExId) || normalizedExId.includes(normalizeName(item.name)));
    
    // Additional heuristics for common names
    if (!match) {
      const e = normalizedExId;
      if (e.includes('pushup')) match = db.find(i => i.name === 'push-up');
      else if (e.includes('squat')) match = db.find(i => i.name === 'bodyweight squat' || i.name === 'squat');
      else if (e.includes('lunge')) match = db.find(i => i.name === 'lunge');
      else if (e.includes('plank')) match = db.find(i => i.name === 'front plank');
      else if (e.includes('crunch')) match = db.find(i => i.name === 'crunch');
      else if (e.includes('burpee')) match = db.find(i => i.name === 'burpee');
      else if (e.includes('dip')) match = db.find(i => i.name === 'bench dip');
      else if (e.includes('mountainclimber')) match = db.find(i => i.name === 'mountain climber');
      else if (e.includes('jumpingjack')) match = db.find(i => i.name === 'jumping jack');
      else if (e.includes('highknee')) match = db.find(i => i.name === 'high knee');
      else if (e.includes('bridge')) match = db.find(i => i.name === 'glute bridge');
      else if (e.includes('calfraise')) match = db.find(i => i.name === 'calf raise');
      else if (e.includes('superman')) match = db.find(i => i.name === 'superman');
      else if (e.includes('legraise')) match = db.find(i => i.name === 'leg raise');
      else if (e.includes('russian')) match = db.find(i => i.name === 'russian twist');
      else if (e.includes('bird') && e.includes('dog')) match = db.find(i => i.name === 'bird dog');
      else if (e.includes('inchworm')) match = db.find(i => i.name === 'inchworm');
      else if (e.includes('cat') && e.includes('cow')) match = db.find(i => i.name === 'cat cow');
    }

    try {
      if (match && match.gifUrl) {
        console.log(`[${exId}] Matching with "${match.name}" -> Downloading GIF...`);
        // Map raw GitHub URL since the provided one might be relative or require conversion
        let gifUrl = match.gifUrl;
        if (!gifUrl.startsWith('http')) {
          gifUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${match.id}/${match.id}.gif`;
        }
        await downloadFile(gifUrl, targetPath);
        downloaded++;
      } else {
        console.log(`[${exId}] No match found. Downloading generic placeholder GIF...`);
        // Create a basic placeholder that is valid animated GIF (just a tiny transparent or solid color GIF)
        // Downloading a placeholder from placehold.co
        const placeholderUrl = `https://placehold.co/400x400/050816/FFFFFF/webp?text=${encodeURIComponent(exId)}`;
        const webpPath = path.join(ANIMATIONS_DIR, `${exId}.webp`);
        await downloadFile(placeholderUrl, webpPath);
        downloaded++;
      }
    } catch (err) {
      console.error(`[${exId}] Failed to download: ${err.message}`);
    }
  }

  console.log(`\nDone! Downloaded ${downloaded} media files.`);
  console.log('You can now use real MP4, GIF, or WebP files in the animations/ folder!');
}

run();
