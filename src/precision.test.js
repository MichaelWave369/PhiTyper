import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyPrecision, readPrecision, recordKeypresses, rankWeakKeys, focusKeys,
  makePrecisionDrill, completePrecisionSession, totalObserved, precisionKeyStats,
  practiceFeedback, ACCURACY_GOAL
} from './precision.js';

test('fresh users start with safe home-row training', () => {
  const p = emptyPrecision();
  assert.deepEqual(focusKeys(p), ['a','s','d']);
  assert.equal(totalObserved(p), 0);
  assert.equal(rankWeakKeys(p).length, 0);
});

test('mistypes are attributed to the expected letter and include uppercase', () => {
  const p = recordKeypresses(emptyPrecision(), 'Apple. Zebra', '', 'Appxe. Z');
  assert.deepEqual(p.keys.a, { attempts: 1, errors: 0 });
  assert.deepEqual(p.keys.l, { attempts: 1, errors: 1 });
  assert.deepEqual(p.keys.z, { attempts: 1, errors: 0 });
  assert.equal(totalObserved(p), 6);
  assert.equal(precisionKeyStats(p, 'l').accuracy, 0);
});

test('backspace is not counted as a new keystroke and can retry after a typo', () => {
  const p = recordKeypresses(emptyPrecision(), 'cat', '', 'cx');
  const back = recordKeypresses(p, 'cat', 'cx', 'c');
  assert.equal(back, p);
  const correction = recordKeypresses(back, 'cat', 'c', 'ca');
  assert.deepEqual(correction.keys.a, { attempts: 2, errors: 1 });
  assert.equal(precisionKeyStats(correction, 'a').accuracy, 50);
});

test('weak key rankings require samples and errors, break ties predictably', () => {
  const p = { ...emptyPrecision(), keys: {
    x: { attempts: 10, errors: 5 }, a: { attempts: 100, errors: 6 },
    q: { attempts: 2, errors: 2 }, b: { attempts: 10, errors: 0 },
    z: { attempts: 10, errors: 6 }
  }};
  assert.deepEqual(rankWeakKeys(p).map(x => x.key), ['z','x','a']);
  assert.deepEqual(focusKeys(p), ['z','x','a']);
});

test('all targeted drills are stable and contain several focus letters', () => {
  for (const keys of [['a','s','d'], ['q','x','z'], ['j','k','w']]) {
    const text = makePrecisionDrill(keys, 7);
    assert.equal(text, makePrecisionDrill(keys, 7));
    assert.ok(text.length > 240);
    assert.ok(keys.some(key => text.toLowerCase().split(key).length > 10));
    assert.notEqual(text, makePrecisionDrill(keys, 8));
  }
});

test('session history is bounded and a finish increments adaptive drills only', () => {
  let p = emptyPrecision();
  for (let i = 0; i < 25; i++) {
    p = completePrecisionSession(p, i % 2 ? 'precision' : 'sprint', { wpm: i, accuracy: 80 + i % 21 });
  }
  assert.equal(p.history.length, 12);
  assert.equal(p.drills, 12);
  assert.equal(p.history[0].wpm, 13);
  assert.equal(ACCURACY_GOAL, 98);
  assert.match(practiceFeedback(98), /goal achieved/i);
});

test('stored profile is sanitized, bounded, and corrupt storage does not throw', () => {
  const storage = {getItem: () => JSON.stringify({
    keys: {a: { attempts: 8, errors: 2 }, b: { attempts: 2, errors: 3 }, '<script>': {attempts: 1, errors:1 }},
    history: [{ mode: 'sprint', wpm: 61, accuracy: 94 }, { mode: 'zen', wpm: -2, accuracy: 120 }],
    drills: 3
  })};
  const p = readPrecision(storage);
  assert.deepEqual(Object.keys(p.keys), ['a']);
  assert.equal(p.history.length, 1);
  assert.equal(p.drills, 3);
  assert.deepEqual(readPrecision({getItem(){throw new Error('blocked');}}), emptyPrecision());
});
