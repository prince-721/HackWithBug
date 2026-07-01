import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('hwb_token');
    if (token) { api.get('/auth/me').then(r => setUser(r.data)).catch(() => localStorage.removeItem('hwb_token')).finally(() => setLoading(false)); }
    else setLoading(false);
  }, []);
  const login = async (enrollment, password) => { const r = await api.post('/auth/login', { enrollment, password }); localStorage.setItem('hwb_token', r.data.token); setUser(r.data.user); return r.data.user; };
  const register = async (enrollment, password, name, role) => { const r = await api.post('/auth/register', { enrollment, password, name, role }); localStorage.setItem('hwb_token', r.data.token); setUser(r.data.user); return r.data.user; };
  const logout = () => { localStorage.removeItem('hwb_token'); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
