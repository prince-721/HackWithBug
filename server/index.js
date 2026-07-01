require('dotenv').config();
const db = require('./db');
db.initializeDatabase();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
  // Also push without trailing slash if present
  allowedOrigins.push(process.env.CLIENT_URL.replace(/\/$/, ""));
}

const authRoutes = require('./routes/auth');
const contestRoutes = require('./routes/contests');
const problemRoutes = require('./routes/problems');
const submissionRoutes = require('./routes/submissions');
const aiRoutes = require('./routes/ai');
const leaderboardRoutes = require('./routes/leaderboard');
const profileRoutes = require('./routes/profile');
const plagiarismRoutes = require('./routes/plagiarism');
const notificationRoutes = require('./routes/notifications');
const discussionRoutes = require('./routes/discussions');
const proctoringRoutes = require('./routes/proctoring');
const typingRoutes = require('./routes/typing');
const leetcodeRoutes = require('./routes/leetcode');

const http = require('http');
const socketIO = require('socket.io');

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);
  socket.on('join-contest', (contestId) => {
    socket.join(`contest-${contestId}`);
    console.log(`🔌 Socket ${socket.id} joined room: contest-${contestId}`);
  });
  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, message: { error: 'Too many AI requests, slow down.' } });
app.use('/api/', limiter);
app.use('/api/ai/', aiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/plagiarism', plagiarismRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/typing-practice', typingRoutes);
app.use('/api/leetcode', leetcodeRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date(), uptime: process.uptime() }));

// Serve static assets in production
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

// Catch-all route to serve React app for client-side routing (Express 5 syntax)
app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => console.log(`🚀 hackwithbug server running on port ${PORT}`));
