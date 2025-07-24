import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  body: {
    type: String,
    required: true,
    minlength: 10
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  votes: {
    type: Number,
    default: 0
  },
  voters: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    value: {
      type: Number,
      enum: [-1, 1]
    }
  }],
  isAccepted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
answerSchema.index({ questionId: 1 });
answerSchema.index({ authorId: 1 });
answerSchema.index({ createdAt: 1 });
answerSchema.index({ votes: -1 });
answerSchema.index({ 'voters.userId': 1 });
answerSchema.index({ isAccepted: 1 });

export const Answer = mongoose.models.Answer || mongoose.model('Answer', answerSchema);
