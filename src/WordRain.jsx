import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
  RAIN_LIVES, blankRain, rainReducer, rainLevel, rainStats,
  readRainRecord, writeRainRecord, completeRainRecord
} from './rain.js';

const icon = { cloud:'☁', bolt:'ϟ', star:'★' };

export default function WordRain({ onRecordChange }) {
  const [game, dispatch] = useReducer(rainReducer, undefined, blankRain);
  const [clock, setClock] = useState(() => Date.now());
  const [record, setRecord] = useState(() => typeof window === 'undefined'
    ? { score:0, words:0, combo:0, runs:0 } : readRainRecord(window.localStorage));
  const inputRef = useRef(null);
  const recorded = useRef(false);
  const running = game.status === 'running';
  const ready = game.status === 'ready';
  const paused = game.status === 'paused';
  const ended = game.status === 'over';
  const stats = rainStats(game, clock);
  const level = rainLevel(game.clears);
  const urgent = [...game.active].sort((a,b) => b.y-a.y)[0];
  const selected = game.active.find(drop => drop.id === game.selectedId);
  const message = game.message;

  useEffect(() => { onRecordChange?.(record); }, [record, onRecordChange]);

  useEffect(() => {
    if (!running) return;
    // Input is enabled only after React commits the running state.
    inputRef.current?.focus();
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClock(now);
      dispatch({ type: 'TICK', now });
    }, 100);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const visibilityChanged = () => {
      if (document.hidden) dispatch({ type: 'PAUSE', now: Date.now() });
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => document.removeEventListener('visibilitychange', visibilityChanged);
  }, []);

  useEffect(() => {
    if (!ended || recorded.current) return;
    recorded.current = true;
    setRecord(previous => {
      const next = completeRainRecord(previous, game);
      writeRainRecord(window.localStorage, next);
      return next;
    });
  }, [ended, game]);

  function begin() {
    const now = Date.now();
    setClock(now);
    dispatch({ type: 'START', now });
  }
  function pauseOrResume() {
    const now = Date.now();
    setClock(now);
    dispatch({ type: paused ? 'RESUME' : 'PAUSE', now });
  }
  function reset() {
    recorded.current = false;
    dispatch({ type:'RESTART', now: Date.now() });
    setClock(Date.now());
  }
  function stop() {
    const now = Date.now();
    setClock(now);
    dispatch({ type:'END', now });
  }
  function type(event) {
    // Word Rain is a letters-only game; period-spacing settings and belt saves are untouched.
    const value = event.target.value.toLowerCase().replace(/[^a-z]/g, '');
    dispatch({ type:'TYPE', value, now:Date.now() });
  }
  return <section className="arena-section rain-section" aria-label="Word Rain typing arcade">
    <div className="section-head">
      <div><span className="section-kicker">02 / REACTION ARCADE</span><h2>Word Rain<span>.</span></h2></div>
      <p>Type them before they fall. Find your rhythm.</p>
    </div>
    <div className="rain-shell">
      <div className="rain-header">
        <div><span className="rain-overline">Φ PHITYPER ARCADE · ENDLESS SURVIVAL</span><h3>CATCH THE WORDS. SAVE THE SKY.</h3></div>
        <div className="rain-record"><span>PERSONAL BEST</span><strong>{record.score.toLocaleString()}</strong><small>{record.runs} completed runs</small></div>
      </div>
      <div className="rain-hud">
        <div><span>SCORE</span><strong>{game.score.toLocaleString()}</strong></div>
        <div><span>CLEARED</span><strong>{game.clears}</strong></div>
        <div><span>LEVEL</span><strong>{level}<small> / 9</small></strong></div>
        <div><span>COMBO</span><strong>{game.combo}<small> x</small></strong></div>
        <div className="rain-hearts"><span>LIVES</span><strong aria-label={game.lives + ' of ' + RAIN_LIVES + ' lives'}>{'♥'.repeat(game.lives)}<i>{'♡'.repeat(RAIN_LIVES - game.lives)}</i></strong></div>
      </div>
      <div className={'rain-field' + (paused ? ' is-paused' : '') + (ended ? ' is-over' : '')}>
        <div className="rain-orbit orbit-one" aria-hidden="true"/>
        <div className="rain-orbit orbit-two" aria-hidden="true"/>
        <div className="rain-cloud cloud-one" aria-hidden="true">{icon.cloud}</div>
        <div className="rain-cloud cloud-two" aria-hidden="true">{icon.cloud}</div>
        <div className="rain-cloud cloud-three" aria-hidden="true">{icon.cloud}</div>
        <div className="rain-falls" aria-hidden="true"/>
        <div className="rain-grid-lines" aria-hidden="true"/>
        <div className="rain-danger-line" aria-hidden="true"/>
        {game.active.map(drop => {
          const targeted = selected?.id === drop.id;
          const dangerous = drop.y >= 72;
          return <div key={drop.id}
            className={'rain-drop' + (targeted ? ' is-targeted' : '') + (dangerous ? ' is-dangerous' : '')}
            style={{top: Math.min(drop.y,97)+'%',left:(1+drop.lane*33)+'%'}}>
            <span aria-hidden="true" className="rain-drop-dot">✧</span>
            {targeted
              ? <span className="rain-drop-word">{drop.word.split('').map((ch,i)=>
                <span className={i<game.typed.length?'rain-hit-letter':''} key={i}>{ch}</span>)}</span>
              : <span className="rain-drop-word">{drop.word}</span>}
          </div>;
        })}
        {ready && <div className="rain-overlay">
          <div className="rain-overlay-symbol" aria-hidden="true">☁</div>
          <span>THE STORM IS COMING</span>
          <h4>MAKE EVERY KEY COUNT.</h4>
          <p>Words fall in three lanes. Type any word to clear it. Each word that hits the ground costs one life.</p>
          <button className="rain-main-button" onClick={begin} type="button">START WORD RAIN <span aria-hidden="true">↗</span></button>
        </div>}
        {paused && <div className="rain-overlay">
          <span>GAME PAUSED</span><h4>THE CLOUDS CAN WAIT.</h4>
          <p>Take a break. Your words will be right where you left them.</p>
          <button className="rain-main-button" onClick={pauseOrResume} type="button">RESUME RAIN <span aria-hidden="true">↗</span></button>
        </div>}
        {ended && <div className="rain-overlay">
          <span>STORM SURVIVED FOR {Math.floor(stats.elapsed / 1000)} SECONDS</span>
          <h4>THE SKY WINS THIS ROUND!</h4>
          <p>{game.clears} words cleared · {game.score.toLocaleString()} points · best combo {game.bestCombo}x</p>
          <button className="rain-main-button" onClick={reset} type="button">PLAY AGAIN <span aria-hidden="true">↗</span></button>
        </div>}
      </div>
      <div className="rain-controls">
        <div className="rain-target-hint">
          <div><strong>{running ? selected ? 'LOCKED ON' : 'TYPE ANY FALLING WORD' : 'YOUR NEXT CHALLENGE'}</strong>
            <span>{running ? selected ? 'Finish the glowing word!' : urgent ? 'Closest to landing: ' + urgent.word.toUpperCase() : 'New words incoming!' : 'Start the game to wake up your keyboard.'}</span></div>
          <div className="rain-arcade-actions">
            {(running || paused) && <button type="button" onClick={pauseOrResume}>{paused ? '▶ RESUME' : 'Ⅱ PAUSE'}</button>}
            {(running || paused) && <button type="button" className="rain-end-button" onClick={stop}>END RUN</button>}
          </div>
        </div>
        <input className="rain-input" ref={inputRef} type="text" value={game.typed}
          disabled={!running} onChange={type} onPaste={e => e.preventDefault()}
          onKeyDown={e => {
            if (e.key === 'Escape') {e.preventDefault();pauseOrResume();}
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder={running ? 'Type falling words here...' : 'Start or resume to type'}
          aria-label="Type any falling word to clear it"
          autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}/>
        <div className="rain-feedback" role="status" aria-live="polite">{message}</div>
        <div className="rain-lower-stats">
          <div><span>WORDS PER MINUTE</span><strong>{stats.wpm}</strong></div>
          <div><span>KEY ACCURACY</span><strong>{stats.accuracy}%</strong></div>
          <div><span>WORDS MISSED</span><strong>{game.misses}</strong></div>
          <div><span>LONGEST COMBO</span><strong>{game.bestCombo}x</strong></div>
        </div>
        <div className="rain-rule-line">TYPE ANY VISIBLE WORD · BACKSPACE TO CORRECT · PRESS ESC TO PAUSE · DON'T LET WORDS HIT THE FLOOR</div>
      </div>
    </div>
  </section>;
}
