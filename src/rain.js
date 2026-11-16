// Word Rain: an offline, deterministic falling-word arcade.
export const RAIN_STORAGE_KEY = 'phityper-word-rain-v1';
export const RAIN_LIVES = 3;
export const RAIN_LANES = 3;
export const RAIN_WORDS = [
  'flow','focus','spark','brave','light','quiet','rhythm','smile','puzzle','jungle',
  'typing','swift','solar','river','cloud','pearl','pixel','dream','bright','music',
  'clever','cobalt','wonder','garden','future','rocket','spring','gentle','orange','crystal',
  'lantern','marble','sprint','thunder','silver','balance','friend','yellow','glowing','legend',
  'wisdom','amazing','keyboard','freedom','imagine','voyage','energy','victory','harmony','honest',
  'curious','kindness','discovery','adventure','sunrise','practice','accuracy','champion','movement','learning'
];
export const blankRain = () => ({
  status: 'ready', lives: RAIN_LIVES, active: [], nextId: 0,
  typed: '', selectedId: null, score: 0, combo: 0, bestCombo: 0,
  clears: 0, misses: 0, mistakes: 0, strokes: 0, correctChars: 0,
  startedAt: null, endedAt: null, lastTickAt: null, lastSpawnAt: null,
  pausedAt: null, pausedTotal: 0,
  message: 'READY FOR THE RAIN'
});
export const rainLevel = clears => Math.min(9, 1 + Math.floor(clears / 7));
export const spawnEveryMs = level => Math.max(850, 2500 - (level - 1) * 190);
export const fallDurationMs = level => Math.max(4000, 11500 - (level - 1) * 850);

