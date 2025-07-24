import { RequestHandler } from 'express';
import { Comment } from '../models/Comment';
import { Answer } from '../models/Answer';
import { User } from '../models/User';
import { createNotification, NotificationType } from './notifications';
import mongoose from 'mongoose';

import { getCurrentUserFromRequest } from './auth';

// Get comments for an answer
export const getAnswerComments: RequestHandler = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = await Comment.find({ 
      answerId: new mongoose.Types.ObjectId(answerId),
      parentCommentId: null // Only top-level comments
    })
      .populate('authorId', 'username avatar reputation')
      .sort({ createdAt: 1 })
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ 
          parentCommentId: comment._id 
        })
          .populate('authorId', 'username avatar reputation')
          .sort({ createdAt: 1 });

        return {
          ...comment.toObject(),
          replies
        };
      })
    );

    const total = await Comment.countDocuments({ 
      answerId: new mongoose.Types.ObjectId(answerId),
      parentCommentId: null 
    });

    res.json({
      comments: commentsWithReplies,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new comment
export const createComment: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { answerId, body, parentCommentId } = req.body;

    if (!body || body.trim().length < 5) {
      return res.status(400).json({ 
        error: 'Comment must be at least 5 characters long' 
      });
    }

    // Verify answer exists
    const answer = await Answer.findById(answerId).populate('authorId');
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // If it's a reply, verify parent comment exists
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId).populate('authorId');
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const newComment = new Comment({
      answerId: new mongoose.Types.ObjectId(answerId),
      authorId: new mongoose.Types.ObjectId(userId),
      body: body.trim(),
      parentCommentId: parentCommentId ? new mongoose.Types.ObjectId(parentCommentId) : undefined
    });

    await newComment.save();
    await newComment.populate('authorId', 'username avatar reputation');

    // Send notifications
    const currentUser = await User.findById(userId);
    
    if (parentCommentId && parentComment) {
      // Notify parent comment author about reply
      const parentAuthor = parentComment.authorId as any;
      if (parentAuthor._id.toString() !== userId.toString()) {
        await createNotification(
          parentAuthor._id,
          NotificationType.COMMENT_REPLIED,
          `${currentUser?.username} replied to your comment`,
          {
            sourceUserId: new mongoose.Types.ObjectId(userId),
            answerId: new mongoose.Types.ObjectId(answerId),
            commentId: newComment._id
          }
        );
      }
    } else {
      // Notify answer author about new comment
      const answerAuthor = answer.authorId as any;
      if (answerAuthor._id.toString() !== userId.toString()) {
        await createNotification(
          answerAuthor._id,
          NotificationType.ANSWER_COMMENTED,
          `${currentUser?.username} commented on your answer`,
          {
            sourceUserId: new mongoose.Types.ObjectId(userId),
            answerId: new mongoose.Types.ObjectId(answerId),
            commentId: newComment._id
          }
        );
      }
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Vote on comment
export const voteComment: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { vote } = req.body; // 1 for upvote, -1 for downvote

    if (vote !== 1 && vote !== -1) {
      return res.status(400).json({ error: 'Vote must be 1 or -1' });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user has already voted
    const existingVoteIndex = comment.voters.findIndex(
      v => v.userId.toString() === userId
    );

    if (existingVoteIndex >= 0) {
      return res.status(400).json({ error: 'You have already voted on this comment' });
    }

    comment.votes += vote;
    comment.voters.push({
      userId: new mongoose.Types.ObjectId(userId),
      value: vote
    });

    await comment.save();

    res.json({
      commentId: comment._id,
      newVoteCount: comment.votes,
      message: vote === 1 ? 'Comment upvoted' : 'Comment downvoted'
    });
  } catch (error) {
    console.error('Error voting on comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete comment (only by author or admin)
export const deleteComment: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const currentUser = await User.findById(userId);
    
    // Check if user is author or admin
    if (comment.authorId.toString() !== userId && !currentUser?.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(id);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
