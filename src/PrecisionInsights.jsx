import React from 'react';
import {
  PRECISION_ROWS, ACCURACY_GOAL, focusKeys, precisionKeyStats,
  rankWeakKeys, totalObserved
} from './precision.js';

function HeatKey({ profile, letter, focused }) {
  const stat = precisionKeyStats(profile, letter);
  const state = stat.accuracy === null ? 'unknown' :
    stat.accuracy < 90 ? 'hot' : stat.accuracy < ACCURACY_GOAL ? 'warm' : 'cool';
  const description = stat.accuracy === null
    ? 'Not sampled yet'
    : stat.accuracy + '% accuracy in ' + stat.attempts + ' attempts';
  return <div
    className={'precision-key heat-' + state + (focused ? ' heat-focused' : '')}
    title={letter.toUpperCase() + ': ' + description}
    aria-label={letter.toUpperCase() + ': ' + description}>
    {letter.toUpperCase()}
    {stat.attempts >= 3 && <span className="heat-key-dot" aria-hidden="true"/>}
  </div>;
}

export default function PrecisionInsights({ profile, drill, onNewDrill }) {
  const weak = rankWeakKeys(profile, 4);
  const observed = totalObserved(profile);
  const focus = drill.focus?.length ? drill.focus : focusKeys(profile);
  const history = profile.history;
  const accuracyTotal = observed === 0 ? null : Math.round(
    100 * Object.values(profile.keys).reduce((sum, item) => sum + item.attempts - item.errors, 0) / observed
  );

  return <section className="precision-section" aria-label="Precision Lab analytics">
    <div className="section-head">
      <div><span className="section-kicker">02 / PRECISION LAB</span><h2>Train what trips you up<span>.</span></h2></div>
      <p>Each mistake becomes useful practice.</p>
    </div>
    <div className="precision-shell">
      <div className="precision-head">
        <div><span className="precision-eyebrow">YOUR PERSONAL KEYBOARD MAP</span><h3>From 94% toward 98%.</h3><p>Keys are colored by accuracy, based only on practice recorded since this update.</p></div>
        <div className="precision-goal-chip"><span>PRECISION TARGET</span><strong>{ACCURACY_GOAL}%+</strong></div>
      </div>
      <div className="precision-stat-grid">
        <div><span>KEYSTROKES OBSERVED</span><strong>{observed.toLocaleString()}</strong></div>
        <div><span>LETTER ACCURACY</span><strong>{accuracyTotal === null ? '—' : accuracyTotal + '%'}</strong></div>
        <div><span>SESSIONS RECORDED</span><strong>{history.length}</strong><small>last 12 shown</small></div>
        <div><span>ADAPTIVE DRILLS</span><strong>{profile.drills}</strong></div>
      </div>
      <div className="precision-columns">
        <div className="precision-map-wrap">
          <h4>ACCURACY HEATMAP</h4>
          <p>Pink needs attention · amber is improving · green is steady.</p>
          <div className="precision-map" role="group" aria-label="Accuracy by keyboard letter">
            {PRECISION_ROWS.map((row, i) => <div className={'precision-map-row map-row-' + i} key={row}>
              {[...row].map(letter => <HeatKey key={letter} letter={letter} profile={profile} focused={focus.includes(letter)} />)}
            </div>)}
          </div>
          <div className="precision-legend">
            <span><i className="legend-unknown"/> No data</span>
            <span><i className="legend-hot"/> Below 90%</span>
            <span><i className="legend-warm"/> 90–97%</span>
            <span><i className="legend-cool"/> 98%+</span>
          </div>
        </div>
        <aside className="precision-focus">
          <div className="precision-focus-head"><span className="precision-eyebrow">ADAPTIVE TRAINING</span><strong>{weak.length ? 'Target your toughest keys' : 'Build your baseline'}</strong></div>
          <div className="precision-focus-keys">
            {focus.map(letter => <span key={letter}>{letter.toUpperCase()}</span>)}
          </div>
          <p>{weak.length
            ? 'Your current drill targets keys with the highest observed mistake rate. Finish a drill and the next one can adapt again.'
            : 'We need a little typing data first. Start with the home-row keys, then your drills will adapt to your mistakes.'}</p>
          {weak.length > 0 && <div className="precision-hardest">
            {weak.map(({ key, rate, errors, attempts }) => <div key={key}><strong>{key.toUpperCase()}</strong><span>{rate}% errors · {errors} / {attempts}</span></div>)}
          </div>}
          <button className="precision-new-btn" onClick={onNewDrill} type="button">GENERATE NEW DRILL <span aria-hidden="true">↗</span></button>
        </aside>
      </div>
      <div className="precision-history">
        <div><h4>YOUR ACCURACY TREND</h4><p>Recent completed sessions across Dojo, Sprint, Zen, Boss Rush, and Precision Lab.</p></div>
        {history.length ? <div className="precision-history-chart" role="img" aria-label={'Recent accuracy scores: ' + history.map(item => item.accuracy + '%').join(', ')}>
          {history.map((entry, index) => <div className="precision-bar-item" key={index} title={entry.mode + ' · ' + entry.accuracy + '% · ' + entry.wpm + ' WPM'}>
            <span>{entry.accuracy}%</span>
            <div className="precision-bar-track"><div className={'precision-bar' + (entry.accuracy >= ACCURACY_GOAL ? ' target-met' : '')} style={{height: Math.max(8, entry.accuracy) + '%'}}/></div>
            <small>{index + 1}</small>
          </div>)}
        </div> : <div className="precision-empty-trend">Complete a typing session to begin your progress chart. Your existing black belt and saved WPM records are untouched.</div>}
      </div>
    </div>
  </section>;
}
