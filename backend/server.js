import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, Professor, Review } from './models.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) console.warn('JWT_SECRET is not configured. Authentication routes will fail until it is set.');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'Professor Review Hub API' }));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password, university = '' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name: name.trim(), email: normalizedEmail, university, passwordHash });
  res.status(201).json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, university: user.university } });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password.' });
  res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, university: user.university } });
}));

app.get('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user });
}));

app.get('/api/professors', asyncRoute(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const minRating = Number(req.query.minRating || 0);
  const filter = { rating: { $gte: minRating } };
  if (q) filter.$or = [
    { name: { $regex: q, $options: 'i' } },
    { course: { $regex: q, $options: 'i' } },
    { dept: { $regex: q, $options: 'i' } },
    { university: { $regex: q, $options: 'i' } }
  ];
  const professors = await Professor.find(filter).sort({ rating: -1, reviews: -1 }).limit(100);
  res.json({ professors });
}));

app.get('/api/professors/:id', asyncRoute(async (req, res) => {
  const professor = await Professor.findById(req.params.id);
  if (!professor) return res.status(404).json({ message: 'Professor not found.' });
  const reviews = await Review.find({ professor: professor._id }).populate('user', 'name university').sort({ createdAt: -1 });
  res.json({ professor, reviews });
}));

app.post('/api/professors', auth, asyncRoute(async (req, res) => {
  const { name, course, dept, university } = req.body;
  if (!name || !course) return res.status(400).json({ message: 'Professor name and course are required.' });
  const professor = await Professor.create({ name, course, dept, university });
  res.status(201).json({ professor });
}));

app.get('/api/reviews/professor/:id', asyncRoute(async (req, res) => {
  const reviews = await Review.find({ professor: req.params.id }).populate('user', 'name university').sort({ createdAt: -1 });
  res.json({ reviews });
}));

app.post('/api/reviews', auth, asyncRoute(async (req, res) => {
  const { professorId, rating, teachingQuality, difficulty, comment } = req.body;
  if (!professorId || !rating || !teachingQuality || !difficulty || !comment) return res.status(400).json({ message: 'All review fields are required.' });
  const professor = await Professor.findById(professorId);
  if (!professor) return res.status(404).json({ message: 'Professor not found.' });
  const existing = await Review.findOne({ professor: professorId, user: req.user.id });
  if (existing) return res.status(409).json({ message: 'You have already reviewed this professor.' });
  const review = await Review.create({ professor: professorId, user: req.user.id, rating, teachingQuality, difficulty, comment });
  const stats = await Review.aggregate([{ $match: { professor: professor._id } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  professor.rating = Number((stats[0]?.avg || 0).toFixed(1));
  professor.reviews = stats[0]?.count || 0;
  professor.tag = professor.rating >= 4.7 ? 'Excellent' : professor.rating >= 4.3 ? 'Recommended' : 'Mixed';
  await professor.save();
  res.status(201).json({ review });
}));

app.delete('/api/reviews/:id', auth, asyncRoute(async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!review) return res.status(404).json({ message: 'Review not found.' });
  const stats = await Review.aggregate([{ $match: { professor: review.professor } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  await Professor.findByIdAndUpdate(review.professor, { rating: Number((stats[0]?.avg || 0).toFixed(1)), reviews: stats[0]?.count || 0 });
  res.json({ message: 'Review deleted.' });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error. Please try again.' });
});

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not configured.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Professor Review API running on port ${PORT}`));
}

start().catch((error) => { console.error(error); process.exit(1); });
