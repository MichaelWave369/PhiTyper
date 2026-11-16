export const LESSONS = [
  { title: 'The First Strike', belt: 'White', focus: 'Home row · a s d f j k l ;', targetWpm: 8, targetAccuracy: 82,
    text: 'asdf jkl; asdf jkl; sad lad; flask; salad; ask dad; all fall; a sad lad;' },
  { title: 'Steady Hands', belt: 'Yellow', focus: 'Home row words and rhythm', targetWpm: 10, targetAccuracy: 84,
    text: 'a glad lad asks dad; a small flask; all kids laugh; fall fast; a sad dad asks;' },
  { title: 'Reach Higher', belt: 'Orange', focus: 'Upper row · q w e r t y u i o p', targetWpm: 12, targetAccuracy: 86,
    text: 'we type quick quiet words; your power grows; try to write a true story;' },
  { title: 'Ground Control', belt: 'Green', focus: 'Lower row · z x c v b n m', targetWpm: 14, targetAccuracy: 88,
    text: 'mix a vivid canvas; zoom below the moon; brave minds can move mountains;' },
  { title: 'Flow State', belt: 'Blue', focus: 'All letters and flowing sentences', targetWpm: 16, targetAccuracy: 90,
    text: 'The keyboard is a small universe. Each careful stroke builds a new path. Find your flow.' },
  { title: 'Precision Path', belt: 'Purple', focus: 'Capital letters and punctuation', targetWpm: 18, targetAccuracy: 91,
    text: 'Ready, set, type! Stay calm. Great speed starts with good form. You can do this.' },
  { title: 'Number Forms', belt: 'Brown', focus: 'Numbers and special characters', targetWpm: 20, targetAccuracy: 92,
    text: '3, 6, 9! Count 1, 2, 3. The score is 100%; aim for 24/7 focus.' },
  { title: 'The Long Run', belt: 'Red', focus: 'Stamina, spacing and accuracy', targetWpm: 22, targetAccuracy: 93,
    text: 'Practice is not about being perfect. It is about returning to the keys, learning from each mistake, and moving with patience. Keep a light touch, breathe, and let a steady rhythm carry you forward.' },
  { title: 'The Black Belt', belt: 'Black', focus: 'Master challenge · everything together', targetWpm: 25, targetAccuracy: 95,
    text: 'Mastery is earned one keystroke at a time. At 9:36, the dojo opens! Stay sharp, stay kind, and type with purpose. Every mistake teaches something; every new attempt is a fresh start.' }
];
export const MODES = [
  { id: 'dojo', title: 'Belt Dojo', subtitle: 'Learn step by step', glyph: '道', duration: null },
  { id: 'sprint', title: 'Speed Sprint', subtitle: '60-second rush', glyph: '↗', duration: 60 },
  { id: 'zen', title: 'Zen Garden', subtitle: 'No clock, just flow', glyph: '◌', duration: null },
  { id: 'boss', title: 'Boss Rush', subtitle: '45 seconds of chaos', glyph: '⚡', duration: 45 }
];
const LONG_TEXT = [
  'A curious mind can make a tiny spark into a bright idea.',
  'Move your fingers lightly and give every word its own rhythm.',
  'Speed comes from practice, but precision makes speed useful.',
  'The quiet keyboard waits for the next wonderful invention.',
  'A brave beginner returns tomorrow and discovers a stronger skill.',
  'Focus on the next letter instead of racing toward the finish.',
  'Small steps become long journeys when we keep moving forward.',
  'A friendly dojo is a place where everyone is welcome to learn.',
  'The bright fox jumps over a winding river at sunrise.',
  'Every mistake is a clue that helps you find a better rhythm.'
];
const ZEN_TEXT = [
  'There is no finish line in this garden. Type each sentence gently, and let the words come naturally.',
  'If you miss a key, simply correct it and move on. Accuracy is a habit made from thousands of little choices.',
  'Your hands can learn the path without your eyes having to chase every letter. Keep practicing, and enjoy the process.'
].join(' ');
export function makeTarget(mode, lessonIndex = 0) {
  if (mode === 'dojo') return LESSONS[lessonIndex]?.text ?? LESSONS[0].text;
  if (mode === 'zen') return ZEN_TEXT;
  const source = mode === 'boss' ? [...LONG_TEXT].reverse() : LONG_TEXT;
  return Array.from({ length: 8 }, (_, i) => source.slice(i % source.length).join(' ')).join(' ');
}
export function calculateStats(target, typed, elapsedMs = 0, strokes = 0, mistakes = 0) {
  let correct = 0;
  for (let i = 0; i < typed.length; i += 1) if (typed[i] === target[i]) correct += 1;
  const minutes = elapsedMs / 60000;
  const wpm = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;
  const accuracy = strokes > 0 ? Math.round(Math.max(0, 100 * (strokes - mistakes) / strokes)) : 100;
  return {
    wpm: Math.max(0, Math.min(999, wpm)),
    accuracy: Math.min(100, accuracy),
    correct,
    progress: target.length ? Math.min(100, Math.round(typed.length * 100 / target.length)) : 0,
    mistakes,
    elapsedSeconds: Math.round(elapsedMs / 1000)
  };
}
export function isLessonPassed(target, typed, stats, lesson) {
  return typed === target && stats.wpm >= lesson.targetWpm && stats.accuracy >= lesson.targetAccuracy;
}
export function countCombo(target, typed) {
  let combo = 0;
  for (let i = typed.length - 1; i >= 0; i -= 1) {
    if (typed[i] !== target[i]) break;
    combo += 1;
  }
  return combo;
}
export function defaultProfile() { return { cleared: [], best: {}, sessions: 0 }; }
export function readProfile(storage) {
  try {
    const raw = JSON.parse(storage.getItem('phityper-progress-v1') || 'null');
    if (!raw || !Array.isArray(raw.cleared) || typeof raw.best !== 'object' || !raw.best) return defaultProfile();
    return {
      cleared: raw.cleared.filter((n) => Number.isInteger(n) && n >= 0 && n < LESSONS.length),
      best: raw.best,
      sessions: Number.isInteger(raw.sessions) && raw.sessions >= 0 ? raw.sessions : 0
    };
  } catch { return defaultProfile(); }
}
export function finishProfile(profile, mode, lessonIndex, stats, passed) {
  const key = mode === 'dojo' ? 'dojo-' + lessonIndex : mode;
  const prior = profile.best[key];
  const better = !prior || stats.wpm > prior.wpm || (stats.wpm === prior.wpm && stats.accuracy > prior.accuracy);
  return {
    sessions: profile.sessions + 1,
    cleared: passed && mode === 'dojo'
      ? [...new Set([...profile.cleared, lessonIndex])].sort((a, b) => a - b)
      : [...profile.cleared],
    best: better ? { ...profile.best, [key]: { wpm: stats.wpm, accuracy: stats.accuracy } } : { ...profile.best }
  };
}
export function highestUnlocked(cleared) {
  let n = 0;
  while (n < LESSONS.length - 1 && cleared.includes(n)) n += 1;
  return n;
}
