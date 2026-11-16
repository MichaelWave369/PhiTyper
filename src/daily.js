// PhiTyper Daily Dojo: local-calendar quests, no accounts or remote scores.
export const DAILY_STORAGE_KEY = 'phityper-daily-v1';
export const DAILY_SECONDS = 60;
export const DAILY_HISTORY_LIMIT = 180;

// A deterministic daily passage. No content is sent to a server.
const LINES = [
  'Every great skill begins with one careful attempt.',
  'The secret to typing faster is learning to stay relaxed.',
  'The keyboard can turn a thought into something wonderful.',
  'Slow and steady practice teaches the fingers new paths.',
  'When mistakes happen, learn from them and keep moving.',
  'Good rhythm comes from a calm mind and light hands.',
  'A bright idea can start with just a few simple words.',
  'Small improvements become extraordinary over time.',
  'Practice with patience and celebrate every step forward.',
  'The next challenge is another chance to discover your flow.',
  'Strong habits grow when we show up with curiosity.',
  'Take your time and give each letter your attention.',
  'The best competition is becoming better than yesterday.',
  'Every challenge can be an invitation to learn something.',
  'Kindness, focus, and persistence belong in the same dojo.',
  'Find the next word and let your hands follow your eyes.',
  'Progress is not a straight line, and that is completely fine.',
  'A little bit of laughter makes a hard lesson easier.',
  'Speed is useful, but good control makes it reliable.',
  'Keep your shoulders loose and enjoy the sound of the keys.'
];

export function localDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

export function previousDay(dayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return '';
  const [y, m, d] = dayKey.split('-').map(Number);
  const timestamp = Date.UTC(y, m - 1, d - 1);
  const date = new Date(timestamp);
  return date.toISOString().slice(0, 10);
}

function seededNumber(dayKey) {
  let state = 2166136261;
  for (const ch of dayKey) {
    state ^= ch.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

export function makeDailyPassage(dayKey) {
  // About 7,000 characters: enough for fast typists to keep typing for 60 seconds.
  let seed = seededNumber(dayKey);
  const sentences = [];
  for (let i = 0; i < 110; i += 1) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    sentences.push(LINES[seed % LINES.length]);
  }
  return sentences.join(' ');
}

export function dailyStars(stats) {
  // Three thresholds reward steady improvement instead of raw speed alone.
  if (stats.correct < 30 || stats.accuracy < 80) return 0;
  let stars = 1;
  if (stats.wpm >= 30 && stats.accuracy >= 95) stars += 1;
  if (stats.wpm >= 50 && stats.accuracy >= 98) stars += 1;
  return stars;
}

export function emptyDaily() {
  return { days: {} };
}
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function readDaily(storage) {
  try {
    const raw = JSON.parse(storage.getItem(DAILY_STORAGE_KEY) || 'null');
    if (!raw || !raw.days || typeof raw.days !== 'object' || Array.isArray(raw.days)) return emptyDaily();
    const days = {};
    for (const [date, result] of Object.entries(raw.days).sort().slice(-DAILY_HISTORY_LIMIT)) {
      if (!DAY_PATTERN.test(date) || !result || !Number.isInteger(result.stars) ||
          result.stars < 0 || result.stars > 3 ||
          !Number.isInteger(result.wpm) || result.wpm < 0 || result.wpm > 999 ||
          !Number.isInteger(result.accuracy) || result.accuracy < 0 || result.accuracy > 100) continue;
      days[date] = { stars: result.stars, wpm: result.wpm, accuracy: result.accuracy };
    }
    return { days };
  } catch { return emptyDaily(); }
}

export function saveDaily(storage, daily) {
  try { storage.setItem(DAILY_STORAGE_KEY, JSON.stringify(daily)); } catch { /* private browsing */ }
}

export function completeDaily(previous, dayKey, stats) {
  if (!DAY_PATTERN.test(dayKey)) return previous;
  const record = { stars: dailyStars(stats), wpm: stats.wpm, accuracy: stats.accuracy };
  const earlier = previous.days[dayKey];
  // Best stars first; ties favor WPM, then accuracy. Replays never erase better attempts.
  if (earlier && (earlier.stars > record.stars ||
      (earlier.stars === record.stars && earlier.wpm > record.wpm) ||
      (earlier.stars === record.stars && earlier.wpm === record.wpm && earlier.accuracy >= record.accuracy))) {
    return previous;
  }
  const days = Object.fromEntries(
    Object.entries({ ...previous.days, [dayKey]: record }).sort(([a], [b]) => a.localeCompare(b)).slice(-DAILY_HISTORY_LIMIT)
  );
  return { days };
}

export function dailyStreak(daily, today) {
  const dates = new Set(Object.keys(daily.days).filter(day => daily.days[day].stars > 0));
  let cursor = dates.has(today) ? today : previousDay(today);
  let streak = 0;
  while (cursor && dates.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

export function bestDailyStreak(daily) {
  const dates = Object.keys(daily.days).filter(day => daily.days[day].stars > 0).sort();
  let previous = '';
  let current = 0;
  let best = 0;
  for (const day of dates) {
    current = previousDay(day) === previous ? current + 1 : 1;
    best = Math.max(best, current);
    previous = day;
  }
  return best;
}

export const TROPHIES = [
  { id: 'first', name: 'First Steps', icon: '◇', description: 'Finish one typing lesson or challenge.' },
  { id: 'black', name: 'Black Belt', icon: '✦', description: 'Clear all nine dojo belts.' },
  { id: 'speed', name: 'Lightning Fingers', icon: 'ϟ', description: 'Record a 60 WPM or faster session.' },
  { id: 'accuracy', name: 'Sharp Eye', icon: '◎', description: 'Record a 98% accuracy or better session.' },
  { id: 'daily', name: 'Daily Explorer', icon: '☼', description: 'Earn your first Daily Dojo star.' },
  { id: 'three', name: 'Three-Day Rhythm', icon: '♬', description: 'Earn stars on three consecutive local calendar days.' },
  { id: 'seven', name: 'Seven-Day Flame', icon: '✳', description: 'Earn stars on seven consecutive local calendar days.' },
  { id: 'master', name: 'Perfect Quest', icon: '★', description: 'Earn three stars on any Daily Dojo challenge.' },
  { id: 'storm', name: 'Storm Chaser', icon: '☂', description: 'Clear ten or more words in one Word Rain run.' }
];

export function earnedTrophies({ profile, precision, daily, rain = null }) {
  const sessions = Number(profile?.sessions ?? 0);
  const scores = Object.values(profile?.best ?? {});
  const history = precision?.history ?? [];
  const days = Object.values(daily?.days ?? {});
  const longest = bestDailyStreak(daily);
  const flags = {
    first: sessions > 0,
    black: Array.isArray(profile?.cleared) && profile.cleared.length === 9,
    speed: scores.some(s => s?.wpm >= 60) || history.some(s => s.wpm >= 60) || days.some(s => s.wpm >= 60),
    accuracy: scores.some(s => s?.accuracy >= 98) || history.some(s => s.accuracy >= 98) || days.some(s => s.accuracy >= 98),
    daily: days.some(s => s.stars >= 1),
    three: longest >= 3,
    seven: longest >= 7,
    master: days.some(s => s.stars === 3),
    storm: (rain?.words ?? 0) >= 10
  };
  return TROPHIES.map(trophy => ({ ...trophy, earned: Boolean(flags[trophy.id]) }));
}
