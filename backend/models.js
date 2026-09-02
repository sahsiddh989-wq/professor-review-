import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  university: { type: String, default: '', trim: true, maxlength: 160 },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

const professorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  course: { type: String, required: true, trim: true, maxlength: 160 },
  dept: { type: String, default: '', trim: true, maxlength: 120 },
  university: { type: String, default: '', trim: true, maxlength: 160 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviews: { type: Number, default: 0, min: 0 },
  tag: { type: String, default: 'New', maxlength: 30 }
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  teachingQuality: { type: Number, min: 1, max: 5, required: true },
  difficulty: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 1500 }
}, { timestamps: true });

reviewSchema.index({ professor: 1, user: 1 }, { unique: true });
reviewSchema.index({ professor: 1, createdAt: -1 });

export const User = mongoose.model('User', userSchema);
export const Professor = mongoose.model('Professor', professorSchema);
export const Review = mongoose.model('Review', reviewSchema);
