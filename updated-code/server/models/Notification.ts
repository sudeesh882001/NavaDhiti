import mongoose from 'mongoose';

export enum NotificationType {
  QUESTION_SUBMITTED = 'question_submitted',
  QUESTION_APPROVED = 'question_approved',
  QUESTION_ANSWERED = 'question_answered',
  ANSWER_VOTED = 'answer_voted',
  QUESTION_VOTED = 'question_voted',
  ANSWER_COMMENTED = 'answer_commented',
  COMMENT_REPLIED = 'comment_replied'
}

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true
  },
  sourceUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  },
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ questionId: 1 });
notificationSchema.index({ type: 1 });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
