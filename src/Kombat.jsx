import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
  FIGHTS, MAX_HP, MAX_ENERGY, battleReducer, battleStats, createBattle,
  currentWord, readKombatBest, saveKombatBest, updateKombatBest
} from './kombat.js';

function Meter({ label, value, max, tone = 'lime', right = false }) {
  const percent = Math.max(0, Math.min(100, value / max * 100));
  return <div className={'combat-meter ' + (right ? 'enemy-meter' : '')}>
    <div className="combat-meter-label"><strong>{label}</strong><span>{value} / {max}</span></div>
    <div className="combat-meter-track" role="progressbar" aria-label={label + ' health'} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={'combat-meter-fill meter-' + tone} style={{ width: percent + '%' }} />
    </div>
  </div>;
}

function Fighter({ side, round, motion }) {
  return <div aria-hidden="true" className={'combat-figure ' + side + ' enemy-rank-' + round + (motion ? ' motion-' + motion : '')}>
    <div className="fighter-shadow"/>
    <div className="fighter-glow"/>
    <div className="fighter-silhouette">
      <div className="fighter-head"><span className="fighter-eyes"/></div>
      <div className="fighter-torso"/>
      <div className="fighter-arm arm-back"><i className="fighter-fist"/></div>
      <div className="fighter-arm arm-front"><i className="fighter-fist"/></div>
      <div className="fighter-leg leg-left"/><div className="fighter-leg leg-right"/>
      <div className="fighter-belt"/>
    </div>
  </div>;
}

const STATUS_TEXT = {
  counter: 'MISTYPE! THE ENEMY COUNTERS −6 HP',
  enemy: 'TOO SLOW! THE ENEMY STRIKES',
  punch: 'CLEAN HIT! NICE WORK',
  combo: 'COMBO ATTACK! BONUS DAMAGE',
  knockout: 'K.O.! THE ROUND IS YOURS',
  special: 'PHI BURST! CRITICAL HIT',
  start: 'FIGHT! TYPE THE GLOWING WORD',
  ready: 'READY YOUR HANDS'
};

