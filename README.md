# 🚀 hackwithbug — AI-Assisted Competitive Programming Platform

Built with React + Node.js/Express + Groq API (LLaMA 70B)

## Tech Stack
- **Frontend:** React, React Router v7, Chart.js, react-hot-toast, Axios
- **Backend:** Node.js, Express, JWT auth, bcryptjs
- **AI:** Groq API (llama-3.3-70b-versatile) — feedback, plagiarism, problem generation
- **Auth:** Restricted to @paruluniversity.ac.in emails only

## Quick Start

### 1. Get Groq API Key (FREE)
1. Go to https://console.groq.com
2. Sign up → API Keys → Create key
3. Copy the key

### 2. Configure Environment
```bash
cd server
# Edit .env file:
GROQ_API_KEY=your_groq_key_here
JWT_SECRET=hackwithbug_super_secret_jwt_key_2025
PORT=5000
ALLOWED_DOMAIN=paruluniversity.ac.in
```

### 3. Install & Run
```bash
# Terminal 1 — Backend
cd server
npm install
npm start

# Terminal 2 — Frontend
cd client
npm install
npm start
```

### 4. Open Browser
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/health

## Demo Accounts
| Role | Enrollment | Password |
|------|-----------|----------|
| Student | 21bce123 | password123 |
| Faculty | pm001 | faculty123 |

## Features
- ✅ JWT Auth — @paruluniversity.ac.in only
- ✅ Live contest arena with timer
- ✅ Camera + mic proctoring (browser API, no extension)
- ✅ Tab-switch detection
- ✅ Groq AI feedback on wrong answers
- ✅ AI problem generator
- ✅ AI plagiarism analysis (K-gram hash + Groq semantic)
- ✅ Real-time hash similarity meter
- ✅ Codolio-style student profile
- ✅ Rating system + leaderboard
- ✅ Developer dashboard with analytics
- ✅ Problem editor with test cases
- ✅ AI chat assistant

## File Structure
```
hackwithbug/
├── client/                    # React frontend
│   └── src/
│       ├── App.js             # Routes
│       ├── App.css            # Global styles + design system
│       ├── context/
│       │   └── AuthContext.js # Auth state
│       ├── utils/
│       │   └── api.js         # Axios instance
│       ├── components/
│       │   └── Nav.js         # Navigation
│       └── pages/
│           ├── Landing.js     # Home/marketing page
│           ├── Login.js       # Auth (login + register)
│           ├── Dashboard.js   # Student home
│           ├── Profile.js     # Public coding profile
│           ├── Problems.js    # Problem browser
│           ├── ContestArena.js # Live contest + proctor + editor
│           ├── Leaderboard.js  # Rankings
│           ├── DevDashboard.js # Faculty console
│           ├── ProblemEditor.js # Create/edit problems
│           └── PlagiarismReport.js # Post-contest analysis
│
└── server/                    # Express backend
    ├── index.js               # Server entry
    ├── db.js                  # In-memory DB + seed data
    ├── .env                   # Config (add your GROQ_API_KEY)
    ├── middleware/
    │   └── auth.js            # JWT middleware
    └── routes/
        ├── auth.js            # POST /login, /register, GET /me
        ├── contests.js        # CRUD contests
        ├── problems.js        # CRUD problems
        ├── submissions.js     # Submit code, get verdicts
        ├── ai.js              # Groq: feedback, generate, plagiarism, chat
        ├── leaderboard.js     # Rankings
        ├── profile.js         # Public profiles
        └── plagiarism.js      # Hash analysis + verdicts
```

## API Endpoints
```
POST /api/auth/login            — { enrollment, password }
POST /api/auth/register         — { enrollment, password, name, role }
GET  /api/auth/me               — current user

GET  /api/contests              — all contests
GET  /api/contests/:id          — contest details + problems
POST /api/contests              — create (faculty only)
PUT  /api/contests/:id          — update contest (faculty only)
DELETE /api/contests/:id       — delete contest (faculty only)

GET  /api/problems              — list (filter: difficulty, tag, search)
GET  /api/problems/:id          — single problem
POST /api/problems              — create (faculty only)
PUT  /api/problems/:id          — update problem (faculty only)

POST /api/submissions           — submit code → judge
GET  /api/submissions           — list (filter: userId, contestId)
PATCH /api/submissions/:id/ai-feedback  — attach AI feedback

POST /api/ai/feedback           — Groq feedback on wrong answer
POST /api/ai/generate-problem   — Groq problem generator
POST /api/ai/plagiarism-analyze — Groq semantic similarity
POST /api/ai/hint               — problem hint
POST /api/ai/chat               — chat assistant

GET  /api/leaderboard           — global rankings
GET  /api/leaderboard/contest/:id — contest board

GET  /api/profile/:enrollment   — public profile
PUT  /api/profile/me             — update profile info
GET  /api/plagiarism            — all flagged pairs (faculty)
POST /api/plagiarism/analyze    — run analysis on contest
PATCH /api/plagiarism/:id/verdict — set faculty verdict
```

## Scaling & Database Configurations

### Level 2 — Multiple departments (500–5,000 students)
- **Free solution:** PostgreSQL on Railway or Supabase
- **Free tier:** Railway gives 500MB, Supabase gives 500MB
- **Survives restarts:** ✅
- **Handles 1,000+ concurrent users:** ✅
- **Real database with indexes & transactions:** Use this for better memory optimization.

