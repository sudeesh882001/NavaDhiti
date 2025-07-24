import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  reputation: {
    type: Number,
    default: 1
  },
  googleId: {
    type: String,
    sparse: true
  },
  avatar: {
    type: String
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ reputation: -1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
