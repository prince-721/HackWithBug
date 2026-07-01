const mongoose = require('mongoose');

// Global JSON transforms to ensure virtual id is mapped
mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

// ─── USER ────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  enrollment: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'student' },
  rating: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  solved: { type: Number, default: 0 },
  contests: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  joinedAt: { type: Date, default: Date.now },
  avatar: { type: String },
  semester: { type: Number, default: 0 },
  department: { type: String, default: 'CE' },
  approved: { type: Boolean, default: true },
  leetcode: { type: String, default: '' },
  codeforces: { type: String, default: '' },
  codechef: { type: String, default: '' },
  github: { type: String, default: '' },
  geeksforgeeks: { type: String, default: '' },
  hackerrank: { type: String, default: '' },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  achievements: [{ type: String }],
  dailyStreak: { type: Number, default: 0 },
  lastSolvedDate: { type: Date },
  // LeetCode sync tracking
  leetcodeSolved: [{ type: String }],
  leetcodeSyncedAt: { type: Date }
});

// ─── PROBLEM ─────────────────────────────────────────────────────────────────
const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  difficulty: { type: String, required: true },
  points: { type: Number, default: 100 },
  tags: { type: [String], default: [] },
  acceptance: { type: Number, default: 0 },
  submissions: { type: Number, default: 0 },
  statement: { type: String, required: true },
  inputFormat: { type: String },
  outputFormat: { type: String },
  constraints: { type: String },
  sampleInput: { type: String },
  sampleOutput: { type: String },
  hiddenTestCases: [{ input: String, output: String, weight: { type: Number, default: 1 } }],
  boundaryCases: [{ input: String, output: String }],
  stressCases: [{ input: String, output: String }],
  timeLimit: { type: Number, default: 1.0 },
  memoryLimit: { type: Number, default: 256 },
  editorial: { type: String },
  explanation: { type: String },
  optimalAlgorithm: { type: String },
  javaSolution: { type: String },
  cppSolution: { type: String },
  pythonSolution: { type: String },
  jsSolution: { type: String },
  isDaily: { type: Boolean, default: false },
  dailyDate: { type: Date },
  // LeetCode linking
  source: { type: String, default: 'custom' },
  leetcodeSlug: { type: String },
  leetcodeUrl: { type: String }
});

// ─── CONTEST ─────────────────────────────────────────────────────────────────
const contestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  bannerUrl: { type: String },
  contestType: { type: String, default: 'public' },
  password: { type: String },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number, required: true, default: 120 },
  maxMarks: { type: Number, default: 100 },
  numProblems: { type: Number, default: 0 },
  status: { type: String, default: 'scheduled' },
  problems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: { type: Number, default: 0 },
  proctored: { type: Boolean, default: true },
  allowedLangs: { type: [String], default: ['cpp17', 'python3', 'java17', 'c'] },
  maxParticipants: { type: Number, default: 200 },
  leaderboardVisibility: { type: String, default: 'live' },
  scheduleLocked: { type: Boolean, default: false },
  registeredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // AI Feature Flags
  aiEnabled: { type: Boolean, default: true },
  aiChat: { type: Boolean, default: true },
  aiHints: { type: Boolean, default: true },
  aiReview: { type: Boolean, default: true },
  aiExplain: { type: Boolean, default: true },
  aiAutocomplete: { type: Boolean, default: false },
  // Announcements
  announcements: [{
    text: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    important: { type: Boolean, default: false }
  }],
  // Freeze leaderboard X minutes before end
  freezeMinutes: { type: Number, default: 0 },
  isVirtual: { type: Boolean, default: false }
});

