import test from 'node:test';
import assert from 'node:assert/strict';
import { FIGHTS, MAX_ENERGY, createBattle, currentWord, battleReducer, battleStats, readKombatBest, updateKombatBest } from './kombat.js';
const start = (now = 1000) => battleReducer(createBattle(), { type: 'START', now });
function typeWord(state, now = 2000) {
  const word = currentWord(state);
  for (let i = 1; i <= word.length; i += 1) {
    state = battleReducer(state, { type: 'TYPE', value: word.slice(0, i), now: now + i * 10 });
  }
  return state;
}
test('three different enemy rounds and fair words exist', () => {
  assert.equal(FIGHTS.length, 3);
  for (const fight of FIGHTS) {
    assert.ok(fight.words.length > 6);
    assert.ok(fight.words.every((word) => /^[a-z]+$/.test(word)));
    assert.ok(fight.hp > 0 && fight.interval > 2000);
  }
});
test('starts only once, correct word strikes, and combo increases', () => {
  let battle = start();
  assert.equal(battle.status, 'fighting');
  const startedAt = battle.startedAt;
  battle = typeWord(battle);
  assert.ok(battle.enemyHp < FIGHTS[0].hp);
  assert.equal(battle.combo, 1);
  assert.equal(battle.words, 1);
  assert.equal(battle.correctChars, 3);
  assert.equal(battle.startedAt, startedAt);
  assert.equal(battleReducer(battle, { type:'START', now:5000 }), battle);
});
test('mistakes cause counterattacks, not an unfinishable input', () => {
  let battle = start();
  battle = battleReducer(battle, { type:'TYPE', value:'x', now:1400 });
  assert.equal(battle.playerHp, 94);
  assert.equal(battle.typed, '');
  assert.equal(battle.mistakes, 1);
  assert.equal(battle.combo, 0);
  battle = typeWord(battle);
  assert.equal(battle.words, 1);
  assert.ok(battleStats(battle, 3000).accuracy < 100);
});
test('backspace is safe and does not reverse error history', () => {
  let battle = start();
  battle = battleReducer(battle, { type:'TYPE', value:'j', now:1100 });
  battle = battleReducer(battle, { type:'TYPE', value:'', now:1110 });
  assert.equal(battle.typed, '');
  assert.equal(battle.strokes, 1);
});
test('enemy counter timer cannot attack too early or after completion', () => {
  let battle = start();
  assert.equal(battleReducer(battle, { type:'TICK', now:1200 }), battle);
  battle = battleReducer(battle, { type:'TICK', now:7701 });
  assert.equal(battle.playerHp, 92);
  assert.equal(battle.lastAttackAt, 7701);
  battle = battleReducer(battle, { type:'TICK', now:7702 });
  assert.equal(battle.playerHp, 92);
});
test('special requires full energy, then deals damage and spends energy', () => {
  let battle = start();
  assert.equal(battleReducer(battle, { type:'SPECIAL', now:2000 }), battle);
  battle = { ...battle, enemyHp: 90, energy: MAX_ENERGY };
  const result = battleReducer(battle, { type:'SPECIAL', now:3000 });
  assert.equal(result.energy, 0);
  assert.equal(result.enemyHp, 54);
  assert.equal(result.specials, 1);
});
test('winning all three rounds preserves cumulative score and determines victory', () => {
  let battle = start();
  for (let round = 0; round < FIGHTS.length; round += 1) {
    let limit = 60;
    while (battle.status === 'fighting' && limit-- > 0) battle = typeWord(battle, 2000 + round * 50000 + (60-limit) * 150);
    assert.ok(limit > 0, 'round can finish');
    if (round < FIGHTS.length - 1) {
      assert.equal(battle.status, 'cleared');
      const score = battle.score;
      battle = battleReducer(battle, { type:'NEXT', now:9000 + round * 50000 });
      assert.equal(battle.round, round + 1);
      assert.equal(battle.status, 'fighting');
      assert.equal(battle.score, score);
    }
  }
  assert.equal(battle.status, 'won');
  assert.ok(battle.endedAt > 0);
  const frozen = battleReducer(battle, { type:'TICK', now:900000 });
  assert.equal(frozen, battle);
});
test('losing records defeat and cannot keep typing after KO', () => {
  let battle = start();
  for (let i = 0; i < 20 && battle.status === 'fighting'; i += 1)
    battle = battleReducer(battle, { type:'TYPE', value:'z', now:1000 + i * 100 });
  assert.equal(battle.status, 'lost');
  assert.equal(battle.playerHp, 0);
  assert.equal(battleReducer(battle, { type:'TYPE', value:'j', now:5000 }), battle);
});
test('best scores survive invalid browser storage and only wins count as wins', () => {
  assert.deepEqual(readKombatBest({ getItem: () => 'broken' }), { score: 0, wins: 0, bestCombo: 0 });
  const b = { ...createBattle(), score: 350, bestCombo: 7, status:'won' };
  const best = updateKombatBest({ score: 200, wins: 2, bestCombo: 3 }, b);
  assert.deepEqual(best, { score: 350, wins: 3, bestCombo: 7 });
  assert.equal(updateKombatBest(best, {...b, score: 50, status: 'lost'}).wins, 3);
});
