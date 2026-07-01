import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const FEATURES = {
  student: [
    { icon: '🏆', title: 'Live contests', desc: 'Join timed contests with real-time leaderboard and ICPC-style scoring.' },
    { icon: '📈', title: 'Rating system', desc: 'ELO-based rating that updates after every contest. Watch your rank climb.' },
    { icon: '✨', title: 'AI feedback', desc: 'Every wrong answer gets a specific hint — which line failed and why.' },
    { icon: '🔥', title: 'Streak tracking', desc: 'Daily solve streaks, badges, and XP to keep you consistent.' },
    { icon: '👤', title: 'Public profile', desc: 'Codolio-style profile with heatmap, rating graph, and skill tags.' },
    { icon: '📚', title: 'AI editorials', desc: 'Groq-powered editorials unlock 24h after contest ends.' },
  ],
  faculty: [
    { icon: '✏️', title: 'Problem editor', desc: 'Create problems with markdown, test cases, and custom checkers.' },
    { icon: '📅', title: 'Contest scheduler', desc: 'Set start time, duration, allowed languages, and invite by batch.' },
    { icon: '📹', title: 'Live proctoring', desc: 'Camera + mic monitoring via browser API. No extension needed.' },
    { icon: '🛡', title: 'Plagiarism AI', desc: 'K-gram hash + AST + Groq semantic analysis post-contest.' },
    { icon: '📊', title: 'Analytics', desc: 'Per-problem solve rates, cohort skill heatmap, submission trends.' },
    { icon: '📋', title: 'Export results', desc: 'Download rankings as CSV with all scores and metadata.' },
  ],
  ai: [
    { icon: '🤖', title: 'Groq LLaMA 70B', desc: 'Ultra-fast AI feedback on every wrong submission in under 2 seconds.' },
    { icon: '🧮', title: 'Partial credit', desc: 'AI scores 0–100 based on test cases passed and algorithm correctness.' },
    { icon: '🔍', title: 'Hash similarity', desc: 'Rolling k-gram fingerprinting compares code live during contest.' },
    { icon: '💬', title: 'AI chat assistant', desc: 'Ask the AI for hints, explain concepts, debug strategies.' },
    { icon: '⚡', title: 'Problem generator', desc: 'Describe an idea in plain English — AI writes the full problem.' },
    { icon: '🎯', title: 'Skill inference', desc: 'AI tags problems and builds your personal topic mastery map.' },
  ],
};

export default function Landing() {
  const [tab, setTab] = React.useState('student');
  return (
    <div className="landing">
      {/* NAV */}
      <nav className="l-nav">
        <div className="l-logo"><div className="l-logo-icon">⌨</div><span>hack<b>with</b>bug</span></div>
        <div className="l-nav-links"><a href="#features">Features</a><a href="#login">Sign in</a></div>
        <div className="l-nav-right">
          <Link to="/login"><button className="btn btn-ghost btn-sm">Log in</button></Link>
          <Link to="/login"><button className="btn btn-primary btn-sm">Get started</button></Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="l-hero">
        <div className="l-badge">✨ AI-assisted · VGEC CE Dept · Parul University</div>
        <h1>Code. Compete.<br /><span className="l-accent">Climb.</span></h1>
        <p>The competitive programming platform for Parul University students — live judge, AI feedback, Codolio-style profiles, and proctored faculty contests.</p>
        <div className="l-hero-btns">
          <Link to="/login"><button className="btn btn-primary" style={{padding:'12px 28px',fontSize:'15px'}}>Start coding for free →</button></Link>
          <Link to="/login"><button className="btn btn-ghost" style={{padding:'12px 28px',fontSize:'15px'}}>Host a contest</button></Link>
        </div>
      </section>

      {/* STATS */}
      <div className="l-stats">
        {[['1,200+','Students registered'],['340','Problems in bank'],['48','Contests hosted'],['98.4%','Judge uptime']].map(([v,l]) => (
          <div key={l} className="l-stat"><div className="l-stat-val">{v}</div><div className="l-stat-label">{l}</div></div>
        ))}
      </div>

      {/* FEATURES */}
      <section className="l-features" id="features">
        <div className="l-section-label">Platform features</div>
        <div className="l-section-title">Everything you'd expect, and more</div>
        <div className="l-tabs">
          {['student','faculty','ai'].map(t => (
            <button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>
              {t==='student'?'For students':t==='faculty'?'For faculty':'AI layer'}
            </button>
          ))}
        </div>
        <div className="l-feat-grid">
          {FEATURES[tab].map(f => (
            <div key={f.title} className="l-feat-card">
              <div className="l-feat-icon">{f.icon}</div>
              <div className="l-feat-title">{f.title}</div>
              <div className="l-feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* LOGIN CTA */}
      <section className="l-cta" id="login">
        <div className="l-cta-card">
          <h2>Ready to compete?</h2>
          <p>Join with your Parul University email and start solving in under 60 seconds.</p>
          <Link to="/login"><button className="btn btn-primary" style={{padding:'12px 32px',fontSize:'15px',marginTop:'1rem'}}>Sign in with Parul email →</button></Link>
          <div className="l-cta-note">🔒 Only @paruluniversity.ac.in emails accepted</div>
        </div>
      </section>

      <footer className="l-footer">
        <div><strong style={{color:'var(--purple)'}}>hackwithbug</strong> · VGEC CE Department · Parul University · 2025</div>
        <div className="l-footer-links"><Link to="/login">Sign in</Link></div>
      </footer>
    </div>
  );
}
