import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localDayKey, previousDay, makeDailyPassage, dailyStars, emptyDaily, completeDaily,
  readDaily, dailyStreak, bestDailyStreak, earnedTrophies, TROPHIES, DAILY_HISTORY_LIMIT
} from './daily.js';
const metric = (wpm, accuracy, correct = 200) => ({ wpm, accuracy, correct });

test('daily challenge is stable for a calendar day, changes tomorrow, and is long enough', () => {
  const d1 = makeDailyPassage('2026-11-16');
  assert.equal(d1, makeDailyPassage('2026-11-16'));
  assert.notEqual(d1, makeDailyPassage('2026-11-17'));
  assert.ok(d1.length > 6000);
  assert.match(d1, /Practice|practice|typing|keyboard/);
});
test('local dates use device calendar and prior date handles month and leap transitions', () => {
  assert.equal(localDayKey(new Date(2026, 10, 16, 22, 5)), '2026-11-16');
  assert.equal(previousDay('2026-03-01'), '2026-02-28');
  assert.equal(previousDay('2024-03-01'), '2024-02-29');
  assert.equal(previousDay('2027-01-01'), '2026-12-31');
});
test('daily stars do not reward empty typing and have meaningful thresholds', () => {
  assert.equal(dailyStars(metric(200, 100, 0)), 0);
  assert.equal(dailyStars(metric(50, 79, 200)), 0);
  assert.equal(dailyStars(metric(15, 90)), 1);
  assert.equal(dailyStars(metric(30, 95)), 2);
  assert.equal(dailyStars(metric(50, 98)), 3);
  assert.equal(dailyStars(metric(60, 97)), 2);
});
test('daily replay retains strongest attempt and is limited to one day per date', () => {
  let p = completeDaily(emptyDaily(), '2026-11-16', metric(30, 95));
  assert.equal(p.days['2026-11-16'].stars, 2);
  const repeat = completeDaily(p, '2026-11-16', metric(20, 90));
  assert.equal(repeat, p);
  p = completeDaily(p, '2026-11-16', metric(55, 99));
  assert.deepEqual(p.days['2026-11-16'], {stars:3, wpm:55, accuracy:99});
  assert.equal(Object.keys(p.days).length, 1);
});
test('daily streaks skip missed days, can include yesterday, and require earned stars', () => {
  let p = emptyDaily();
  for (const day of ['2026-11-14','2026-11-15','2026-11-16']) {
    p = completeDaily(p, day, metric(20, 85));
  }
  assert.equal(dailyStreak(p, '2026-11-16'), 3);
  assert.equal(dailyStreak(p, '2026-11-17'), 3);
  assert.equal(dailyStreak(p, '2026-11-18'), 0);
  assert.equal(bestDailyStreak(p), 3);
  p = completeDaily(p, '2026-11-19', metric(25, 85));
  assert.equal(bestDailyStreak(p), 3);
});
test('streaks and trophies are earned across existing persisted scores', () => {
  let daily = emptyDaily();
  for (const day of ['2026-11-14','2026-11-15','2026-11-16']) daily = completeDaily(daily, day, metric(55, 99));
  const badges = earnedTrophies({
    profile:{sessions:16, cleared:[0,1,2,3,4,5,6,7,8], best:{ sprint:{wpm:61, accuracy:94} }},
    precision:{history:[]}, daily
  });
  assert.equal(badges.length, TROPHIES.length);
  assert.equal(badges.find(t => t.id === 'black').earned, true);
  assert.equal(badges.find(t => t.id === 'speed').earned, true);
  assert.equal(badges.find(t => t.id === 'three').earned, true);
  assert.equal(badges.find(t => t.id === 'seven').earned, false);
  assert.equal(badges.find(t => t.id === 'master').earned, true);
});
test('local storage rejects invalid records and caps the history', () => {
  assert.deepEqual(readDaily({getItem:()=>'{oops'}),emptyDaily());
  const days = {};
  for(let day=1;day<=250;day++){
    const d = new Date(Date.UTC(2026,0,day));
    days[d.toISOString().slice(0,10)] = {stars:1,wpm:22,accuracy:88};
  }
  days['2026-11-99'] = {stars:9,wpm:-1,accuracy:200};
  const p = readDaily({getItem:()=>JSON.stringify({days})});
  assert.ok(Object.keys(p.days).length <= DAILY_HISTORY_LIMIT);
  assert.equal(p.days['2026-11-99'], undefined);
});

test('Storm Chaser trophy unlocks from Word Rain locally saved best clear count', () => {
  const args={profile:{sessions:0,best:{},cleared:[]},precision:{history:[]},daily:emptyDaily()};
  const before=earnedTrophies({...args,rain:{words:9}});
  const after=earnedTrophies({...args,rain:{words:10}});
  assert.equal(before.find(t=>t.id==='storm').earned,false);
  assert.equal(after.find(t=>t.id==='storm').earned,true);
  assert.equal(TROPHIES.length,9);
});
