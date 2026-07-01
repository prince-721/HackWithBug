const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db');
const router = express.Router();

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'paruluniversity.ac.in';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { enrollment, password, role = 'student', name } = req.body;
    if (!enrollment || !password || !name)
      return res.status(400).json({ error: 'enrollment, name and password required' });

    const email = `${enrollment}@${ALLOWED_DOMAIN}`;
    
    // Check if user exists
    const existing = await User.findOne({ enrollment });
    if (existing)
      return res.status(409).json({ error: 'Enrollment already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const avatar = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const approved = role === 'student'; // faculty need admin approval

    const user = await User.create({
      name,
      enrollment,
      email,
      password: hashed,
      role,
      avatar,
      approved
    });

    const safe = user.toJSON();
    delete safe.password;

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: safe });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { enrollment, password } = req.body;
    if (!enrollment || !password)
      return res.status(400).json({ error: 'enrollment and password required' });

    const user = await User.findOne({ enrollment });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (!await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
      
    if (!user.approved)
      return res.status(403).json({ error: 'Account pending approval' });

    const safe = user.toJSON();
    delete safe.password;

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: safe });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const safe = user.toJSON();
    delete safe.password;
    res.json(safe);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
