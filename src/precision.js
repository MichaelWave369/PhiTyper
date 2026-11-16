// Φ Precision Lab: aggregate keystroke statistics only. No typed text is stored.
export const PRECISION_KEY = 'phityper-precision-v1';
export const PRECISION_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
export const ACCURACY_GOAL = 98;
const MAX_HISTORY = 12;
const FALLBACK = ['a', 's', 'd', 'f'];

const WORDS = [
  'amber','balance','canvas','daring','energy','faster','gentle','honest','inside','jungle','kindness',
  'lantern','momentum','narrow','orange','practice','quiet','rhythm','sunrise','timing','universe',
  'vibrant','wonder','xylophone','yellow','zigzag','quartz','pixel','jumping','jazz','explore',
  'buzzing','keyboard','joyful','purple','whisper','brisk','ocean','clever','forward','light',
  'hazard','express','maxim','fizzle','quality','quickly','freeze','relax','oxygen','magic',
  'dynamic','bright','fox','learning','flow','strength','focus','mastery','today','steady',
  'improve','sharpen','respect','future','sprint','skills','zenith','focus','unified',
  'victory','zebra','quest','extra','exact','complex','simple','bridge','journey','puzzle'
];

export function emptyPrecision() {
  return { keys: {}, history: [], drills: 0 };
}

const isKey = (key) => /^[a-z]$/.test(key);
const natural = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 10000000;

export function readPrecision(storage) {
  try {
    const raw = JSON.parse(storage.getItem(PRECISION_KEY) || 'null');
    if (!raw || typeof raw !== 'object' || !raw.keys || typeof raw.keys !== 'object') return emptyPrecision();
    const keys = {};
    for (const [key, record] of Object.entries(raw.keys)) {
      if (isKey(key) && record && natural(record.attempts) && natural(record.errors) && record.errors <= record.attempts) {
        keys[key] = { attempts: record.attempts, errors: record.errors };
      }
    }
    const history = Array.isArray(raw.history) ? raw.history
      .filter((entry) => entry && typeof entry.mode === 'string' &&
        Number.isInteger(entry.wpm) && entry.wpm >= 0 && entry.wpm <= 999 &&
        Number.isInteger(entry.accuracy) && entry.accuracy >= 0 && entry.accuracy <= 100)
      .slice(-MAX_HISTORY).map(({ mode, wpm, accuracy }) => ({
        mode: mode.slice(0, 20), wpm, accuracy
      })) : [];
    return { keys, history, drills: natural(raw.drills) ? raw.drills : 0 };
  } catch {
    return emptyPrecision();
  }
}

export function recordKeypresses(profile, target, previous, next) {
  if (next.length <= previous.length) return profile;
  const keys = { ...profile.keys };
  for (let i = previous.length; i < next.length; i++) {
    const key = target[i]?.toLowerCase();
    if (!key || !isKey(key)) continue;
    const old = keys[key] || { attempts: 0, errors: 0 };
    keys[key] = {
      attempts: old.attempts + 1,
      errors: old.errors + Number(next[i]?.toLowerCase() !== key)
    };
  }
  return { ...profile, keys };
}

export function completePrecisionSession(profile, mode, score) {
  const history = [...profile.history, {
    mode, wpm: score.wpm, accuracy: score.accuracy
  }].slice(-MAX_HISTORY);
  return { ...profile, history, drills: profile.drills + Number(mode === 'precision') };
}

export function rankWeakKeys(profile, count = 4) {
  const candidates = Object.entries(profile.keys)
    .filter(([key, data]) => isKey(key) && data.attempts >= 3 && data.errors > 0)
    .map(([key, data]) => ({
      key, attempts: data.attempts, errors: data.errors,
      rate: Math.round(100 * data.errors / data.attempts)
    }))
    .sort((a, b) => b.rate - a.rate || b.errors - a.errors || a.key.localeCompare(b.key));
  return candidates.slice(0, count);
}

export function focusKeys(profile) {
  const actual = rankWeakKeys(profile, 3).map((entry) => entry.key);
  return actual.length ? actual : FALLBACK.slice(0, 3);
}

export function totalObserved(profile) {
  return Object.values(profile.keys).reduce((sum, stat) => sum + stat.attempts, 0);
}

export function makePrecisionDrill(focus, variation = 0) {
  const chosen = (Array.isArray(focus) ? focus : [])
    .map((key) => String(key).toLowerCase()).filter(isKey).slice(0, 3);
  const keys = chosen.length ? chosen : FALLBACK.slice(0, 3);
  const matched = WORDS.filter((word) => keys.some((key) => word.includes(key)));
  const pool = matched.length >= 7 ? matched : WORDS;
  const offset = ((Math.floor(variation) || 0) % pool.length + pool.length) % pool.length;
  const pick = (i) => pool[(offset + i * 3 + Math.floor(i / 3)) % pool.length];
  return [
    'Practice ' + pick(0) + ' and ' + pick(1) + '.',
    'Type ' + pick(2) + ', ' + pick(3) + ', and ' + pick(4) + ' with care.',
    'A ' + pick(5) + ' mind can build ' + pick(6) + ' skills.',
    'Keep ' + pick(7) + ' and ' + pick(8) + ' in your flow.',
    'Try ' + pick(9) + ' ' + pick(10) + ' ' + pick(11) + '.',
    'Every ' + pick(12) + ' step is a step forward.',
    'Find ' + pick(13) + ', ' + pick(14) + ', and ' + pick(15) + '.',
    'Finish with ' + pick(16) + ' and ' + pick(17) + '.'
  ].join(' ');
}

export function precisionKeyStats(profile, key) {
  const item = profile.keys[key] || { attempts: 0, errors: 0 };
  const accuracy = item.attempts
    ? Math.round(100 * (item.attempts - item.errors) / item.attempts)
    : null;
  return { ...item, accuracy };
}

export function practiceFeedback(accuracy) {
  if (accuracy >= ACCURACY_GOAL) return 'Precision goal achieved. Great control!';
  if (accuracy >= 95) return 'Close to 98%. Ease the pace just a little.';
  return 'Slow down, relax your hands, and focus on each key.';
}
