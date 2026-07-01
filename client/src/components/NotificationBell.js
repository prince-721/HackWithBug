// NotificationBell.js — Bell icon with dropdown in Nav
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './NotificationBell.css';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const r = await api.get('/notifications?limit=8');
      setNotifications(r.data.notifications || []);
      setUnreadCount(r.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleClick = async (n) => {
    if (!n.read) {
      try { await api.patch(`/notifications/${n.id}/read`); } catch {}
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const typeIcon = { verdict: '⚡', contest_start: '🏁', contest_end: '🏆', rank_change: '📈', announcement: '📢', plagiarism: '⚠' };
  const timeAgo = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="nb-wrap" ref={dropRef}>
      <button className="nb-btn" onClick={() => setOpen(o => !o)} aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && <span className="nb-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="nb-dropdown">
          <div className="nb-header">
            <span>Notifications</span>
            {unreadCount > 0 && <button className="nb-mark-read" onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="nb-list">
            {notifications.length === 0 ? (
              <div className="nb-empty">No notifications yet</div>
            ) : notifications.map(n => (
              <div key={n.id} className={`nb-item ${!n.read ? 'unread' : ''}`} onClick={() => handleClick(n)}>
                <div className="nb-icon">{typeIcon[n.type] || '🔔'}</div>
                <div className="nb-content">
                  <div className="nb-title">{n.title}</div>
                  <div className="nb-msg">{n.message}</div>
                  <div className="nb-time">{timeAgo(n.createdAt)}</div>
                </div>
                {!n.read && <div className="nb-dot" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
