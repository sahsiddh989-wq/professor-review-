import OpenAI from 'openai';
import { Professor, Review } from './models.js';

// Extend the existing Review schema at runtime so older MongoDB documents remain compatible.
Review.schema.add({
  aiSentiment: { type: String, enum: ['positive', 'neutral', 'negative', 'unknown'], default: 'unknown', index: true },
  aiSentimentScore: { type: Number, min: 0, max: 1, default: 0 },
  aiTags: { type: [String], default: [] },
  aiModeration: { type: String, enum: ['approved', 'rejected', 'unknown'], default: 'unknown' },
  aiModerationReason: { type: String, default: '', maxlength: 500 }
});

const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
let client;
function getClient() {
  if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error('Sidd AI is not configured. Add OPENAI_API_KEY to Vercel Environment Variables.'), { status: 503 });
  client ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim().slice(0, 6000);
const reviewText = (reviews) => reviews.map((r) => `Rating ${r.rating}/5, teaching ${r.teachingQuality}/5, difficulty ${r.difficulty}/5: ${clean(r.comment)}`).join('\n');

async function ask(system, user) {
  const response = await getClient().responses.create({ model, instructions: system, input: user });
  return response.output_text || '';
}

export async function professorInsights(professorId) {
  const professor = await Professor.findById(professorId).lean();
  if (!professor) throw Object.assign(new Error('Professor not found.'), { status: 404 });
  const reviews = await Review.find({ professor: professorId }).sort({ createdAt: -1 }).limit(100).lean();
  if (!reviews.length) return { summary: 'There are not enough student reviews yet.', strengths: [], weaknesses: [], sentiment: 'unknown', sentimentScore: 0, themes: [] };
  const text = await ask('You are Sidd AI, the trustworthy AI assistant for Professor Review Hub. Analyze only the supplied student feedback. Do not invent facts. Return valid JSON with keys summary, strengths (array), weaknesses (array), sentiment, sentimentScore (0 to 1), themes (array of short strings). Be balanced and respectful.', `Professor: ${professor.name}\nCourse: ${professor.course}\nDepartment: ${professor.dept}\nReviews:\n${reviewText(reviews)}`);
  try { return JSON.parse(text); } catch { return { summary: text, strengths: [], weaknesses: [], sentiment: 'unknown', sentimentScore: 0, themes: [] }; }
}

export async function moderateReview(comment) {
  const text = await ask('You are a strict but fair review moderation system. Return JSON only: allowed (boolean), reason (short string), sentiment (positive|neutral|negative), sentimentScore (0 to 1), tags (array). Reject threats, hate, sexual content, personal data, harassment, spam and meaningless text. Normal criticism is allowed.', `Review: ${clean(comment)}`);
  try { return JSON.parse(text); } catch { return { allowed: true, reason: 'Could not confidently classify; allow for human oversight.', sentiment: 'neutral', sentimentScore: 0.5, tags: [] }; }
}

export async function aiSearch(query) {
  const professors = await Professor.find().sort({ rating: -1, reviews: -1 }).limit(100).lean();
  if (!professors.length) return [];
  const answer = await ask('You rank professors for a student review site. Return JSON only as {"ids":[...]} using only the supplied professor IDs. Rank by relevance to the student query, then rating and review count. Never invent IDs.', `Query: ${clean(query)}\nProfessors:\n${professors.map((p) => `${p._id} | ${p.name} | ${p.course} | ${p.dept} | ${p.university} | rating ${p.rating} | reviews ${p.reviews}`).join('\n')}`);
  try {
    const ids = JSON.parse(answer).ids || [];
    const rank = new Map(ids.map((id, i) => [String(id), i]));
    return professors.sort((a, b) => (rank.get(String(a._id)) ?? 9999) - (rank.get(String(b._id)) ?? 9999)).slice(0, 20);
  } catch { return professors.filter((p) => `${p.name} ${p.course} ${p.dept} ${p.university}`.toLowerCase().includes(clean(query).toLowerCase())).slice(0, 20); }
}

export async function recommend(preferences) {
  const professors = await Professor.find().sort({ rating: -1, reviews: -1 }).limit(100).lean();
  const answer = await ask('You are Sidd AI recommending professors. Return JSON only as {"ids":[...],"reason":"..."}. Use only supplied IDs. Never claim facts not present in the data.', `Student preferences: ${JSON.stringify(preferences).slice(0, 4000)}\nCandidates:\n${professors.map((p) => `${p._id} | ${p.name} | ${p.course} | ${p.dept} | ${p.university} | rating ${p.rating} | reviews ${p.reviews}`).join('\n')}`);
  try { const parsed = JSON.parse(answer); const ids = parsed.ids || []; const byId = new Map(professors.map((p) => [String(p._id), p])); return { reason: parsed.reason || '', professors: ids.map((id) => byId.get(String(id))).filter(Boolean).slice(0, 10) }; } catch { return { reason: 'Recommendations are temporarily unavailable.', professors: professors.slice(0, 5) }; }
}

export async function chat(message) {
  const professors = await Professor.find().sort({ rating: -1, reviews: -1 }).limit(80).lean();
  const context = professors.map((p) => `${p._id}: ${p.name}, ${p.course}, ${p.dept}, ${p.university}, rating ${p.rating}, reviews ${p.reviews}`).join('\n');
  return ask('You are Sidd AI, the friendly assistant inside Professor Review Hub. Answer from the supplied platform data. If the data does not support an answer, say so. Never fabricate professor facts. Keep answers concise and student-friendly.', `Student question: ${clean(message)}\nAvailable professor data:\n${context}`);
}
