import { RequestHandler } from "express";
import { Question } from '../models/Question';
import { Answer } from '../models/Answer';
import { User } from '../models/User';
import { getCurrentUserFromRequest } from './auth';
import { createNotification, notifyAdmins, NotificationType } from './notifications';
import mongoose from 'mongoose';



// Get all questions (only approved ones for regular users)
export const getQuestions: RequestHandler = async (req, res) => {
  try {
    const { sort = 'newest', filter = 'all', page = 1, limit = 20 } = req.query;
    const userId = getCurrentUserFromRequest(req);

    // Check if user is admin
    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }

    // Base filter - only approved questions for non-admins
    const baseFilter: any = user?.isAdmin ? {} : { isApproved: true };

    let sortOptions: any = {};
    let filterOptions = { ...baseFilter };

    // Apply sorting
    switch (sort) {
      case 'votes':
        sortOptions = { votes: -1 };
        break;
      case 'active':
        sortOptions = { updatedAt: -1 };
        break;
      case 'unanswered':
        filterOptions.answerCount = 0;
        sortOptions = { createdAt: -1 };
        break;
      default: // newest
        sortOptions = { createdAt: -1 };
    }

    // Apply pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const questions = await Question.find(filterOptions)
      .populate('authorId', 'username reputation avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const total = await Question.countDocuments(filterOptions);

    // Transform to match frontend expectations
    const transformedQuestions = questions.map(q => ({
      id: q._id,
      title: q.title,
      body: q.body,
      tags: q.tags,
      author: {
        id: (q.authorId as any)._id,
        username: (q.authorId as any).username,
        reputation: (q.authorId as any).reputation,
        avatar: (q.authorId as any).avatar
      },
      votes: q.votes,
      answers: q.answerCount,
      views: q.views,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      hasAcceptedAnswer: q.hasAcceptedAnswer,
      isApproved: q.isApproved,
      approvedAt: q.approvedAt
    }));

    res.json({
      questions: transformedQuestions,
      total,
      page: pageNum,
      limit: limitNum,
      hasMore: skip + limitNum < total
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single question by ID
export const getQuestionById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getCurrentUserFromRequest(req);

    const question = await Question.findById(id)
      .populate('authorId', 'username reputation avatar');

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user can view this question (approved or admin/author)
    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }

    const canView = question.isApproved ||
                   user?.isAdmin ||
                   question.authorId._id.toString() === userId;

    if (!canView) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Increment view count
    await Question.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Get answers for this question
    const answers = await Answer.find({ questionId: id })
      .populate('authorId', 'username reputation avatar')
      .sort({ isAccepted: -1, votes: -1 });

    // Transform data
    const transformedQuestion = {
      id: question._id,
      title: question.title,
      body: question.body,
      tags: question.tags,
      author: {
        id: (question.authorId as any)._id,
        username: (question.authorId as any).username,
        reputation: (question.authorId as any).reputation,
        avatar: (question.authorId as any).avatar
      },
      votes: question.votes,
      answers: answers.length,
      views: question.views + 1,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      hasAcceptedAnswer: question.hasAcceptedAnswer,
      isApproved: question.isApproved,
      approvedAt: question.approvedAt,
      answersList: answers.map(a => ({
        id: a._id,
        body: a.body,
        author: {
          id: (a.authorId as any)._id,
          username: (a.authorId as any).username,
          reputation: (a.authorId as any).reputation,
          avatar: (a.authorId as any).avatar
        },
        votes: a.votes,
        isAccepted: a.isAccepted,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      }))
    };

    res.json(transformedQuestion);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new question
export const createQuestion: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title, body, tags } = req.body;

    // Basic validation
    if (!title || !body || !tags || !Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Missing required fields: title, body, tags'
      });
    }

    if (title.length < 15) {
      return res.status(400).json({
        error: 'Title must be at least 15 characters long'
      });
    }

    if (body.length < 30) {
      return res.status(400).json({
        error: 'Question body must be at least 30 characters long'
      });
    }

    if (tags.length === 0 || tags.length > 5) {
      return res.status(400).json({
        error: 'Must have between 1 and 5 tags'
      });
    }

    // Create new question (not approved by default)
    const newQuestion = new Question({
      title,
      body,
      tags,
      authorId: new mongoose.Types.ObjectId(userId),
      votes: 0,
      answerCount: 0,
      views: 0,
      hasAcceptedAnswer: false,
      isApproved: false
    });

    await newQuestion.save();
    await newQuestion.populate('authorId', 'username reputation avatar');

    // Notify all admins about new question
    const author = await User.findById(userId);
    await notifyAdmins(
      NotificationType.QUESTION_SUBMITTED,
      `New question "${title}" submitted by ${author?.username} requires approval`,
      {
        sourceUserId: new mongoose.Types.ObjectId(userId),
        questionId: newQuestion._id
      }
    );

    // Transform response
    const questionResponse = {
      id: newQuestion._id,
      title: newQuestion.title,
      body: newQuestion.body,
      tags: newQuestion.tags,
      author: {
        id: (newQuestion.authorId as any)._id,
        username: (newQuestion.authorId as any).username,
        reputation: (newQuestion.authorId as any).reputation,
        avatar: (newQuestion.authorId as any).avatar
      },
      votes: newQuestion.votes,
      answers: newQuestion.answerCount,
      views: newQuestion.views,
      createdAt: newQuestion.createdAt,
      updatedAt: newQuestion.updatedAt,
      hasAcceptedAnswer: newQuestion.hasAcceptedAnswer,
      isApproved: newQuestion.isApproved
    };

    res.status(201).json({
      ...questionResponse,
      message: 'Question submitted for admin approval'
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Vote on question
export const voteQuestion: RequestHandler = async (req, res) => {
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

    const question = await Question.findById(id).populate('authorId', 'username');

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user has already voted
    const existingVoteIndex = question.voters.findIndex(
      v => v.userId.toString() === userId
    );

    if (existingVoteIndex >= 0) {
      return res.status(400).json({ error: 'You have already voted on this question' });
    }

    // Add vote
    question.votes += vote;
    question.voters.push({
      userId: new mongoose.Types.ObjectId(userId),
      value: vote
    });

    await question.save();

    // Notify question author about vote (only for upvotes)
    if (vote === 1 && question.authorId._id.toString() !== userId) {
      const voter = await User.findById(userId);
      await createNotification(
        question.authorId._id,
        NotificationType.QUESTION_VOTED,
        `${voter?.username} upvoted your question "${question.title}"`,
        {
          sourceUserId: new mongoose.Types.ObjectId(userId),
          questionId: question._id
        }
      );
    }

    res.json({
      questionId: question._id,
      newVoteCount: question.votes,
      message: vote === 1 ? 'Question upvoted' : 'Question downvoted'
    });
  } catch (error) {
    console.error('Error voting on question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve question (admin only)
export const approveQuestion: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const question = await Question.findByIdAndUpdate(
      id,
      {
        isApproved: true,
        approvedBy: new mongoose.Types.ObjectId(userId),
        approvedAt: new Date()
      },
      { new: true }
    ).populate('authorId', 'username');

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Notify question author about approval
    await createNotification(
      question.authorId._id,
      NotificationType.QUESTION_APPROVED,
      `Your question "${question.title}" has been approved and is now live!`,
      {
        sourceUserId: new mongoose.Types.ObjectId(userId),
        questionId: question._id
      }
    );

    res.json({
      message: 'Question approved successfully',
      question: {
        id: question._id,
        title: question.title,
        isApproved: question.isApproved,
        approvedAt: question.approvedAt
      }
    });
  } catch (error) {
    console.error('Error approving question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pending questions (admin only)
export const getPendingQuestions: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const questions = await Question.find({ isApproved: false })
      .populate('authorId', 'username reputation avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Question.countDocuments({ isApproved: false });

    const transformedQuestions = questions.map(q => ({
      id: q._id,
      title: q.title,
      body: q.body,
      tags: q.tags,
      author: {
        id: (q.authorId as any)._id,
        username: (q.authorId as any).username,
        reputation: (q.authorId as any).reputation,
        avatar: (q.authorId as any).avatar
      },
      votes: q.votes,
      views: q.views,
      createdAt: q.createdAt,
      isApproved: q.isApproved
    }));

    res.json({
      questions: transformedQuestions,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
  } catch (error) {
    console.error('Error fetching pending questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
