import React, { useEffect, useRef, useState } from 'react';
import Kombat from './Kombat.jsx';
import { LESSONS, MODES, makeTarget, calculateStats, countCombo, defaultProfile, finishProfile, highestUnlocked, isLessonPassed, readProfile } from './game.js';

const emptyRun = () => ({ typed: '', startedAt: null, finishedAt: null, strokes: 0, mistakes: 0 });
const KEY_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l',';'],
  ['z','x','c','v','b','n','m',',','.','/']
];

function Icon({ name, size = 20 }) {
  const paths = {
    spark: <><path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3Z"/><path d="M19 18v4m-2-2h4M4 2v4M2 4h4"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4.5 17A8 8 0 0 0 19 8l1 4M4 17v-5h5"/><path d="M5 12a8 8 0 0 1 14-5"/></>,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrow: <path d="M5 12h14m-7-7 7 7-7 7"/>,
    sound: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></>,
    mute: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Keyboard({ nextChar, lastKey }) {
  const normalized = nextChar.toLowerCase();
  return <div className="keyboard" aria-label="US QWERTY keyboard guide">
    {KEY_ROWS.map((row, ri) => <div className={'key-row row-' + ri} key={ri}>
      {row.map((key) => <span className={'key' + (normalized === key ? ' key-next' : '') + (lastKey === key ? ' key-tapped' : '')} key={key}>{key.toUpperCase()}</span>)}
    </div>)}
    <div className="key-row bottom-row">
      <span className={'key wide-key' + (nextChar && nextChar !== nextChar.toLowerCase() ? ' key-next' : '')}>SHIFT</span>
      <span className={'key space-key' + (nextChar === ' ' ? ' key-next' : '')}>SPACE</span>
      <span className="key wide-key">ENTER</span>
    </div>
  </div>;
}
function TypingText({ target, typed }) {
  // Display a rolling excerpt so speed challenges never create thousands of DOM spans.
  const page = Math.floor(typed.length / 220);
  const start = page * 220;
  const end = Math.min(target.length, start + 350);
  return <div className="typing-text" aria-hidden="true">
    {Array.from(target.slice(start, end)).map((char, offset) => {
      const index = start + offset;
      const status = index < typed.length ? (typed[index] === char ? 'hit' : 'miss') : (index === typed.length ? 'cursor' : 'ahead');
      return <span key={index} className={'letter ' + status}>{char === ' ' ? '\u00a0' : char}</span>;
    })}
  </div>;
}

export default function App() {
  const [mode, setMode] = useState('dojo');
  const [lessonIndex, setLessonIndex] = useState(0);
  const [run, setRun] = useState(emptyRun);
  const [tick, setTick] = useState(Date.now());
  const [profile, setProfile] = useState(() => typeof window === 'undefined' ? defaultProfile() : readProfile(window.localStorage));
  const [focused, setFocused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastKey, setLastKey] = useState('');
  const inputRef = useRef(null);
  const savedFinish = useRef(null);
  const audioRef = useRef(null);
  const selectedMode = MODES.find((item) => item.id === mode) || MODES[0];
  const lesson = LESSONS[lessonIndex];
  const target = makeTarget(mode, lessonIndex);
  const limit = selectedMode.duration ? selectedMode.duration * 1000 : null;
  const elapsed = run.startedAt ? Math.max(0, Math.min(limit ?? Infinity, (run.finishedAt ?? tick) - run.startedAt)) : 0;
  const score = calculateStats(target, run.typed, elapsed, run.strokes, run.mistakes);
  const combo = countCombo(target, run.typed);
  const unlocked = highestUnlocked(profile.cleared);
  const passed = mode === 'dojo' && isLessonPassed(target, run.typed, score, lesson);
  const bestKey = mode === 'dojo' ? 'dojo-' + lessonIndex : mode;
  const best = profile.best[bestKey];
  const remaining = limit === null ? null : Math.max(0, Math.ceil((limit - elapsed) / 1000));
  const current = target[run.typed.length] || '';
  const isFinished = run.finishedAt !== null;

  useEffect(() => {
    if (!run.startedAt || isFinished) return;
    const timer = window.setInterval(() => setTick(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [run.startedAt, isFinished]);

  useEffect(() => {
    if (!limit || !run.startedAt || isFinished || tick - run.startedAt < limit) return;
    setRun((prev) => prev.finishedAt ? prev : { ...prev, finishedAt: prev.startedAt + limit });
  }, [limit, run.startedAt, isFinished, tick]);

  useEffect(() => {
    if (!run.finishedAt || savedFinish.current === run.finishedAt) return;
    savedFinish.current = run.finishedAt;
    setProfile((prior) => {
      const updated = finishProfile(prior, mode, lessonIndex, score, passed);
      try { window.localStorage.setItem('phityper-progress-v1', JSON.stringify(updated)); } catch { /* privacy settings */ }
      return updated;
    });
  }, [run.finishedAt, mode, lessonIndex, score.wpm, score.accuracy, passed]);

  function playNote(isCorrect) {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioRef.current) audioRef.current = new AudioContext();
      const context = audioRef.current;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = isCorrect ? 660 : 190;
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.075);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.075);
    } catch { /* unsupported audio device */ }
  }
  function restart(nextMode = mode, nextLesson = lessonIndex) {
    setMode(nextMode);
    setLessonIndex(nextLesson);
    setRun(emptyRun());
    setLastKey('');
    setFocused(false);
    setTick(Date.now());
    savedFinish.current = null;
  }
  function activate() { if (!isFinished) inputRef.current?.focus(); }
  function handleChange(event) {
    if (isFinished) return;
    const next = event.target.value.slice(0, target.length);
    const old = run.typed;
    if (next === old) return;
    const timestamp = Date.now();
    let strokes = run.strokes;
    let mistakes = run.mistakes;
    if (next.length > old.length) {
      for (let i = old.length; i < next.length; i += 1) {
        strokes += 1;
        const correct = next[i] === target[i];
        if (!correct) mistakes += 1;
        if (i === next.length - 1) playNote(correct);
      }
    }
    setLastKey(next.length > old.length ? next.slice(-1).toLowerCase() : 'backspace');
    setRun({
      typed: next, startedAt: run.startedAt ?? timestamp,
      finishedAt: next === target ? timestamp : null, strokes, mistakes
    });
  }

  const nextUnlocked = Math.min(LESSONS.length - 1, lessonIndex + 1);
  const canAdvance = mode === 'dojo' && passed && lessonIndex < LESSONS.length - 1;
  return <div className="app-shell">
    <div className="orb orb-one" aria-hidden="true"/><div className="orb orb-two" aria-hidden="true"/>
    <header className="site-header page-width">
      <a className="brand" href="#top" aria-label="PhiTyper home"><span className="brand-mark">Φ</span><span className="brand-copy"><strong>PhiTyper</strong><small>THE KEYBOARD DOJO</small></span></a>
      <div className="header-actions"><span className="top-pill"><span className="online-dot"/> FREE TO PLAY</span><a href="https://github.com/MichaelWave369/PhiTyper" className="header-link" target="_blank" rel="noreferrer">OPEN SOURCE <Icon name="arrow" size={15}/></a></div>
    </header>
    <main id="top" className="page-width">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> TRAIN YOUR HANDS. FREE YOUR MIND.</div>
          <h1>FIND YOUR <em>FLOW.</em><br/>MASTER THE KEYS<span className="title-dot">.</span></h1>
          <p>From your very first keystroke to lightning-fast reflexes. Build speed, sharpen accuracy, and earn your black belt. One joyful session at a time.</p>
          <div className="hero-chips"><span><Icon name="check" size={15}/> 9 dojo belts</span><span><Icon name="check" size={15}/> 5 game modes</span><span><Icon name="check" size={15}/> No account needed</span></div>
        </div>
        <div className="hero-emblem" aria-hidden="true"><div className="emblem-outer"><div className="emblem-middle"><div className="emblem-inner"><span>Φ</span><small>DOJO</small></div></div></div><span className="emblem-spark spark-a">✦</span><span className="emblem-spark spark-b">✧</span></div>
      </section>
      <section className="dashboard-strip" aria-label="Your dojo overview">
        <div className="dash-stat"><div className="dash-icon"><Icon name="bolt"/></div><div><span>CURRENT BELT</span><strong>{LESSONS[unlocked]?.belt || 'White'} <small>BELT</small></strong></div></div>
        <div className="dash-stat"><div className="dash-icon"><Icon name="target"/></div><div><span>LESSONS CLEARED</span><strong>{profile.cleared.length}<small> / 9</small></strong></div></div>
        <div className="dash-stat"><div className="dash-icon"><Icon name="keyboard"/></div><div><span>DOJO SESSIONS</span><strong>{profile.sessions}</strong></div></div>
        <div className="dash-progress"><div><span>YOUR JOURNEY</span><strong>{Math.round(profile.cleared.length / 9 * 100)}%</strong></div><div className="track"><div style={{ width: (profile.cleared.length / 9 * 100) + '%' }}/></div></div>
      </section>
      <section className="section-head modes-head"><div><span className="section-kicker">01 / CHOOSE YOUR PATH</span><h2>Pick your training ground<span>.</span></h2></div><p>Different ways to grow. Same goal: better typing.</p></section>
      <nav className="mode-grid" aria-label="Typing game modes">
        {MODES.map((item) => <button key={item.id} type="button" className={'mode-card' + (mode === item.id ? ' selected' : '')} onClick={() => restart(item.id, lessonIndex)} aria-pressed={mode === item.id}>
          <span className="mode-glyph">{item.glyph}</span><span className="mode-info"><strong>{item.title}</strong><small>{item.subtitle}</small></span><span className="mode-selector">{mode === item.id ? <Icon name="check" size={15}/> : <Icon name="arrow" size={16}/>}</span>
        </button>)}
      </nav>
      {mode === 'dojo' && <section className="belts-section" aria-label="Dojo lessons">
        <div className="section-head"><div><span className="section-kicker">02 / THE BELT SYSTEM</span><h2>Nine belts. One journey<span>.</span></h2></div><p>Clear each lesson to unlock the next.</p></div>
        <div className="belt-grid">
          {LESSONS.map((item, index) => {
            const locked = index > unlocked;
            const cleared = profile.cleared.includes(index);
            return <button key={item.belt} type="button" disabled={locked} onClick={() => restart('dojo', index)}
              className={'belt-tile' + (index === lessonIndex ? ' active' : '') + (cleared ? ' completed' : '')} aria-current={index === lessonIndex ? 'step' : undefined}>
              <span className={'belt-swatch belt-' + item.belt.toLowerCase()}/><span className="belt-meta"><small>LEVEL {String(index + 1).padStart(2, '0')}</small><strong>{item.belt}</strong></span>
              <span className="belt-status">{locked ? <Icon name="lock" size={15}/> : cleared ? <Icon name="check" size={16}/> : <Icon name="arrow" size={16}/>}</span>
            </button>;
          })}
        </div>
      </section>}
      {mode === 'kombat' ? <Kombat /> : <section className="arena-section">
        <div className="section-head"><div><span className="section-kicker">{mode === 'dojo' ? '03' : '02'} / TRAINING ARENA</span><h2>Enter the dojo<span>.</span></h2></div><p>Accuracy first. Speed will follow.</p></div>
        <div className="arena">
          <div className="arena-top">
            <div className="arena-level"><span className="arena-label">{mode === 'dojo' ? 'CURRENT LESSON' : 'CURRENT CHALLENGE'}</span><h3>{mode === 'dojo' ? lesson.title : selectedMode.title}</h3><p>{mode === 'dojo' ? lesson.focus : selectedMode.subtitle}</p></div>
            <div className="arena-actions"><button type="button" className={'sound-btn' + (soundEnabled ? ' on' : '')} onClick={() => setSoundEnabled((v) => !v)} aria-label={soundEnabled ? 'Mute typing sounds' : 'Enable typing sounds'} aria-pressed={soundEnabled} title="Toggle gentle key sounds"><Icon name={soundEnabled ? 'sound' : 'mute'} size={18}/></button><button className="restart-btn" type="button" onClick={() => restart()}><Icon name="refresh" size={16}/> RESTART</button></div>
          </div>
          <div className="metrics-grid" aria-live="off">
            <div className="metric"><span>WORDS / MIN</span><strong>{score.wpm}<small> WPM</small></strong></div>
            <div className="metric"><span>ACCURACY</span><strong>{score.accuracy}<small>%</small></strong></div>
            <div className="metric"><span>{remaining !== null ? 'TIME LEFT' : 'TIME'}</span><strong>{remaining !== null ? remaining : Math.floor(elapsed / 1000)}<small> SEC</small></strong></div>
            <div className="metric"><span>COMBO</span><strong>{combo}<small> HITS</small></strong></div>
          </div>
          <div className="target-header"><span><Icon name="spark" size={15}/> {isFinished ? 'SESSION COMPLETE' : 'YOUR TARGET'}</span><span>{score.progress}% COMPLETE</span></div>
          <div className="progress-bar"><div style={{ width: score.progress + '%' }}/></div>
          <div className="typing-stage" onClick={activate} role="presentation">
            <TypingText target={target} typed={run.typed}/>
            <label htmlFor="dojo-input" className="input-label">{isFinished ? 'Session complete' : focused ? 'Keep typing below to follow the highlighted letters' : 'Click START TYPING, then follow the glowing cursor'}</label>
            <input id="dojo-input" ref={inputRef} className="typing-input" type="text" value={run.typed}
              disabled={isFinished} onChange={handleChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
              onPaste={(event) => event.preventDefault()} aria-label="Type the displayed passage here"
              autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder={isFinished ? 'Challenge ended' : 'Start typing here...'}/>
          </div>
          {!run.startedAt && !isFinished && <div className="start-row"><button type="button" className="start-btn" onClick={activate}>START TYPING <Icon name="arrow" size={18}/></button><span>The clock starts on your first key.</span></div>}
          <div className="keyboard-heading"><Icon name="keyboard" size={16}/><span>KEYBOARD GUIDE</span><span className="keyboard-caption">GLOW = NEXT KEY</span></div>
          <Keyboard nextChar={current} lastKey={lastKey}/>
          {mode === 'dojo' && <div className="lesson-goal"><Icon name="target" size={17}/><span>TO EARN THIS BELT</span><strong>{lesson.targetWpm}+ WPM</strong><b>·</b><strong>{lesson.targetAccuracy}%+ ACCURACY</strong>{best && <span className="best-record">BEST {best.wpm} WPM / {best.accuracy}%</span>}</div>}
          {isFinished && <div className={'result-panel' + (passed ? ' victory' : '')} role="status" aria-live="polite">
            <div className="result-medallion">{passed ? '★' : mode === 'dojo' ? '↻' : '✦'}</div>
            <div className="result-copy"><span>{passed ? 'BELT EARNED!' : mode === 'dojo' ? 'TRAINING COMPLETE' : 'ROUND COMPLETE'}</span><h3>{passed ? 'Beautiful work, keyboard warrior.' : mode === 'dojo' ? 'Every attempt makes you stronger.' : 'Your fingers found their rhythm.'}</h3><p>{score.wpm} WPM · {score.accuracy}% accuracy · {run.mistakes} missed keystrokes{mode === 'dojo' && !passed ? '. Reach both belt targets to advance.' : '.'}</p></div>
            <div className="result-buttons">{canAdvance && <button className="next-btn" onClick={() => restart('dojo', nextUnlocked)}>NEXT BELT <Icon name="arrow" size={15}/></button>}<button className="again-btn" onClick={() => restart()}>TRY AGAIN</button></div>
          </div>}
        </div>
      </section>}
      <section className="footer-panels">
        <div className="footer-panel"><span className="panel-icon">◎</span><div><strong>Practice beats perfection.</strong><p>Even five minutes a day can help build muscle memory. Take breaks, relax your shoulders, and let your hands learn.</p></div></div>
        <div className="footer-panel"><span className="panel-icon">◈</span><div><strong>Your progress belongs to you.</strong><p>Personal bests and belts are saved only in this browser. No ads, accounts, or tracking. Clearing site data resets your progress.</p></div></div>
      </section>
    </main>
    <footer className="site-footer page-width"><div><span className="footer-phi">Φ</span> PHITYPER DOJO <span className="footer-muted">© 2026 · BUILT FOR EVERYBODY</span></div><span>PEOPLE ABOVE PROFIT. PRACTICE ABOVE PRESSURE.</span></footer>
  </div>;
}
