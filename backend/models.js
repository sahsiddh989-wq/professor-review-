import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  university: { type: String, default: '' },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

const professorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  course: { type: String, required: true, trim: true },
  dept: { type: String, default: '' },
  university: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  tag: { type: String, default: 'New' }
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  teachingQuality: { type: Number, min: 1, max: 5, required: true },
  difficulty: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true, trim: true, maxlength: 1500 }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Professor = mongoose.model('Professor', professorSchema);
export const Review = mongoose.model('Review', reviewSchema);
