import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Login.css';

export default function Login() {
  const [tab, setTab] = useState('login');
  const [enrollment, setEnrollment] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (!enrollment || !password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      if (tab === 'login') {
        const user = await login(enrollment, password);
        toast.success(`Welcome back, ${user.name}!`);
        navigate(user.role === 'faculty' ? '/dev' : '/dashboard');
      } else {
        if (!name) return toast.error('Enter your name');
        const user = await register(enrollment, password, name, role);
        toast.success(`Account created! Welcome, ${user.name}`);
        navigate(user.role === 'faculty' ? '/dev' : '/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><div className="login-logo-icon">⌨</div><span>hack<b>with</b>bug</span></div>
        <div className="login-tabs">
          <button className={tab==='login'?'active':''} onClick={()=>setTab('login')}>Sign in</button>
          <button className={tab==='register'?'active':''} onClick={()=>setTab('register')}>Create account</button>
        </div>
        <div className="domain-note">🔒 Restricted to <strong>@paruluniversity.ac.in</strong></div>
        <form onSubmit={handle}>
          {tab==='register' && <div className="field"><label>Full name</label><input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="Yash Patel" /></div>}
          <div className="field">
            <label>Enrollment number</label>
            <div className="email-row">
              <input className="inp" style={{borderRadius:'7px 0 0 7px',borderRight:'none'}} value={enrollment} onChange={e=>setEnrollment(e.target.value)} placeholder="21bce123" />
              <span className="email-suffix">@paruluniversity.ac.in</span>
            </div>
          </div>
          <div className="field"><label>Password</label><input className="inp" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" /></div>
          {tab==='register' && (
            <div className="field">
              <label>I am a</label>
              <div className="role-row">
                <div className={`role-opt ${role==='student'?'sel':''}`} onClick={()=>setRole('student')}><span>💻</span><span>Student</span></div>
                <div className={`role-opt ${role==='faculty'?'sel':''}`} onClick={()=>setRole('faculty')}><span>📊</span><span>Faculty</span></div>
              </div>
            </div>
          )}
          <button className="btn btn-primary" style={{width:'100%',padding:'11px',marginTop:'8px',justifyContent:'center'}} disabled={loading} type="submit">
            {loading ? 'Please wait…' : tab==='login' ? 'Sign in →' : 'Create account →'}
          </button>
        </form>
        <div className="login-demo">
          <p>Demo accounts:</p>
          <button onClick={()=>{setEnrollment('21bce123');setPassword('password123');setTab('login')}} className="demo-btn">Student: 21bce123</button>
          <button onClick={()=>{setEnrollment('pm001');setPassword('faculty123');setTab('login')}} className="demo-btn">Faculty: pm001</button>
        </div>
      </div>
    </div>
  );
}
