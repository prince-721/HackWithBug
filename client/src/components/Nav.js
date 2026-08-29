import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { 
  LayoutDashboard, 
  Code2, 
  PlaySquare, 
  Trophy, 
  Keyboard, 
  User, 
  ShieldAlert, 
  LogOut, 
  ChevronDown, 
  Flame, 
  Award,
  PlusCircle,
  BarChart3
} from 'lucide-react';


import Logo from './Logo';
import './Nav.css';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hide nav on landing page when not logged in, or in full-screen contest arena / practice / problem workspaces
  if (!user && loc.pathname === '/') return null;
  if (loc.pathname.startsWith('/contest/')) return null;
  if (loc.pathname.startsWith('/problem/')) return null;
  if (loc.pathname.startsWith('/practice')) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isFaculty = user?.role === 'faculty';

  // Distinct navigation links for Faculty vs Student
  const navLinks = isFaculty ? [
    { label: 'Faculty Console', path: '/dev', icon: <LayoutDashboard size={15} /> },
    { label: 'Problem Bank', path: '/problems', icon: <Code2 size={15} /> },
    { label: 'Plagiarism AI', path: '/dev/plagiarism', icon: <ShieldAlert size={15} /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={15} /> },
  ] : [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={15} /> },
    { label: 'Problems', path: '/problems', icon: <Code2 size={15} /> },
    { label: 'Practice', path: '/practice', icon: <PlaySquare size={15} /> },
    { label: 'Typing', path: '/typing', icon: <Keyboard size={15} /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={15} /> },
  ];

  return (
    <nav className="main-nav">
      <Link to={user ? (isFaculty ? '/dev' : '/dashboard') : '/'} className="nav-brand" style={{ textDecoration: 'none' }}>
        <Logo size={28} withText={true} />
      </Link>


      {user && (
        <>
          <div className="nav-links">
            {navLinks.map(({ label, path, icon }) => {
              const isActive = loc.pathname === path || (path !== '/dashboard' && path !== '/dev' && loc.pathname.startsWith(path));
              return (
                <Link key={path} to={path} className={`nav-item ${isActive ? 'active' : ''}`}>
                  {icon}
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="nav-right">
            {/* Student-only Streak Counter & Rating Pill */}
            {!isFaculty && (
              <>
                {user.streak > 0 && (
                  <div className="nav-streak-pill" title={`${user.streak}-day streak! Keep solving.`} onClick={() => navigate(`/profile/${user.enrollment}`)}>
                    <Flame size={14} color="#f97316" />
                    <span>{user.streak}d</span>
                  </div>
                )}

                <div className="nav-rating-pill" title="Competitive Programming Rating">
                  <span>⭐</span>
                  <span>{user.rating || 1200}</span>
                </div>
              </>
            )}

            {/* Academic Honor Code Flag / Warning Indicator */}
            {user.academicStatus === 'flagged' && (
              <span
                className="badge"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={user.flaggedReason || 'Account Flagged for Academic Honor Code Violation'}
              >
                🚩 Account Flagged (Red)
              </span>
            )}
            {user.academicStatus === 'warning' && (
              <span
                className="badge"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  border: '1px solid #f59e0b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={user.flaggedReason || 'Academic Warning Active'}
              >
                ⚠️ Academic Warning
              </span>
            )}

            {/* Faculty Badge */}
            {isFaculty && (
              <span className="badge badge-purple" style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}>
                🎓 Faculty Portal
              </span>
            )}

            <NotificationBell />

            {/* User Dropdown */}
            <div className="nav-user-menu" ref={dropdownRef}>
              <button
                className="nav-user-toggle"
                onClick={() => setOpen(o => !o)}
                style={{
                  border: user.academicStatus === 'flagged' ? '1px solid #ef4444' : user.academicStatus === 'warning' ? '1px solid #f59e0b' : undefined,
                  background: user.academicStatus === 'flagged' ? 'rgba(239, 68, 68, 0.08)' : undefined
                }}
              >
                <div
                  className="nav-avatar-btn"
                  style={{
                    boxShadow: user.academicStatus === 'flagged' ? '0 0 8px rgba(239, 68, 68, 0.5)' : undefined,
                    border: user.academicStatus === 'flagged' ? '2px solid #ef4444' : undefined
                  }}
                >
                  {user.avatar || (user.name ? user.name[0] : 'U')}
                </div>
                <span className="nav-user-name" style={{ color: user.academicStatus === 'flagged' ? '#ef4444' : undefined }}>
                  {user.name?.split(' ')[0]}
                </span>
                <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
              </button>

              {open && (
                <div className="nav-dropdown">
                  <div className="nav-drop-user-header">
                    <div className="nav-drop-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{user.name}</span>
                      {user.academicStatus === 'flagged' && (
                        <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 800 }}>🚩 FLAGGED</span>
                      )}
                    </div>
                    <div className="nav-drop-sub">
                      {user.enrollment} · {isFaculty ? 'Professor / Faculty' : `Sem ${user.semester || 5}`}
                    </div>
                  </div>

                  {isFaculty ? (
                    <>
                      <Link to="/dev" className="nav-drop-item" onClick={() => setOpen(false)}>
                        <BarChart3 size={14} />
                        <span>Faculty Console</span>
                      </Link>

                      <Link to="/dev/problem/new" className="nav-drop-item" onClick={() => setOpen(false)}>
                        <PlusCircle size={14} />
                        <span>Create Problem</span>
                      </Link>

                      <Link to="/dev/contest/new" className="nav-drop-item" onClick={() => setOpen(false)}>
                        <Award size={14} />
                        <span>Schedule Contest</span>
                      </Link>

                      <Link to="/dev/plagiarism" className="nav-drop-item" onClick={() => setOpen(false)}>
                        <ShieldAlert size={14} />
                        <span>Plagiarism Reports</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to={`/profile/${user.enrollment}`} className="nav-drop-item" onClick={() => setOpen(false)}>
                        <User size={14} />
                        <span>My Profile & Codolio</span>
                      </Link>
                    </>
                  )}

                  <hr className="nav-divider" />

                  <button className="nav-drop-item danger" style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }} onClick={handleLogout}>
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!user && (
        <div className="nav-right">
          <Link to="/login"><button className="btn btn-ghost btn-sm">Log in</button></Link>
          <Link to="/login"><button className="btn btn-primary btn-sm">Get started</button></Link>
        </div>
      )}
    </nav>
  );
}


