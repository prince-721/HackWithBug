import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Nav.css';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user && loc.pathname === '/') return null;

  const handleLogout = () => { logout(); navigate('/'); };
  const active = (p) => loc.pathname === p || loc.pathname.startsWith(p + '/');

  return (
    <nav className="nav">
      <Link to={user ? '/dashboard' : '/'} className="nav-logo">
        <div className="nav-logo-icon">⌨</div>
        <span className="nav-brand">hack<span>with</span>bug</span>
      </Link>
      {user && (
        <>
          <div className="nav-links">
            <Link to="/dashboard" className={active('/dashboard') ? 'active' : ''}>Dashboard</Link>
            <Link to="/problems" className={active('/problems') ? 'active' : ''}>Problems</Link>
            <Link to="/leaderboard" className={active('/leaderboard') ? 'active' : ''}>Leaderboard</Link>
            {user.role === 'faculty' && <Link to="/dev" className={active('/dev') ? 'active' : ''}>Dev Console</Link>}
          </div>
          <div className="nav-right">
            <Link to={`/profile/${user.enrollment}`}>
              <div className="nav-avatar">{user.avatar}</div>
            </Link>
            <div className="nav-menu-wrap" onMouseLeave={() => setMenuOpen(false)}>
              <button className="nav-name" onClick={() => setMenuOpen(!menuOpen)}>{user.name} ▾</button>
              {menuOpen && (
                <div className="nav-dropdown">
                  <Link to={`/profile/${user.enrollment}`} onClick={() => setMenuOpen(false)}>My Profile</Link>
                  {user.role === 'faculty' && <Link to="/dev" onClick={() => setMenuOpen(false)}>Dev Console</Link>}
                  <hr />
                  <button onClick={handleLogout}>Sign out</button>
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
