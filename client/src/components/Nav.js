import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  // Hide nav on landing page when not logged in
  if (!user && loc.pathname === '/') return null;

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav style={styles.nav}>
      <Link to={user ? '/dashboard' : '/'} style={styles.logo}>
        <div style={styles.logoIcon}>⌨</div>
        <span style={styles.logoBrand}>hack<span style={{color:'#7F77DD'}}>with</span>bug</span>
      </Link>

      {user && (
        <>
          <div style={styles.links}>
            {[['Dashboard','/dashboard'],['Problems','/problems'],
              ...(user.role==='student'?[['Practice','/practice']]:[]),
              ['Leaderboard','/leaderboard'],
              ...(user.role==='faculty'?[['Dev Console','/dev']]:[])]
              .map(([label,path]) => (
              <Link key={path} to={path} style={{...styles.link, ...(loc.pathname.startsWith(path)?styles.linkActive:{})}}>
                {label}
              </Link>
            ))}
          </div>
          <div style={styles.right}>
            <NotificationBell />
            <Link to={`/profile/${user.enrollment}`}>
              <div style={styles.avatar}>{user.avatar}</div>
            </Link>
            <div style={{position:'relative'}}>
              <button style={styles.nameBtn} onClick={()=>setOpen(o=>!o)}>
                {user.name.split(' ')[0]} ▾
              </button>
              {open && (
                <div style={styles.dropdown} onMouseLeave={()=>setOpen(false)}>
                  <Link to={`/profile/${user.enrollment}`} style={styles.dropItem} onClick={()=>setOpen(false)}>👤 My Profile</Link>
                  {user.role==='faculty' && <Link to="/dev" style={styles.dropItem} onClick={()=>setOpen(false)}>📊 Dev Console</Link>}
                  <Link to="/dev/plagiarism" style={styles.dropItem} onClick={()=>setOpen(false)}>🛡 Plagiarism</Link>
                  <hr style={{border:'none',borderTop:'0.5px solid #eee',margin:'4px 0'}}/>
                  <button style={{...styles.dropItem,border:'none',background:'none',cursor:'pointer',color:'#E24B4A',width:'100%',textAlign:'left'}} onClick={handleLogout}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!user && (
        <div style={styles.right}>
          <Link to="/login"><button style={styles.btnGhost}>Log in</button></Link>
          <Link to="/login"><button style={styles.btnPrimary}>Get started</button></Link>
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav:{display:'flex',alignItems:'center',padding:'0 1.5rem',height:'56px',background:'#ffffff',borderBottom:'0.5px solid rgba(0,0,0,.1)',position:'sticky',top:0,zIndex:50,gap:'12px'},
  logo:{display:'flex',alignItems:'center',gap:'8px',textDecoration:'none'},
  logoIcon:{width:32,height:32,background:'#7F77DD',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'15px',flexShrink:0},
  logoBrand:{fontSize:'15px',fontWeight:700,color:'#1a1a18'},
  links:{display:'flex',gap:'2px',marginLeft:'12px'},
  link:{fontSize:'13px',color:'#5F5E5A',padding:'5px 12px',borderRadius:'6px',textDecoration:'none'},
  linkActive:{background:'#F8F8F6',color:'#1a1a18'},
  right:{marginLeft:'auto',display:'flex',alignItems:'center',gap:'8px'},
  avatar:{width:30,height:30,borderRadius:'50%',background:'#EEEDFE',color:'#534AB7',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,cursor:'pointer'},
  nameBtn:{border:'none',background:'transparent',fontSize:'13px',color:'#5F5E5A',cursor:'pointer',padding:'4px 8px',borderRadius:'6px'},
  dropdown:{position:'absolute',right:0,top:'calc(100% + 4px)',background:'#fff',border:'0.5px solid rgba(0,0,0,.1)',borderRadius:'12px',padding:'6px',minWidth:'180px',boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:100,display:'flex',flexDirection:'column',gap:'2px'},
  dropItem:{display:'block',padding:'8px 10px',fontSize:'13px',color:'#5F5E5A',borderRadius:'6px',textDecoration:'none'},
  btnGhost:{fontSize:'12px',padding:'6px 14px',borderRadius:'6px',border:'0.5px solid rgba(0,0,0,.18)',background:'transparent',color:'#1a1a18',cursor:'pointer'},
  btnPrimary:{fontSize:'12px',padding:'6px 14px',borderRadius:'6px',border:'none',background:'#7F77DD',color:'#fff',cursor:'pointer',fontWeight:500},
};
