// leaderboard.js
const express = require('express');
const { User, Submission } = require('../db');
const router = express.Router();

const { auth } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).sort({ rating: -1 });
    
    const board = students.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      enrollment: u.enrollment,
      avatar: u.avatar,
      rating: u.rating,
      solved: u.solved,
      contests: u.contests,
      streak: u.streak
    }));
    
    res.json(board);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/contest/:id', auth, async (req, res) => {
  try {
    const { Contest, Submission } = require('../db');
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ error: 'Contest not found' });

    const isStudent = req.user.role === 'student';
    const now = Date.now();
    const contestEndTime = new Date(contest.startTime).getTime() + (contest.duration * 60000);
    const contestEnded = now >= contestEndTime;

    // Hidden visibility check
    if (isStudent && !contestEnded && contest.leaderboardVisibility === 'hidden') {
      return res.json({ hidden: true, message: 'Leaderboard is hidden until contest ends.' });
    }

    const query = { contestId: req.params.id };

    // Frozen visibility check
    if (isStudent && !contestEnded && contest.leaderboardVisibility === 'frozen' && contest.freezeMinutes > 0) {
      const freezeTime = new Date(new Date(contest.startTime).getTime() + (contest.duration - contest.freezeMinutes) * 60000);
      query.timestamp = { $lte: freezeTime };
    }

    const allSubs = await Submission.find(query)
      .populate('userId')
      .populate('problemId')
      .sort({ timestamp: 1 });

    const studentMap = {};

    allSubs.forEach(sub => {
      if (!sub.userId || sub.userId.role !== 'student') return;
      const studentId = sub.userId.id;
      if (!studentMap[studentId]) {
        studentMap[studentId] = {
          userId: studentId,
          name: sub.userId.name,
          avatar: sub.userId.avatar,
          enrollment: sub.userId.enrollment,
          rating: sub.userId.rating || 0,
          department: sub.userId.department || 'CE',
          problems: {},
          totalPoints: 0,
          totalPenalty: 0,
          wpmList: [],
          lastAcTime: 0
        };
      }

      const stud = studentMap[studentId];
      const pid = sub.problemId ? sub.problemId.id : null;
      if (!pid) return;

      if (!stud.problems[pid]) {
        stud.problems[pid] = { solved: false, wrongAttempts: 0, points: 0, penalty: 0 };
      }

      const pData = stud.problems[pid];

      if (sub.typingAnalytics && sub.typingAnalytics.avgWpm > 0) {
        stud.wpmList.push(sub.typingAnalytics.avgWpm);
      }

      if (pData.solved) return;

      if (sub.verdict === 'AC') {
        pData.solved = true;
        pData.points = sub.problemId.points || 100;
        const timeFromStart = Math.max(0, Math.floor((new Date(sub.timestamp).getTime() - new Date(contest.startTime).getTime()) / 60000));
        pData.penalty = timeFromStart + (pData.wrongAttempts * 20);
        stud.totalPoints += pData.points;
        stud.totalPenalty += pData.penalty;
        stud.lastAcTime = Math.max(stud.lastAcTime, new Date(sub.timestamp).getTime());
      } else {
        pData.wrongAttempts++;
      }
    });

    const board = Object.values(studentMap).map(stud => {
      const avgWpm = stud.wpmList.length > 0
        ? Math.round(stud.wpmList.reduce((a,b)=>a+b, 0) / stud.wpmList.length)
        : 0;

      let hwbSolved = 0;
      let lcSolved = 0;
      Object.entries(stud.problems).forEach(([problemId, pData]) => {
        if (pData.solved) {
          const sub = allSubs.find(s => s.problemId && (s.problemId.id === problemId || s.problemId._id?.toString() === problemId));
          if (sub?.problemId?.source === 'leetcode') {
            lcSolved++;
          } else {
            hwbSolved++;
          }
        }
      });

      return {
        userId: stud.userId,
        name: stud.name,
        avatar: stud.avatar,
        enrollment: stud.enrollment,
        points: stud.totalPoints,
        penalty: stud.totalPenalty,
        solved: hwbSolved + lcSolved,
        hwbSolved,
        lcSolved,
        avgWpm,
        rating: stud.rating,
        department: stud.department,
        submissionTime: stud.lastAcTime ? new Date(stud.lastAcTime).toLocaleTimeString() : 'N/A',
        lastAcTime: stud.lastAcTime
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a.penalty !== b.penalty) return a.penalty - b.penalty;
      return a.lastAcTime - b.lastAcTime;
    })
    .map((r, i) => ({ ...r, rank: i + 1 }));

    res.json(board);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