function nextDrop(id) {
  return { id, word: RAIN_WORDS[(id * 11 + Math.floor(id / 3) * 7 + 3) % RAIN_WORDS.length], lane: id % RAIN_LANES, y: 0 };
}
function sortDrops(a, b) { return b.y - a.y || a.id - b.id; }
export function targetRainWord(state, input) {
  if (!input) return null;
  const retained = state.active.find(item => item.id === state.selectedId);
  if (retained && retained.word.startsWith(input)) return retained;
  return [...state.active].filter(item => item.word.startsWith(input)).sort(sortDrops)[0] || null;
}
function finished(state, now) {
  return { ...state, status: 'over', endedAt: now, pausedAt: null, typed: '', selectedId: null, message: 'THE SKY WINS THIS ROUND' };
}
export function rainReducer(state, action) {
  const now = action.now;
  switch (action.type) {
    case 'START':
      if (state.status !== 'ready') return state;
      return {
        ...state, status: 'running', active: [nextDrop(0)], nextId: 1,
        startedAt: now, lastTickAt: now, lastSpawnAt: now,
        message: 'TYPE A FALLING WORD TO CLEAR IT'
      };
    case 'TICK': {
      if (state.status !== 'running') return state;
      // Capping elapsed time avoids unfair rapid loss after a suspended tab.
      const dt = Math.min(250, Math.max(0, now - state.lastTickAt));
      if (!dt) return state;
      const level = rainLevel(state.clears);
      const updated = state.active.map(drop => ({ ...drop, y: drop.y + dt / fallDurationMs(level) * 100 }));
      const missed = updated.filter(drop => drop.y >= 100);
      const remaining = updated.filter(drop => drop.y < 100);
      const lives = Math.max(0, state.lives - missed.length);
      if (lives === 0) return finished({
        ...state, lives, active: remaining, misses: state.misses + missed.length,
        combo: 0, lastTickAt: now
      }, now);
      let nextId = state.nextId;
      let lastSpawnAt = state.lastSpawnAt;
      if (now - state.lastSpawnAt >= spawnEveryMs(level) && remaining.length < 5) {
        remaining.push(nextDrop(nextId));
        nextId += 1;
        lastSpawnAt = now;
      }
      const targetLost = missed.some(drop => drop.id === state.selectedId);
      return {
        ...state, lives, active: remaining, nextId, lastSpawnAt, lastTickAt: now,
        misses: state.misses + missed.length,
        combo: missed.length ? 0 : state.combo,
        typed: targetLost ? '' : state.typed,
        selectedId: targetLost ? null : state.selectedId,
        message: missed.length ? 'A WORD HIT THE GROUND! −1 LIFE' : state.message
      };
    }
    case 'TYPE': {
      if (state.status !== 'running') return state;
      const value = String(action.value ?? '').toLowerCase();
      if (value === state.typed) return state;
      if (value.length < state.typed.length && state.typed.startsWith(value)) {
        return { ...state, typed: value, selectedId: value ? state.selectedId : null };
      }
      const strokes = state.strokes + Math.max(1, value.length - state.typed.length);
      const candidate = targetRainWord(state, value);
      if (!candidate) {
        return {
          ...state, typed: '', selectedId: null, combo: 0,
          mistakes: state.mistakes + 1, strokes,
          message: 'WRONG KEY! RESET AND TRY AGAIN'
        };
      }
      if (candidate.word !== value) return { ...state, typed: value, selectedId: candidate.id, strokes };
      const combo = state.combo + 1;
      const points = 100 + candidate.word.length * 20 + (combo - 1) * 15 + Math.round(candidate.y);
      return {
        ...state, typed: '', selectedId: null, strokes,
        active: state.active.filter(drop => drop.id !== candidate.id),
        combo, bestCombo: Math.max(state.bestCombo, combo),
        score: state.score + points, clears: state.clears + 1,
        correctChars: state.correctChars + candidate.word.length,
        message: combo > 1 ? 'COMBO x' + combo + '! +' + points : 'SPLASH! +' + points
      };
    }
    case 'PAUSE':
      return state.status === 'running' ? { ...state, status: 'paused', pausedAt: now, message: 'PAUSED' } : state;
    case 'RESUME':
      return state.status === 'paused' ? {
        ...state, status: 'running', lastTickAt: now, lastSpawnAt: now,
        pausedTotal: state.pausedTotal + Math.max(0, now - state.pausedAt), pausedAt: null,
        message: 'BACK IN THE RAIN'
      } : state;
    case 'END':
      return state.status === 'running' || state.status === 'paused'
        ? finished({ ...state,
            pausedTotal: state.pausedTotal + (state.pausedAt === null ? 0 : Math.max(0, now - state.pausedAt)),
            message: 'RUN COMPLETE' }, now)
        : state;
    case 'RESTART':
      return blankRain();
    default:
      return state;
  }
}
export function rainStats(state, now) {
  const stopAt = state.pausedAt ?? state.endedAt ?? now;
  const elapsed = state.startedAt == null ? 0 : Math.max(0, stopAt - state.startedAt - state.pausedTotal);
  const minutes = elapsed / 60000;
  return {
    elapsed, wpm: minutes ? Math.min(999, Math.round(state.correctChars / 5 / minutes)) : 0,
    accuracy: state.strokes ? Math.max(0, Math.round((state.strokes - state.mistakes) / state.strokes * 100)) : 100
  };
}
export const emptyRainRecord = () => ({ score: 0, words: 0, combo: 0, runs: 0 });
export function readRainRecord(storage) {
  try {
    const raw = JSON.parse(storage.getItem(RAIN_STORAGE_KEY) || 'null');
    if (!raw || !['score','words','combo','runs'].every(key =>
      Number.isSafeInteger(raw[key]) && raw[key] >= 0 && raw[key] <= 10000000)) return emptyRainRecord();
    return { score: raw.score, words: raw.words, combo: raw.combo, runs: raw.runs };
  } catch { return emptyRainRecord(); }
}
export function completeRainRecord(previous, game) {
  return {
    score: Math.max(previous.score, game.score), words: Math.max(previous.words, game.clears),
    combo: Math.max(previous.combo, game.bestCombo), runs: previous.runs + 1
  };
}
export function writeRainRecord(storage, record) {
  try { storage.setItem(RAIN_STORAGE_KEY, JSON.stringify(record)); } catch { /* private browser */ }
}
