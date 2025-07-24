import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 15
  },
  body: {
    type: String,
    required: true,
    minlength: 30
  },
  tags: [{
    type: String,
    required: true
  }],
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
  answerCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  hasAcceptedAnswer: {
    type: Boolean,
    default: false
  },
  acceptedAnswerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
questionSchema.index({ authorId: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ votes: -1 });
questionSchema.index({ 'voters.userId': 1 });
questionSchema.index({ views: -1 });
questionSchema.index({ hasAcceptedAnswer: 1 });
questionSchema.index({ isApproved: 1 });

export const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
