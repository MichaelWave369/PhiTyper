// Self-contained, deterministic arcade battle rules. No randomness, accounts or networking.
export const FIGHTS = [
  {
    id: 'dummy', name: 'THE WOODEN DUMMY', title: 'ROUND 01 · THE FIRST STRIKE',
    flavor: 'Warm up your hands. Every word lands a clean punch.',
    hp: 72, interval: 6700, damage: 8,
    words: ['jab', 'focus', 'flow', 'speed', 'learn', 'punch', 'brave', 'spark', 'power', 'quick', 'rhythm', 'ready']
  },
  {
    id: 'guardian', name: 'THE INK GUARDIAN', title: 'ROUND 02 · FOCUS TEST',
    flavor: 'Longer words, faster counters. Find your rhythm.',
    hp: 118, interval: 5400, damage: 10,
    words: ['keyboard', 'warrior', 'training', 'lightning', 'precision', 'accuracy', 'momentum', 'practice', 'reaction', 'mastery', 'patience', 'victory']
  },
  {
    id: 'sensei', name: 'THE SHADOW SENSEI', title: 'ROUND 03 · FINAL BOSS',
    flavor: 'The Sensei reads every hesitation. Make each strike count.',
    hp: 185, interval: 4300, damage: 12,
    words: ['unbreakable', 'synchronize', 'concentration', 'determination', 'perseverance', 'extraordinary', 'transformation', 'invincible', 'imagination', 'championship', 'unification', 'masterpiece']
  }
];

export const MAX_HP = 100;
export const MAX_ENERGY = 100;

export function createBattle() {
  return {
    status: 'ready',
    round: 0,
    playerHp: MAX_HP,
    enemyHp: FIGHTS[0].hp,
    energy: 0,
    combo: 0,
    bestCombo: 0,
    score: 0,
    words: 0,
    correctChars: 0,
    strokes: 0,
    mistakes: 0,
    typed: '',
    wordIndex: 0,
    startedAt: null,
    endedAt: null,
    lastAttackAt: null,
    lastEvent: 'ready',
    lastEventAt: 0,
    specials: 0
  };
}

export function currentWord(state) {
  const words = FIGHTS[state.round].words;
  return words[state.wordIndex % words.length];
}

function roundResult(state, hp, now, eventName) {
  const enemyHp = Math.max(0, hp);
  const finished = enemyHp === 0;
  return {
    ...state,
    enemyHp,
    status: finished ? (state.round === FIGHTS.length - 1 ? 'won' : 'cleared') : 'fighting',
    endedAt: finished && state.round === FIGHTS.length - 1 ? now : null,
    lastEvent: finished ? 'knockout' : eventName,
    lastEventAt: now
  };
}

export function battleReducer(state, action) {
  const now = action.now;
  switch (action.type) {
    case 'START':
      if (state.status !== 'ready') return state;
      return { ...state, status: 'fighting', startedAt: now, lastAttackAt: now, lastEvent: 'start', lastEventAt: now };
    case 'TYPE': {
      if (state.status !== 'fighting') return state;
      const value = String(action.value ?? '').toLowerCase();
      if (value === state.typed) return state;
      const target = currentWord(state);
      // Backspace is allowed, but does not restore combos or remove recorded mistakes.
      if (value.length < state.typed.length && state.typed.startsWith(value)) return { ...state, typed: value };
      const attempted = Math.max(1, value.length - state.typed.length);
      if (!target.startsWith(value) || value.length > target.length) {
        const playerHp = Math.max(0, state.playerHp - 6);
        return {
          ...state, typed: '', combo: 0, playerHp,
          strokes: state.strokes + attempted, mistakes: state.mistakes + 1,
          status: playerHp === 0 ? 'lost' : 'fighting',
          endedAt: playerHp === 0 ? now : null,
          lastAttackAt: now,
          lastEvent: 'counter', lastEventAt: now
        };
      }
      if (value !== target) return { ...state, typed: value, strokes: state.strokes + attempted };
      const combo = state.combo + 1;
      const damage = 9 + target.length * 2 + Math.min(12, (combo - 1) * 2);
      const next = {
        ...state, typed: '', combo, bestCombo: Math.max(combo, state.bestCombo),
        strokes: state.strokes + attempted,
        correctChars: state.correctChars + target.length,
        wordIndex: state.wordIndex + 1,
        words: state.words + 1,
        score: state.score + target.length * 15 + combo * 10,
        energy: Math.min(MAX_ENERGY, state.energy + 18 + (combo % 3 === 0 ? 12 : 0))
      };
      return roundResult(next, state.enemyHp - damage, now, combo % 3 === 0 ? 'combo' : 'punch');
    }
    case 'TICK': {
      if (state.status !== 'fighting' || now < state.lastAttackAt + FIGHTS[state.round].interval) return state;
      const playerHp = Math.max(0, state.playerHp - FIGHTS[state.round].damage);
      return {
        ...state, playerHp, combo: 0, typed: '',
        status: playerHp === 0 ? 'lost' : 'fighting',
        endedAt: playerHp === 0 ? now : null,
        lastAttackAt: now, lastEvent: 'enemy', lastEventAt: now
      };
    }
    case 'SPECIAL': {
      if (state.status !== 'fighting' || state.energy < MAX_ENERGY) return state;
      const damage = 36 + state.round * 10;
      const next = { ...state, energy: 0, specials: state.specials + 1, score: state.score + 150, typed: '' };
      return roundResult(next, state.enemyHp - damage, now, 'special');
    }
    case 'NEXT':
      if (state.status !== 'cleared' || state.round >= FIGHTS.length - 1) return state;
      return {
        ...state, round: state.round + 1, enemyHp: FIGHTS[state.round + 1].hp,
        status: 'fighting', typed: '', combo: 0, lastAttackAt: now,
        lastEvent: 'start', lastEventAt: now
      };
    case 'RESTART':
      return createBattle();
    default:
      return state;
  }
}

export function battleStats(state, now) {
  const elapsed = state.startedAt == null ? 0 : Math.max(0, (state.endedAt ?? now) - state.startedAt);
  const minutes = elapsed / 60000;
  return {
    elapsed,
    wpm: minutes > 0 ? Math.min(999, Math.round(state.correctChars / 5 / minutes)) : 0,
    accuracy: state.strokes === 0 ? 100 : Math.max(0, Math.round(100 * (state.strokes - state.mistakes) / state.strokes)),
    words: state.words,
    score: state.score
  };
}

const SAVE_KEY = 'phityper-kombat-v1';
export function readKombatBest(storage) {
  try {
    const candidate = JSON.parse(storage.getItem(SAVE_KEY) || 'null');
    if (!candidate || !Number.isFinite(candidate.score) || !Number.isInteger(candidate.wins)) throw new Error('Invalid stats');
    return { score: Math.max(0, candidate.score), wins: Math.max(0, candidate.wins), bestCombo: Math.max(0, candidate.bestCombo || 0) };
  } catch { return { score: 0, wins: 0, bestCombo: 0 }; }
}
export function updateKombatBest(previous, battle) {
  return {
    score: Math.max(previous.score, battle.score),
    wins: previous.wins + (battle.status === 'won' ? 1 : 0),
    bestCombo: Math.max(previous.bestCombo, battle.bestCombo)
  };
}
export function saveKombatBest(storage, value) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