export default function Kombat() {
  const [battle, dispatch] = useReducer(battleReducer, undefined, createBattle);
  const [now, setNow] = useState(Date.now());
  const [best, setBest] = useState(() => {
    if (typeof window === 'undefined') return { score: 0, wins: 0, bestCombo: 0 };
    return readKombatBest(window.localStorage);
  });
  const inputRef = useRef(null);
  const savedRef = useRef(false);
  const fight = FIGHTS[battle.round];
  const word = currentWord(battle);
  const stats = battleStats(battle, now);
  const running = battle.status === 'fighting';
  const finished = battle.status === 'won' || battle.status === 'lost';
  const eventActive = now - battle.lastEventAt < 550;
  const hitPlayer = eventActive && (battle.lastEvent === 'enemy' || battle.lastEvent === 'counter');
  const hitEnemy = eventActive && ['punch', 'combo', 'knockout', 'special'].includes(battle.lastEvent);
  const nextAttack = running ? Math.max(0, Math.ceil((fight.interval - (now - battle.lastAttackAt)) / 1000)) : null;

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      dispatch({ type: 'TICK', now: timestamp });
    }, 100);
    return () => window.clearInterval(interval);
  }, [running]);

  // Starting or advancing enables the input only after React commits the next render.
  // Focusing it inside the button handler happens too early while it is still disabled.
  useEffect(() => {
    if (running) inputRef.current?.focus();
  }, [running, battle.round]);

  useEffect(() => {
    if (!finished || savedRef.current) return;
    savedRef.current = true;
    const updated = updateKombatBest(best, battle);
    saveKombatBest(window.localStorage, updated);
    setBest(updated);
  }, [finished, battle, best]);

  function start() {
    const timestamp = Date.now();
    dispatch({ type: 'START', now: timestamp });
    setNow(timestamp);
    inputRef.current?.focus();
  }
  function next() {
    const timestamp = Date.now();
    dispatch({ type: 'NEXT', now: timestamp });
    setNow(timestamp);
    inputRef.current?.focus();
  }
  function restart() {
    dispatch({ type: 'RESTART' });
    savedRef.current = false;
    setNow(Date.now());
  }
  function special() {
    if (!running || battle.energy < MAX_ENERGY) return;
    const timestamp = Date.now();
    dispatch({ type: 'SPECIAL', now: timestamp });
    setNow(timestamp);
    inputRef.current?.focus();
  }
  function type(event) {
    const value = event.target.value.toLowerCase().replace(/[^a-z]/g, '');
    dispatch({ type: 'TYPE', value, now: Date.now() });
  }

  return <section className="arena-section kombat-section" aria-label="Typing Kombat arcade game">
    <div className="section-head">
      <div><span className="section-kicker">02 / THE ARCADE ARENA</span><h2>Typing Kombat<span>.</span></h2></div>
      <p>Each word is a punch. Every streak builds power.</p>
    </div>
    <div className="kombat-shell">
      <div className="kombat-topline">
        <div><span className="kombat-kicker">Φ PHITYPER ARCADE</span><h3>THE THREE TRIALS</h3></div>
        <div className="kombat-records">
          <span>HIGH SCORE <strong>{best.score.toLocaleString()}</strong></span>
          <span>VICTORIES <strong>{best.wins}</strong></span>
          <span>BEST COMBO <strong>{best.bestCombo}x</strong></span>
        </div>
      </div>
      <div className="combat-hud">
        <Meter label="YOU · KEYBOARD WARRIOR" value={battle.playerHp} max={MAX_HP} />
        <div className="combat-versus"><span>ROUND {battle.round + 1} / {FIGHTS.length}</span><strong>VS</strong></div>
        <Meter label={fight.name} value={battle.enemyHp} max={fight.hp} tone="rose" right />
      </div>

      <div className={'combat-stage stage-' + fight.id}>
        <div className="combat-sun"/><div className="combat-horizon"/><div className="combat-floor"/>
        <div className="combat-pill combat-pill-left">Φ WARRIOR</div>
        <div className="combat-pill combat-pill-right">{fight.name}</div>
        <Fighter side="hero-fighter" round={battle.round} motion={hitPlayer ? 'hurt' : hitEnemy ? 'punch' : ''}/>
        <Fighter side="rival-fighter" round={battle.round} motion={hitEnemy ? 'hurt' : hitPlayer ? 'punch' : ''}/>
        {hitEnemy && <span key={battle.lastEventAt + '-enemy'} className="combat-impact impact-right">{battle.lastEvent === 'special' ? 'Φ BURST!' : battle.lastEvent === 'knockout' ? 'K.O.!' : 'POW!'}</span>}
        {hitPlayer && <span key={battle.lastEventAt + '-player'} className="combat-impact impact-left">COUNTER!</span>}
        <div className="combat-arena-caption"><span>{fight.title}</span><span>WORDS WIN FIGHTS</span></div>
      </div>

      <div className="combat-control">
        <div className="combat-stage-info">
          <div><span className="combat-micro">CURRENT CHALLENGE</span><strong>{fight.flavor}</strong></div>
          <div className="combat-clock"><span>ENEMY ATTACKS IN</span><strong>{nextAttack == null ? '—' : nextAttack + 's'}</strong></div>
        </div>

        <div className="combat-word-panel">
          <div className="combat-word-caption"><span>TYPE TO ATTACK</span><span>{battle.combo > 1 ? battle.combo + 'x COMBO' : 'BUILD YOUR COMBO'}</span></div>
          <div className="combat-target" aria-label={'Target word: ' + word} aria-live="off">
            {word.split('').map((char, index) => <span key={index} className={index < battle.typed.length ? 'typed-letter' : index === battle.typed.length && running ? 'next-letter' : ''}>{char}</span>)}
          </div>
          <label className="combat-input-label" htmlFor="kombat-input">Type the displayed word exactly. Mistakes reset the word and cost 6 HP.</label>
          <input id="kombat-input" className="combat-input" ref={inputRef} value={battle.typed}
            onChange={type} onPaste={(event) => event.preventDefault()}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); special(); } }}
            disabled={!running} type="text" aria-label="Attack by typing the word above"
            autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            placeholder={running ? 'Type here to throw punches...' : 'Start the fight to unlock your keyboard'} />
        </div>

        <div className="combat-feedback" role="status" aria-live="polite">{STATUS_TEXT[battle.lastEvent]}{battle.lastEvent === 'enemy' ? ' −' + fight.damage + ' HP' : ''}</div>
        <div className="combat-stat-grid">
          <div><span>SCORE</span><strong>{battle.score.toLocaleString()}</strong></div>
          <div><span>WORDS</span><strong>{battle.words}</strong></div>
          <div><span>SPEED</span><strong>{stats.wpm} <small>WPM</small></strong></div>
          <div><span>ACCURACY</span><strong>{stats.accuracy}<small>%</small></strong></div>
          <div><span>COMBO</span><strong>{battle.combo}<small>x</small></strong></div>
        </div>
        <div className="combat-special-row">
          <div className="combat-special-meter">
            <div className="combat-special-title"><span>Φ SPECIAL ENERGY</span><strong>{battle.energy}%</strong></div>
            <div className="combat-energy-track" role="progressbar" aria-label="Special energy" aria-valuenow={battle.energy} aria-valuemin={0} aria-valuemax={MAX_ENERGY}>
              <div style={{ width: battle.energy + '%' }}/>
            </div>
          </div>
          <button className="combat-special-button" onClick={special} disabled={!running || battle.energy < MAX_ENERGY} type="button">
            Φ BURST <small>ENTER KEY</small>
          </button>
        </div>
        <div className="combat-game-actions">
          {battle.status === 'ready' && <button className="combat-cta" onClick={start}>START FIGHT <span>↗</span></button>}
          {battle.status === 'cleared' && <div className="combat-result"><div><strong>ROUND CLEARED!</strong><span>The next opponent is waiting.</span></div><button className="combat-cta" onClick={next}>NEXT ROUND <span>↗</span></button></div>}
          {finished && <div className="combat-result"><div><strong>{battle.status === 'won' ? 'CHAMPION! YOU BEAT THE SENSEI.' : 'K.O.! TRAIN AGAIN, WARRIOR.'}</strong><span>{battle.score.toLocaleString()} points · {battle.words} words · {battle.bestCombo}x best combo</span></div><button className="combat-cta" onClick={restart}>PLAY AGAIN <span>↗</span></button></div>}
          {battle.status !== 'ready' && !finished && <button type="button" className="combat-restart" onClick={restart}>RESTART TRIALS</button>}
        </div>
      </div>
    </div>
    <div className="combat-help">
      <div><strong>THE RULES</strong><p>Correct word = punch. Every third consecutive word earns combo damage. A typo costs 6 HP and breaks your streak. Enemies attack when their countdown reaches zero.</p></div>
      <div><strong>THE SPECIAL</strong><p>Correct words charge the Φ Burst meter. When it reaches 100%, press <kbd>Enter</kbd> or tap <b>Φ BURST</b> to deliver a powerful strike. Beat all three rounds to win.</p></div>
    </div>
  </section>;
}