// ─── SUBMISSION ───────────────────────────────────────────────────────────────
const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', default: null },
  verdict: { type: String, required: true },
  language: { type: String, required: true },
  time: { type: Number },
  memory: { type: Number },
  code: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  aiFeedback: { type: String },
  partialScore: { type: Number, default: 0 },
  testsPassed: { type: Number, default: 0 },
  totalTests: { type: Number, default: 1 },
  // Typing Analytics
  typingAnalytics: {
    wpm: { type: Number, default: 0 },
    avgWpm: { type: Number, default: 0 },
    peakWpm: { type: Number, default: 0 },
    keystrokes: { type: Number, default: 0 },
    totalCharacters: { type: Number, default: 0 },
    pasteCount: { type: Number, default: 0 },
    copyCount: { type: Number, default: 0 },
    backspaceCount: { type: Number, default: 0 },
    deleteCount: { type: Number, default: 0 },
    activeTime: { type: Number, default: 0 },
    idleTime: { type: Number, default: 0 },
    codingDuration: { type: Number, default: 0 },
    wpmHistory: [{ time: Number, wpm: Number }]
  }
});
submissionSchema.index({ userId: 1, contestId: 1 });
submissionSchema.index({ problemId: 1 });

// ─── PLAGIARISM PAIR ──────────────────────────────────────────────────────────
const plagiarismPairSchema = new mongoose.Schema({
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  userId1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenScore: { type: Number, required: true },
  astScore: { type: Number, required: true },
  semanticScore: { type: Number, required: true },
  combinedScore: { type: Number, required: true },
  verdict: { type: String, default: 'pending' },
  aiAnalysis: { type: String },
  matchedLines: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  facultyNote: { type: String }
});

// ─── PROCTORING LOG ───────────────────────────────────────────────────────────
const proctoringLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  events: [{
    type: { type: String }, // tabSwitch, paste, copy, fullscreenExit, devtools, faceAbsent
    timestamp: { type: Date, default: Date.now },
    detail: { type: String }
  }],
  faceTimePercent: { type: Number, default: 100 },
  totalAlerts: { type: Number, default: 0 },
  tabSwitches: { type: Number, default: 0 },
  pasteEvents: { type: Number, default: 0 },
  fullscreenExits: { type: Number, default: 0 },
  voiceEvents: { type: Number, default: 0 }
});
proctoringLogSchema.index({ userId: 1, contestId: 1 }, { unique: true });

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // verdict, contest_start, contest_end, rank_change, announcement, plagiarism
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String }, // e.g. /contest/123
  meta: { type: Object }, // any extra data
  createdAt: { type: Date, default: Date.now }
});
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// ─── DISCUSSION ───────────────────────────────────────────────────────────────
const answerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  accepted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const discussionSchema = new mongoose.Schema({
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest' },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  tags: [{ type: String }],
  answers: [answerSchema],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views: { type: Number, default: 0 },
  hidden: { type: Boolean, default: false }, // hidden during live contest
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
discussionSchema.index({ contestId: 1, hidden: 1 });
discussionSchema.index({ problemId: 1 });

// ─── DAILY CHALLENGE ──────────────────────────────────────────────────────────
const dailyChallengeSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  solvers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

// ─── TYPING PRACTICE SESSION ──────────────────────────────────────────────────
const typingPracticeSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  language: { type: String, required: true },
  snippetName: { type: String, required: true },
  avgWpm: { type: Number, required: true },
  peakWpm: { type: Number, default: 0 },
  accuracy: { type: Number, default: 100 },
  keystrokes: { type: Number, default: 0 },
  backspaces: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // seconds
  createdAt: { type: Date, default: Date.now }
});

