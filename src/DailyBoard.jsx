import React from 'react';
import {
  DAILY_SECONDS, TROPHIES, dailyStreak, bestDailyStreak, earnedTrophies
} from './daily.js';

function StarRow({ count, label }) {
  return <div className="daily-stars" role="img" aria-label={label || count + ' of 3 stars earned'}>
    {[0,1,2].map(index => <span key={index} className={index < count ? 'star-earned' : 'star-empty'} aria-hidden="true">★</span>)}
  </div>;
}

export default function DailyBoard({ dayKey, daily, profile, precision }) {
  const record = daily.days[dayKey];
  const trophies = earnedTrophies({profile, precision, daily});
  const earned = trophies.filter(item => item.earned).length;
  const activeStreak = dailyStreak(daily, dayKey);
  const longestStreak = bestDailyStreak(daily);
  const daysPlayed = Object.values(daily.days).filter(record => record.stars > 0).length;
  const title = new Date(dayKey + 'T12:00:00').toLocaleDateString(undefined, {
    weekday:'long',month:'long',day:'numeric',year:'numeric'
  });

  return <section className="daily-section" aria-label="Daily Dojo challenge and trophies">
    <div className="section-head">
      <div><span className="section-kicker">02 / A NEW CHALLENGE EVERY DAY</span><h2>Daily Dojo<span>.</span></h2></div>
      <p>One day, one passage. Your best attempt counts.</p>
    </div>
    <div className="daily-shell">
      <div className="daily-hero">
        <div className="daily-hero-left">
          <span className="daily-overline">Φ TODAY'S MISSION · {title}</span>
          <h3>Show up. Sharpen up.<br/><em>Find your flow.</em></h3>
          <p>Same passage for every visitor on the same local calendar date. You get {DAILY_SECONDS} seconds to type as well as you can. Replay whenever you like.</p>
          <div className="daily-mission-pills"><span>{DAILY_SECONDS}-SECOND SPRINT</span><span>3 STARS TO EARN</span><span>NO ACCOUNT</span></div>
          <a href="#daily-arena" className="daily-cta">{record ? 'REPLAY TODAY’S QUEST' : 'TRY TODAY’S QUEST'} <span aria-hidden="true">↗</span></a>
        </div>
        <div className="daily-hero-right">
          <div className="daily-star-halo" aria-hidden="true">✷</div>
          <span>YOUR BEST TODAY</span>
          <StarRow count={record?.stars || 0} />
          <strong>{record ? record.wpm + ' WPM' : 'Unclaimed'}</strong>
          <small>{record ? record.accuracy + '% accuracy' : 'Your first star is waiting.'}</small>
        </div>
      </div>
      <div className="daily-stats">
        <div><span>CURRENT STREAK</span><strong>{activeStreak}<small> days</small></strong></div>
        <div><span>BEST STREAK</span><strong>{longestStreak}<small> days</small></strong></div>
        <div><span>DAYS WITH STARS</span><strong>{daysPlayed}</strong></div>
        <div><span>TROPHIES EARNED</span><strong>{earned}<small> / {TROPHIES.length}</small></strong></div>
      </div>
      <div className="daily-rules">
        <div className="daily-rules-heading"><strong>HOW TO EARN STARS</strong><span>Each tier includes the previous one.</span></div>
        <div className="daily-rule-grid">
          <div><span className="rule-star">★</span><strong>FIRST STAR</strong><p>At least 30 correct characters and 80% accuracy.</p></div>
          <div><span className="rule-star">★★</span><strong>SECOND STAR</strong><p>At least 30 WPM and 95% accuracy.</p></div>
          <div><span className="rule-star">★★★</span><strong>THIRD STAR</strong><p>At least 50 WPM and 98% accuracy.</p></div>
        </div>
      </div>
    </div>
    <div className="daily-trophies">
      <div className="daily-trophy-heading">
        <div><span className="section-kicker">THE ACHIEVEMENT CABINET</span><h3>Your trophy shelf<span>.</span></h3></div>
        <p>{earned} of {TROPHIES.length} earned · Old dojo records count too!</p>
      </div>
      <div className="daily-trophy-grid">
        {trophies.map(trophy => <div key={trophy.id}
          className={'daily-trophy' + (trophy.earned ? ' earned' : ' locked')}
          title={trophy.description}>
          <span className="trophy-glyph" aria-hidden="true">{trophy.icon}</span>
          <div><strong>{trophy.name}</strong><small>{trophy.description}</small></div>
          <span className="trophy-status" aria-label={trophy.earned ? 'Earned' : 'Not yet earned'}>{trophy.earned ? '✓' : '○'}</span>
        </div>)}
      </div>
    </div>
  </section>;
}
