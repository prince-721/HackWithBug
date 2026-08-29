import React from 'react';
import './Logo.css';

/**
 * Modern Cybernetic Bug Logo Component for HackWithBug
 * @param {{ size?: 'sm' | 'md' | 'lg' | 'xl' | number, withText?: boolean, subtitle?: string, className?: string }} props
 */
export default function Logo({ size = 'md', withText = true, subtitle = '', className = '' }) {
  const pixelSizes = {
    sm: 24,
    md: 32,
    lg: 44,
    xl: 64
  };

  const dim = typeof size === 'number' ? size : pixelSizes[size] || 32;

  return (
    <div className={`hwb-logo-wrapper ${className}`}>
      <div className="hwb-logo-mark" style={{ width: dim, height: dim }}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="hwb-logo-svg"
        >
          <defs>
            {/* Primary Neon Gradient */}
            <linearGradient id="hwb-primary-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            {/* Glowing Accent Gradient */}
            <linearGradient id="hwb-glow-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.9" />
            </linearGradient>

            {/* Shield Body Gradient */}
            <linearGradient id="hwb-shield-bg" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id="hwb-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Glow Aura */}
          <circle cx="50" cy="50" r="42" fill="url(#hwb-primary-grad)" opacity="0.12" filter="blur(6px)" />

          {/* Outer Shield Shell */}
          <path
            d="M 50 14 L 78 28 L 72 66 L 50 88 L 28 66 L 22 28 Z"
            fill="url(#hwb-shield-bg)"
            stroke="url(#hwb-primary-grad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Circuit Antennae */}
          <path
            d="M 40 14 L 32 4 M 32 4 L 26 4 M 60 14 L 68 4 M 68 4 L 74 4"
            stroke="#00f0ff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="26" cy="4" r="2" fill="#00f0ff" />
          <circle cx="74" cy="4" r="2" fill="#00f0ff" />

          {/* Cybernetic Insect Legs */}
          {/* Top Legs */}
          <path d="M 22 34 L 10 26 M 78 34 L 90 26" stroke="url(#hwb-glow-grad)" strokeWidth="2" strokeLinecap="round" />
          {/* Middle Legs */}
          <path d="M 24 50 L 8 50 M 76 50 L 92 50" stroke="url(#hwb-glow-grad)" strokeWidth="2" strokeLinecap="round" />
          {/* Bottom Legs */}
          <path d="M 28 66 L 14 76 M 72 66 L 86 76" stroke="url(#hwb-glow-grad)" strokeWidth="2" strokeLinecap="round" />

          {/* Inner Wing Armor Plates */}
          <path
            d="M 50 22 L 70 32 L 66 60 L 50 78 L 34 60 L 30 32 Z"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Central Vertical Division Line */}
          <line x1="50" y1="22" x2="50" y2="78" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" strokeDasharray="2 2" />

          {/* Central Coding Brackets Symbol < / > */}
          <g filter="url(#hwb-neon-glow)">
            {/* Left Bracket < */}
            <path
              d="M 43 42 L 35 50 L 43 58"
              stroke="#00f0ff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Slash / */}
            <path
              d="M 52 40 L 48 60"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Right Bracket > */}
            <path
              d="M 57 42 L 65 50 L 57 58"
              stroke="#00f0ff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Subtle Circuit Nodes */}
          <circle cx="50" cy="22" r="2.5" fill="#a855f7" />
          <circle cx="50" cy="78" r="2" fill="#00f0ff" />
        </svg>
      </div>

      {withText && (
        <div className="hwb-logo-text-group">
          <span className="hwb-logo-text">
            hack<span className="hwb-logo-highlight">with</span>bug
          </span>
          {subtitle && <span className="hwb-logo-subtitle">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
