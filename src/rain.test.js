import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RAIN_WORDS, RAIN_LIVES, blankRain, rainReducer, rainLevel,
  spawnEveryMs, fallDurationMs, targetRainWord, rainStats,
  emptyRainRecord, completeRainRecord, readRainRecord
} from './rain.js';
const start = (time=1000) => rainReducer(blankRain(),{type:'START',now:time});
function typeWord(state, id, time=2000) {
  const word = state.active.find(x => x.id === id).word;
  for (let i=1;i<=word.length;i++)
    state = rainReducer(state,{type:'TYPE',value:word.slice(0,i),now:time+i*12});
  return state;
}
test('word bank is varied and all words are typable', () => {
  assert.ok(RAIN_WORDS.length >= 50);
  assert.ok(new Set(RAIN_WORDS).size === RAIN_WORDS.length);
  assert.ok(RAIN_WORDS.every(w=>/^[a-z]+$/.test(w)));
});
test('game starts with 3 lives and one falling word',()=>{
  const p=start();
  assert.equal(p.status,'running');assert.equal(p.lives,RAIN_LIVES);
  assert.equal(p.active.length,1);assert.equal(p.nextId,1);
  assert.equal(rainReducer(p,{type:'START',now:2000}),p);
});
test('correct letters target a word, full word scores and increases combo',()=>{
  let p=start();
  const first=p.active[0].word;
  p=rainReducer(p,{type:'TYPE',value:first[0],now:1100});
  assert.equal(p.typed,first[0]);
  p=typeWord({...p,typed:''},0);
  assert.equal(p.active.length,0);
  assert.equal(p.clears,1);assert.equal(p.combo,1);
  assert.ok(p.score>100);
  assert.equal(p.correctChars,first.length);
});
test('mistypes reset typed input and streak but do not steal a life',()=>{
  let p=start();
  p=rainReducer(p,{type:'TYPE',value:'1',now:1100});
  assert.equal(p.typed,'');assert.equal(p.mistakes,1);
  assert.equal(p.lives,RAIN_LIVES);assert.equal(p.combo,0);
});
test('backspace does not increment strokes and can correct a partial word',()=>{
  let p=start(),w=p.active[0].word;
  p=rainReducer(p,{type:'TYPE',value:w.slice(0,2),now:1100});
  const strokes=p.strokes;
  p=rainReducer(p,{type:'TYPE',value:w[0],now:1200});
  assert.equal(p.strokes,strokes);
  assert.equal(p.typed,w[0]);
});
test('rain spawns at intervals, falls, and costs a life on ground collision',()=>{
  let p=start(1000);
  for(let i=1;i<=55;i++)p=rainReducer(p,{type:'TICK',now:1000+i*250});
  assert.ok(p.active.some(x=>x.y>0));
  assert.ok(p.nextId>1);
  assert.ok(p.misses>=1);
  assert.equal(p.lives,RAIN_LIVES-p.misses);
});
test('pause suspends game state and resume does not punish idle time',()=>{
  let p=start(1000);
  p=rainReducer(p,{type:'PAUSE',now:1250});
  assert.equal(p.status,'paused');
  const same=rainReducer(p,{type:'TICK',now:8000000});
  assert.equal(same,p);
  p=rainReducer(p,{type:'RESUME',now:8000000});
  assert.equal(p.status,'running');
  const next=rainReducer(p,{type:'TICK',now:8000100});
  assert.ok(next.active[0].y<2);
});
test('most urgent matching word is selected and selected target remains sticky',()=>{
  const p={...start(),active:[
    {id:1,word:'star',lane:0,y:5},{id:2,word:'start',lane:1,y:65}
  ],selectedId:null};
  assert.equal(targetRainWord(p,'st').id,2);
  assert.equal(targetRainWord({...p,selectedId:1},'sta').id,1);
});
test('difficulty and fall duration grow progressively with a safe floor',()=>{
  assert.equal(rainLevel(0),1);assert.equal(rainLevel(7),2);
  assert.equal(rainLevel(700),9);
  assert.ok(spawnEveryMs(3)<spawnEveryMs(1));
  assert.ok(fallDurationMs(3)<fallDurationMs(1));
  assert.ok(fallDurationMs(99)>=4000);
});
test('defeat ends the game, blocks input, and scores stay finite',()=>{
  let p=start();
  p={...p,lives:1,active:[{...p.active[0],y:99.9}],lastTickAt:1000};
  p=rainReducer(p,{type:'TICK',now:1250});
  assert.equal(p.status,'over');assert.equal(p.lives,0);
  assert.equal(rainReducer(p,{type:'TYPE',value:'x',now:1300}),p);
  assert.equal(rainStats(p,1300).wpm,0);
});
test('records preserve best results and invalid storage safely defaults',()=>{
  const r=completeRainRecord(emptyRainRecord(),{score:500,clears:5,bestCombo:3});
  assert.deepEqual(r,{score:500,words:5,combo:3,runs:1});
  assert.deepEqual(completeRainRecord(r,{score:10,clears:1,bestCombo:1}),{score:500,words:5,combo:3,runs:2});
  assert.deepEqual(readRainRecord({getItem(){throw Error('denied')}}),emptyRainRecord());
});

test('paused wall-clock time is excluded from elapsed speed and stopping while paused', () => {
  let p = start(1000);
  p = rainReducer(p, {type:'PAUSE', now:2000});
  assert.equal(rainStats(p,1000000).elapsed,1000);
  p = rainReducer(p, {type:'RESUME', now:1000000});
  assert.equal(rainStats(p,1001000).elapsed,2000);
  p = rainReducer(p, {type:'PAUSE', now:1001000});
  p = rainReducer(p, {type:'END', now:2000000});
  assert.equal(rainStats(p,2000000).elapsed,2000);
});
