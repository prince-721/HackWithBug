import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Nav from './components/Nav';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Problems from './pages/Problems';
import ContestArena from './pages/ContestArena';
import Leaderboard from './pages/Leaderboard';
import DevDashboard from './pages/DevDashboard';
import ProblemEditor from './pages/ProblemEditor';
import PlagiarismReport from './pages/PlagiarismReport';
import Practice from './pages/Practice';
import ContestWizard from './pages/ContestWizard';
import TypingSpeedTest from './pages/TypingSpeedTest';
import './App.css';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/dashboard" />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/profile/:enrollment" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/problems" element={<PrivateRoute><Problems /></PrivateRoute>} />
        <Route path="/contest/:id" element={<PrivateRoute><ContestArena /></PrivateRoute>} />
        <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
        <Route path="/practice" element={<PrivateRoute><Practice /></PrivateRoute>} />
        <Route path="/typing" element={<PrivateRoute><TypingSpeedTest /></PrivateRoute>} />
        <Route path="/dev" element={<PrivateRoute role="faculty"><DevDashboard /></PrivateRoute>} />
        <Route path="/dev/contest/:id?" element={<PrivateRoute role="faculty"><ContestWizard /></PrivateRoute>} />
        <Route path="/dev/problem/:id?" element={<PrivateRoute role="faculty"><ProblemEditor /></PrivateRoute>} />
        <Route path="/dev/plagiarism/:contestId?" element={<PrivateRoute role="faculty"><PlagiarismReport /></PrivateRoute>} />
        <Route path="*" element={<div className="not-found"><h1>404</h1><p>Page not found</p></div>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          style:{ background:'#fff', color:'#1a1a18', border:'0.5px solid rgba(0,0,0,.1)', fontSize:'13px' }
        }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
