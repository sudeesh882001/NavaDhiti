import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer',
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  body: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1000
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
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
  }]
}, {
  timestamps: true
});

// Indexes for performance
commentSchema.index({ answerId: 1 });
commentSchema.index({ authorId: 1 });
commentSchema.index({ parentCommentId: 1 });
commentSchema.index({ createdAt: 1 });
commentSchema.index({ 'voters.userId': 1 });

export const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
