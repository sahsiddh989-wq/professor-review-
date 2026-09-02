import 'dotenv/config';
import mongoose from 'mongoose';
import { Professor } from './models.js';

const professors = [
  { name: 'Dr. Jennifer Smith', course: 'Data Structures', rating: 4.8, reviews: 245, tag: 'Excellent', dept: 'Computer Science', university: 'IEC College of Engineering and Technology' },
  { name: 'Prof. Michael Brown', course: 'Calculus I', rating: 4.7, reviews: 189, tag: 'Clear', dept: 'Mathematics', university: 'Delhi University' },
  { name: 'Dr. Sarah Johnson', course: 'Psychology 101', rating: 4.6, reviews: 210, tag: 'Helpful', dept: 'Psychology', university: 'Delhi University' },
  { name: 'Prof. David Lee', course: 'Economics', rating: 4.5, reviews: 162, tag: 'Fair', dept: 'Economics', university: 'IEC College of Engineering and Technology' },
  { name: 'Dr. Emily Carter', course: 'Operating Systems', rating: 4.8, reviews: 137, tag: 'Engaging', dept: 'Computer Science', university: 'IEC College of Engineering and Technology' },
  { name: 'Prof. Daniel Wilson', course: 'Statistics', rating: 4.7, reviews: 118, tag: 'Supportive', dept: 'Mathematics', university: 'Delhi University' }
];

await mongoose.connect(process.env.MONGODB_URI);
await Professor.deleteMany({});
await Professor.insertMany(professors);
console.log(`Seeded ${professors.length} professors.`);
await mongoose.disconnect();
