import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, MODES, makeTarget, calculateStats, isLessonPassed, countCombo, readProfile, finishProfile, highestUnlocked } from './game.js';
test('all nine belts have useful original exercises', () => {
  assert.equal(LESSONS.length, 9);
  assert.equal(new Set(LESSONS.map((l) => l.title)).size, 9);
  for (const lesson of LESSONS) assert.ok(lesson.text.length > 35);
});
test('all four modes provide meaningful typing passages', () => {
  for (const mode of MODES) assert.ok(makeTarget(mode.id, 0).length > 50);
});
test('accuracy counts actual keystrokes including mistakes', () => {
  const score = calculateStats('abcd', 'abxd', 60000, 6, 2);
  assert.equal(score.correct, 3);
  assert.equal(score.wpm, 1);
  assert.equal(score.accuracy, 67);
  assert.equal(score.progress, 100);
});
test('initial stats are valid and finite', () => {
  const score = calculateStats('hello', '', 0);
  assert.equal(score.wpm, 0);
  assert.equal(score.accuracy, 100);
});
test('dojo requires finishing and meeting goals', () => {
  const lesson = LESSONS[0];
  assert.equal(isLessonPassed(lesson.text, lesson.text, { wpm: 12, accuracy: 96 }, lesson), true);
  assert.equal(isLessonPassed(lesson.text, lesson.text, { wpm: 2, accuracy: 96 }, lesson), false);
  assert.equal(isLessonPassed(lesson.text, '', { wpm: 20, accuracy: 100 }, lesson), false);
});
test('combo respects latest uncorrected letter', () => {
  assert.equal(countCombo('abcdef', 'abcxef'), 2);
  assert.equal(countCombo('abc', 'abc'), 3);
});
test('local storage fallback and progression work', () => {
  assert.deepEqual(readProfile({ getItem: () => '{broken' }), { cleared: [], best: {}, sessions: 0 });
  const first = finishProfile({ cleared: [], best: {}, sessions: 0 }, 'dojo', 0, { wpm: 15, accuracy: 95 }, true);
  assert.equal(highestUnlocked(first.cleared), 1);
  const replay = finishProfile(first, 'dojo', 0, { wpm: 10, accuracy: 88 }, false);
  assert.equal(replay.best['dojo-0'].wpm, 15);
  assert.deepEqual(replay.cleared, [0]);
});