// ─── MODELS ───────────────────────────────────────────────────────────────────
const User = mongoose.model('User', userSchema);
const Problem = mongoose.model('Problem', problemSchema);
const Contest = mongoose.model('Contest', contestSchema);
const Submission = mongoose.model('Submission', submissionSchema);
const PlagiarismPair = mongoose.model('PlagiarismPair', plagiarismPairSchema);
const ProctoringLog = mongoose.model('ProctoringLog', proctoringLogSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Discussion = mongoose.model('Discussion', discussionSchema);
const DailyChallenge = mongoose.model('DailyChallenge', dailyChallengeSchema);
const TypingPracticeSession = mongoose.model('TypingPracticeSession', typingPracticeSessionSchema);

// ─── SEEDING ─────────────────────────────────────────────────────────────────
const initializeDatabase = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ WARNING: MONGODB_URI is not defined in environment variables. Please configure it in your .env file.');
    return;
  }

  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('🌱 Connected to MongoDB Atlas.');

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Database is empty. Seeding initial data...');
      const bcrypt = require('bcryptjs');

      const uIds = {
        yash: new mongoose.Types.ObjectId(),
        mehta: new mongoose.Types.ObjectId(),
        riya: new mongoose.Types.ObjectId(),
        karan: new mongoose.Types.ObjectId(),
        sanya: new mongoose.Types.ObjectId(),
        arjun: new mongoose.Types.ObjectId()
      };

      const pIds = Array.from({ length: 8 }, () => new mongoose.Types.ObjectId());
      const cIds = Array.from({ length: 4 }, () => new mongoose.Types.ObjectId());

      await User.insertMany([
        { _id: uIds.yash, name: 'Yash Patel', enrollment: '21bce123', email: '21bce123@paruluniversity.ac.in', password: bcrypt.hashSync('password123', 10), role: 'student', rating: 1847, rank: 7, solved: 142, contests: 18, streak: 32, joinedAt: new Date('2024-08-15'), avatar: 'YP', semester: 5, department: 'CE', approved: true, leetcode: 'yash_patel', codeforces: 'yash_cf', codechef: 'yash_chef', github: 'yashpatel', geeksforgeeks: 'yash_gfg', hackerrank: 'yash_hr' },
        { _id: uIds.mehta, name: 'Prof. Mehta', enrollment: 'pm001', email: 'pm001@paruluniversity.ac.in', password: bcrypt.hashSync('faculty123', 10), role: 'faculty', rating: 0, rank: 0, solved: 0, contests: 6, streak: 0, joinedAt: new Date('2024-01-01'), avatar: 'PM', semester: 0, department: 'CE', approved: true },
        { _id: uIds.riya, name: 'Riya Joshi', enrollment: '21bce089', email: '21bce089@paruluniversity.ac.in', password: bcrypt.hashSync('password123', 10), role: 'student', rating: 2100, rank: 1, solved: 210, contests: 18, streak: 45, joinedAt: new Date('2024-08-15'), avatar: 'RJ', semester: 5, department: 'CE', approved: true, leetcode: 'riya_joshi', codeforces: 'riya_cf', codechef: 'riya_chef', github: 'riyajoshi' },
        { _id: uIds.karan, name: 'Karan Patel', enrollment: '21bce045', email: '21bce045@paruluniversity.ac.in', password: bcrypt.hashSync('password123', 10), role: 'student', rating: 1900, rank: 2, solved: 185, contests: 16, streak: 28, joinedAt: new Date('2024-08-15'), avatar: 'KP', semester: 5, department: 'CE', approved: true, leetcode: 'karan_patel' },
        { _id: uIds.sanya, name: 'Sanya Mehta', enrollment: '21bce112', email: '21bce112@paruluniversity.ac.in', password: bcrypt.hashSync('password123', 10), role: 'student', rating: 1750, rank: 3, solved: 160, contests: 15, streak: 19, joinedAt: new Date('2024-08-15'), avatar: 'SM', semester: 5, department: 'CE', approved: true },
        { _id: uIds.arjun, name: 'Arjun Rao', enrollment: '21bce088', email: '21bce088@paruluniversity.ac.in', password: bcrypt.hashSync('password123', 10), role: 'student', rating: 1600, rank: 4, solved: 140, contests: 14, streak: 12, joinedAt: new Date('2024-08-15'), avatar: 'AR', semester: 5, department: 'CE', approved: true }
      ]);

      await Problem.insertMany([
        { _id: pIds[0], title: 'Reverse the Array', difficulty: 'easy', points: 100, tags: ['Arrays', 'Implementation'], acceptance: 82, submissions: 340, statement: 'Given an array of n integers, reverse it in-place.', inputFormat: 'First line: n. Second line: n space-separated integers.', outputFormat: 'The reversed array on one line.', constraints: '1 ≤ n ≤ 10⁵', sampleInput: '5\n1 2 3 4 5', sampleOutput: '5 4 3 2 1', timeLimit: 1, memoryLimit: 256, editorial: 'Simply swap elements from both ends moving inward.' },
        { _id: pIds[1], title: 'Climb the Leaderboard', difficulty: 'medium', points: 300, tags: ['Binary Search', 'Arrays'], acceptance: 61, submissions: 210, statement: 'Given a leaderboard of scores in descending order and Alice\'s scores, find Alice\'s rank after each score.', inputFormat: 'n, then n scores, then m, then m of Alice\'s scores.', outputFormat: 'm lines each with Alice\'s rank.', constraints: '1 ≤ n, m ≤ 2×10⁵', sampleInput: '7\n100 90 90 80 75 60 50\n4\n50 65 77 90', sampleOutput: '6\n5\n4\n2', timeLimit: 1, memoryLimit: 256, editorial: 'Deduplicate the board, then binary search for each score.' },
        { _id: pIds[2], title: 'Graph Coloring', difficulty: 'medium', points: 300, tags: ['Graphs', 'BFS'], acceptance: 58, submissions: 180, statement: 'Determine if a graph is bipartite using 2-coloring.', inputFormat: 'n nodes, m edges, then m pairs u v.', outputFormat: 'YES if bipartite, NO otherwise.', constraints: '1 ≤ n ≤ 10⁵', sampleInput: '4 4\n1 2\n2 3\n3 4\n4 1', sampleOutput: 'YES', timeLimit: 1, memoryLimit: 256, editorial: 'BFS/DFS coloring.' },
        { _id: pIds[3], title: 'Segment Tree XOR', difficulty: 'hard', points: 500, tags: ['Segment Tree', 'Data Structures'], acceptance: 29, submissions: 45, statement: 'Build a segment tree to answer XOR range queries.', inputFormat: 'n elements, then q queries.', outputFormat: 'Answer for each type-1 query.', constraints: '1 ≤ n, q ≤ 2×10⁵', sampleInput: '5\n1 2 3 4 5\n3\n1 1 3\n2 2 6\n1 1 3', sampleOutput: '0\n4', timeLimit: 2, memoryLimit: 256, editorial: 'Standard segment tree with XOR merge function.' },
        { _id: pIds[4], title: 'Network Flow', difficulty: 'hard', points: 500, tags: ['Graphs', 'Max Flow'], acceptance: 31, submissions: 90, statement: 'Find the maximum flow from source to sink in a directed graph.', inputFormat: 'n nodes, m edges, then m lines: u v capacity.', outputFormat: 'Maximum flow value.', constraints: '1 ≤ n ≤ 500', sampleInput: '4 5\n1 2 10\n1 3 10\n2 4 10\n3 4 10\n2 3 1', sampleOutput: '20', timeLimit: 2, memoryLimit: 256, editorial: 'Edmonds-Karp BFS-based augmentation.' },
        { _id: pIds[5], title: 'DP on Trees', difficulty: 'hard', points: 600, tags: ['DP', 'Trees'], acceptance: 22, submissions: 32, statement: 'Find the maximum independent set in a tree.', inputFormat: 'n nodes, n-1 edges, then node weights.', outputFormat: 'Maximum sum of weights of independent set.', constraints: '1 ≤ n ≤ 10⁵', sampleInput: '5\n1 2\n1 3\n3 4\n3 5\n1 2 3 4 5', sampleOutput: '12', timeLimit: 2, memoryLimit: 256, editorial: 'Classic tree DP.' },
        { _id: pIds[6], title: 'Two Sum', difficulty: 'easy', points: 100, tags: ['Hashing', 'Arrays'], acceptance: 88, submissions: 420, statement: 'Find two numbers in array that add to target.', inputFormat: 'n, target, then n numbers.', outputFormat: 'Indices (1-indexed) of the two numbers.', constraints: '2 ≤ n ≤ 10⁴', sampleInput: '4 9\n2 7 11 15', sampleOutput: '1 2', timeLimit: 1, memoryLimit: 256, editorial: 'HashMap: store complement and check.', isDaily: true, dailyDate: new Date() },
        { _id: pIds[7], title: 'Longest Common Subsequence', difficulty: 'medium', points: 350, tags: ['DP', 'Strings'], acceptance: 67, submissions: 156, statement: 'Find the length of the longest common subsequence of two strings.', inputFormat: 'Two strings on separate lines.', outputFormat: 'Length of LCS.', constraints: '1 ≤ |s|, |t| ≤ 1000', sampleInput: 'ABCBDAB\nBDCABA', sampleOutput: '4', timeLimit: 1, memoryLimit: 256, editorial: 'Classic 2D DP.' }
      ]);

      await Contest.insertMany([
        { _id: cIds[0], title: 'VGEC Code Sprint — Round 4', description: 'Monthly competitive programming contest for CE students.', startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), duration: 120, status: 'live', problems: [pIds[0], pIds[1], pIds[2], pIds[3], pIds[4], pIds[5]], createdBy: uIds.mehta, participants: 120, proctored: true, allowedLangs: ['cpp17','python3','java17'], maxParticipants: 200, aiEnabled: true, aiChat: true, aiHints: true, aiReview: true, aiExplain: true, announcements: [{ text: 'Welcome to Round 4! Good luck everyone. The contest will run for 2 hours.', createdBy: uIds.mehta, createdAt: new Date(), important: true }] },
        { _id: cIds[1], title: 'VGEC Code Sprint — Round 3', description: 'Round 3 of our semester series.', startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), duration: 120, status: 'ended', problems: [pIds[0], pIds[1], pIds[2], pIds[3], pIds[4]], createdBy: uIds.mehta, participants: 98, proctored: true, allowedLangs: ['cpp17','python3','java17'], maxParticipants: 200, aiEnabled: false, aiChat: false, aiHints: false },
        { _id: cIds[2], title: 'Internal Hackathon Spring 2025', description: 'Special hackathon with harder problems.', startTime: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), duration: 180, status: 'ended', problems: [pIds[1], pIds[2], pIds[3], pIds[4], pIds[5], pIds[6], pIds[7]], createdBy: uIds.mehta, participants: 80, proctored: true, allowedLangs: ['cpp17','python3','java17','c'], maxParticipants: 150, aiEnabled: true },
        { _id: cIds[3], title: 'Practice Round — Data Structures', description: 'Unrated practice session on DS topics.', startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), duration: 90, status: 'scheduled', problems: [pIds[0], pIds[2], pIds[3], pIds[6]], createdBy: uIds.mehta, participants: 0, proctored: false, allowedLangs: ['cpp17','python3','java17'], maxParticipants: 200, aiEnabled: true }
      ]);

      await Submission.insertMany([
        { userId: uIds.yash, problemId: pIds[3], contestId: cIds[0], verdict: 'AC', language: 'cpp17', time: 48, memory: 12, code: '// segment tree solution', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), partialScore: 100, typingAnalytics: { wpm: 45, avgWpm: 42, peakWpm: 62, keystrokes: 1280, pasteCount: 0, copyCount: 1, backspaceCount: 87, activeTime: 1800, codingDuration: 2100 } },
        { userId: uIds.yash, problemId: pIds[4], contestId: cIds[0], verdict: 'WA', language: 'cpp17', time: null, memory: null, code: '// network flow attempt', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), aiFeedback: 'Edge case: disconnected source node not handled. Your BFS augmentation logic is correct but fails when source has no outgoing edges.', partialScore: 68 },
        { userId: uIds.yash, problemId: pIds[2], contestId: cIds[0], verdict: 'AC', language: 'python3', time: 121, memory: 8, code: '# graph coloring', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), partialScore: 100 },
        { userId: uIds.yash, problemId: pIds[0], contestId: cIds[0], verdict: 'AC', language: 'cpp17', time: 12, memory: 4, code: '// reverse array', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), partialScore: 100 },
        { userId: uIds.yash, problemId: pIds[1], contestId: cIds[0], verdict: 'AC', language: 'cpp17', time: 36, memory: 8, code: '// climb leaderboard', timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000), partialScore: 100 },
        { userId: uIds.riya, problemId: pIds[0], contestId: cIds[0], verdict: 'AC', language: 'cpp17', time: 10, memory: 4, code: '// riya solution', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), partialScore: 100 }
      ]);

      await PlagiarismPair.insertMany([
        { contestId: cIds[0], problemId: pIds[1], userId1: uIds.riya, userId2: uIds.karan, tokenScore: 91, astScore: 88, semanticScore: 94, combinedScore: 91, verdict: 'pending', aiAnalysis: 'Both solutions use identical three-pointer approach with same variable names. 47 matching lines suggest copying.', matchedLines: ['upper_bound(board.begin(),board.end(),s,greater<int>())-board.begin()'], createdAt: new Date() },
        { contestId: cIds[0], problemId: pIds[3], userId1: uIds.sanya, userId2: uIds.arjun, tokenScore: 82, astScore: 79, semanticScore: 85, combinedScore: 82, verdict: 'pending', aiAnalysis: 'Segment tree functions share identical recursive structure.', matchedLines: ['void build(int node, int l, int r)', 'tree[node] = tree[2*node] ^ tree[2*node+1]'], createdAt: new Date() },
        { contestId: cIds[0], problemId: pIds[4], userId1: uIds.yash, userId2: uIds.karan, tokenScore: 58, astScore: 52, semanticScore: 38, combinedScore: 50, verdict: 'pending', aiAnalysis: 'Moderate token similarity driven by standard BFS boilerplate. Low concern.', matchedLines: ['while(!q.empty())'], createdAt: new Date() }
      ]);

      // Seed notifications
      await Notification.insertMany([
        { userId: uIds.yash, type: 'verdict', title: 'AC on Segment Tree XOR', message: 'Your solution was accepted! +48 rating points.', read: false, link: `/contest/${cIds[0]}`, createdAt: new Date(Date.now() - 2*60*60*1000) },
        { userId: uIds.yash, type: 'contest_start', title: 'VGEC Code Sprint — Round 4 started', message: 'The contest has begun! You have 2 hours.', read: true, link: `/contest/${cIds[0]}`, createdAt: new Date(Date.now() - 3*60*60*1000) },
        { userId: uIds.yash, type: 'rank_change', title: 'You moved to rank #7', message: 'Your global rank improved after Round 4.', read: false, createdAt: new Date(Date.now() - 1*60*60*1000) }
      ]);

      // Seed a discussion
      await Discussion.create({
        contestId: cIds[0],
        problemId: pIds[1],
        userId: uIds.yash,
        title: 'Why does binary search give TLE on Problem B?',
        body: 'I implemented binary search on the deduplicated leaderboard but still getting TLE. My time complexity should be O(m log n).',
        answers: [{
          userId: uIds.riya,
          body: 'Make sure you deduplicate the board before binary searching! Using `unique()` on a sorted array reduces the search space significantly.',
          likes: [uIds.yash],
          accepted: true,
          createdAt: new Date(Date.now() - 30*60*1000)
        }],
        likes: [uIds.riya, uIds.karan],
        hidden: false,
        createdAt: new Date(Date.now() - 60*60*1000)
      });

      // Seed daily challenge
      const today = new Date().toISOString().split('T')[0];
      await DailyChallenge.create({ date: today, problemId: pIds[6], solvers: [] });

      await ProctoringLog.create({ userId: uIds.yash, contestId: cIds[0], events: [], faceTimePercent: 100, totalAlerts: 0, tabSwitches: 0, voiceEvents: 0 });

      console.log('✅ Database seeding complete.');
    }
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
  }
};

module.exports = {
  initializeDatabase,
  User,
  Problem,
  Contest,
  Submission,
  PlagiarismPair,
  ProctoringLog,
  Notification,
  Discussion,
  DailyChallenge,
  TypingPracticeSession
};
