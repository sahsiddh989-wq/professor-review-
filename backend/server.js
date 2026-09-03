import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User, Professor, Review } from './models.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || '*';
if (!JWT_SECRET) throw new Error('JWT_SECRET is required.');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

const allowedOrigins = CLIENT_URL.split(',').map((value) => value.trim()).filter(Boolean);
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('CORS origin not allowed.'));
}, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, university: user.university });
function signToken(user) { return jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' }); }
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { return res.status(401).json({ message: 'Invalid or expired token.' }); }
}
function validRating(value) { const n = Number(value); return Number.isFinite(n) && n >= 1 && n <= 5; }
async function refreshProfessorStats(professorId) {
  const stats = await Review.aggregate([{ $match: { professor: new mongoose.Types.ObjectId(professorId) } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  const rating = Number((stats[0]?.avg || 0).toFixed(1));
  const reviews = stats[0]?.count || 0;
  const tag = reviews === 0 ? 'New' : rating >= 4.7 ? 'Excellent' : rating >= 4.3 ? 'Recommended' : rating >= 3.5 ? 'Good' : 'Mixed';
  await Professor.findByIdAndUpdate(professorId, { rating, reviews, tag });
  return { rating, reviews, tag };
}

app.get('/', (req, res) => res.json({ service: 'Professor Review Hub API', status: 'running', health: '/api/health' }));
app.get('/api/health', (req, res) => res.json({ ok: mongoose.connection.readyState === 1, service: 'Professor Review Hub API', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', timestamp: new Date().toISOString() }));

app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
  const { name, email, password, university = '' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
  if (String(name).trim().length < 2) return res.status(400).json({ message: 'Name must contain at least 2 characters.' });
  if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name: String(name).trim(), email: normalizedEmail, university: String(university).trim(), passwordHash });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));
app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password.' });
  res.json({ token: signToken(user), user: publicUser(user) });
}));
app.get('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user });
}));
app.patch('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const updates = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim();
  if (typeof req.body.university === 'string') updates.university = req.body.university.trim();
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'No valid profile fields supplied.' });
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user });
}));

app.get('/api/professors/stats/summary', asyncRoute(async (req, res) => {
  const [professors, reviews, users, avg] = await Promise.all([Professor.countDocuments(), Review.countDocuments(), User.countDocuments(), Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }])]);
  res.json({ professors, reviews, users, averageRating: Number((avg[0]?.avg || 0).toFixed(1)) });
}));
app.get('/api/professors', asyncRoute(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const minRaw = Number(req.query.minRating || 0);
  const minRating = Number.isFinite(minRaw) ? Math.min(5, Math.max(0, minRaw)) : 0;
  const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '12', 10)));
  const filter = { rating: { $gte: minRating } };
  if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { course: { $regex: q, $options: 'i' } }, { dept: { $regex: q, $options: 'i' } }, { university: { $regex: q, $options: 'i' } }];
  const [professors, total] = await Promise.all([Professor.find(filter).sort({ rating: -1, reviews: -1, name: 1 }).skip((page - 1) * limit).limit(limit).lean(), Professor.countDocuments(filter)]);
  res.json({ professors, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
app.get('/api/professors/:id', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid professor ID.' });
  const professor = await Professor.findById(req.params.id).lean();
  if (!professor) return res.status(404).json({ message: 'Professor not found.' });
  const reviews = await Review.find({ professor: professor._id }).populate('user', 'name university').sort({ createdAt: -1 }).lean();
  res.json({ professor, reviews });
}));
app.post('/api/professors', auth, asyncRoute(async (req, res) => {
  const { name, course, dept = '', university = '' } = req.body;
  if (!name || !course) return res.status(400).json({ message: 'Professor name and course are required.' });
  const professor = await Professor.create({ name: String(name).trim(), course: String(course).trim(), dept: String(dept).trim(), university: String(university).trim() });
  res.status(201).json({ professor });
}));

app.get('/api/reviews/professor/:id', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid professor ID.' });
  const reviews = await Review.find({ professor: req.params.id }).populate('user', 'name university').sort({ createdAt: -1 }).lean();
  res.json({ reviews });
}));
app.get('/api/reviews/mine', auth, asyncRoute(async (req, res) => {
  const reviews = await Review.find({ user: req.user.id }).populate('professor', 'name course university rating').sort({ createdAt: -1 }).lean();
  res.json({ reviews });
}));
app.post('/api/reviews', auth, asyncRoute(async (req, res) => {
  const { professorId, rating, teachingQuality, difficulty, comment } = req.body;
  if (!mongoose.isValidObjectId(professorId)) return res.status(400).json({ message: 'Invalid professor ID.' });
  if (![rating, teachingQuality, difficulty].every(validRating)) return res.status(400).json({ message: 'Ratings must be numbers between 1 and 5.' });
  if (typeof comment !== 'string' || comment.trim().length < 3) return res.status(400).json({ message: 'Review comment must contain at least 3 characters.' });
  if (!await Professor.exists({ _id: professorId })) return res.status(404).json({ message: 'Professor not found.' });
  try {
    const review = await Review.create({ professor: professorId, user: req.user.id, rating: Number(rating), teachingQuality: Number(teachingQuality), difficulty: Number(difficulty), comment: comment.trim() });
    const professorStats = await refreshProfessorStats(professorId);
    const populated = await Review.findById(review._id).populate('user', 'name university').lean();
    res.status(201).json({ review: populated, professorStats });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'You have already reviewed this professor.' });
    throw error;
  }
}));
app.patch('/api/reviews/:id', auth, asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid review ID.' });
  const updates = {};
  for (const field of ['rating', 'teachingQuality', 'difficulty']) {
    if (req.body[field] !== undefined) { if (!validRating(req.body[field])) return res.status(400).json({ message: `${field} must be between 1 and 5.` }); updates[field] = Number(req.body[field]); }
  }
  if (req.body.comment !== undefined) { if (typeof req.body.comment !== 'string' || req.body.comment.trim().length < 3) return res.status(400).json({ message: 'Comment is too short.' }); updates.comment = req.body.comment.trim(); }
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'No review fields supplied.' });
  const review = await Review.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, updates, { new: true, runValidators: true }).populate('user', 'name university');
  if (!review) return res.status(404).json({ message: 'Review not found.' });
  res.json({ review, professorStats: await refreshProfessorStats(review.professor) });
}));
app.delete('/api/reviews/:id', auth, asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid review ID.' });
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!review) return res.status(404).json({ message: 'Review not found.' });
  res.json({ message: 'Review deleted.', professorStats: await refreshProfessorStats(review.professor) });
}));

app.use((req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message === 'CORS origin not allowed.') return res.status(403).json({ message: err.message });
  if (err.name === 'ValidationError') return res.status(400).json({ message: 'Invalid data supplied.', details: Object.values(err.errors).map((item) => item.message) });
  res.status(500).json({ message: 'Server error. Please try again.' });
});

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.init(), Professor.init(), Review.init()]);
  console.log('MongoDB connected');
}

export { app };

async function start() {
  await connectDatabase();
  app.listen(PORT, () => console.log(`Professor Review API running on port ${PORT}`));
}

if (!process.env.VERCEL) {
  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
