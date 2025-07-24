import { RequestHandler } from "express";
import { getCurrentUserFromRequest, mockUsers } from './auth-simple';
import { createNotification } from './notifications-simple';
import { Question as MongoQuestion } from '../models/Question.js';
import { User as MongoUser } from '../models/User.js';
import { Answer as MongoAnswer } from '../models/Answer.js';
import { Comment as MongoComment } from '../models/Comment.js';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';

// Simple mock question interface
interface Question {
  id: string;
  title: string;
  body: string;
  tags: string[];
  authorId: string;
  votes: number;
  voters: { userId: string; value: number }[];
  answerCount: number;
  views: number;
  hasAcceptedAnswer: boolean;
  acceptedAnswerId?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Mock questions store - cleared for fresh testing
const mockQuestions: Question[] = [];
console.log('🧹 Fresh start: Questions cleared');

// Get all questions (only approved ones for regular users)
export const getQuestions: RequestHandler = async (req, res) => {
  try {
    const { sort = 'newest', filter = 'all', page = 1, limit = 20 } = req.query;
    const userId = getCurrentUserFromRequest(req);

    if (USE_MOCK_DATA) {
      // Mock data mode
      let user = null;
      if (userId) {
        user = mockUsers.find(u => u.id === userId);
      }

      // Base filter - only approved questions for non-admins
      let filteredQuestions = user?.isAdmin ?
        [...mockQuestions] :
        mockQuestions.filter(q => q.isApproved);

      // Apply sorting
      switch (sort) {
        case 'votes':
          filteredQuestions.sort((a, b) => b.votes - a.votes);
          break;
        case 'active':
          filteredQuestions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          break;
        case 'unanswered':
          filteredQuestions = filteredQuestions.filter(q => q.answerCount === 0);
          break;
        default: // newest
          filteredQuestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedQuestions = filteredQuestions.slice(startIndex, endIndex);

      // Transform to match frontend expectations with author details
      const transformedQuestions = paginatedQuestions.map(q => {
        const author = mockUsers.find(u => u.id === q.authorId);
        return {
          id: q.id,
          title: q.title,
          body: q.body,
          tags: q.tags,
          author: {
            id: author?.id || 'unknown',
            username: author?.username || 'Unknown User',
            reputation: author?.reputation || 0,
            avatar: author?.avatar
          },
          votes: q.votes,
          answers: q.answerCount,
          views: q.views,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          hasAcceptedAnswer: q.hasAcceptedAnswer,
          isApproved: q.isApproved,
          approvedAt: q.approvedAt
        };
      });

      res.json({
        questions: transformedQuestions,
        total: filteredQuestions.length,
        page: pageNum,
        limit: limitNum,
        hasMore: endIndex < filteredQuestions.length
      });
    } else {
      // MongoDB mode
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Check if user is admin
      let user = null;
      if (userId) {
        user = await MongoUser.findById(userId);
      }

      // Build query filter - only approved questions for non-admins
      const filter: any = user?.isAdmin ? {} : { isApproved: true };

      // Apply additional filters
      if (filter === 'unanswered') {
        filter.answerCount = 0;
      }

      // Build sort options
      let sortOptions: any = {};
      switch (sort) {
        case 'votes':
          sortOptions = { votes: -1 };
          break;
        case 'active':
          sortOptions = { updatedAt: -1 };
          break;
        case 'unanswered':
          filter.answerCount = 0;
          sortOptions = { createdAt: -1 };
          break;
        default: // newest
          sortOptions = { createdAt: -1 };
      }

      // Get questions from MongoDB
      const questions = await MongoQuestion.find(filter)
        .populate('authorId', 'username reputation avatar')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum);

      const total = await MongoQuestion.countDocuments(filter);

      // Transform questions
      const transformedQuestions = questions.map(q => ({
        id: q._id.toString(),
        title: q.title,
        body: q.body,
        tags: q.tags,
        author: {
          id: q.authorId._id.toString(),
          username: q.authorId.username,
          reputation: q.authorId.reputation,
          avatar: q.authorId.avatar
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

      console.log(`📋 Fetched ${transformedQuestions.length} questions (Total: ${total}) for ${user?.isAdmin ? 'admin' : 'user'}`);

      res.json({
        questions: transformedQuestions,
        total,
        page: pageNum,
        limit: limitNum,
        hasMore: skip + limitNum < total
      });
    }
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

    if (USE_MOCK_DATA) {
      // Mock data mode
      const question = mockQuestions.find(q => q.id === id);

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Check if user can view this question (approved or admin/author)
      let user = null;
      if (userId) {
        user = mockUsers.find(u => u.id === userId);
      }

      const canView = question.isApproved ||
                     user?.isAdmin ||
                     question.authorId === userId;

      if (!canView) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Increment view count
      question.views += 1;

      // Get author details and answers
      const author = mockUsers.find(u => u.id === question.authorId);
      const questionAnswers = mockAnswers.filter(a => a.questionId === id);
      const transformedAnswers = questionAnswers.map(answer => {
        const answerAuthor = mockUsers.find(u => u.id === answer.authorId);

        // Get comments for this answer
        const answerComments = mockComments.filter(c => c.answerId === answer.id);
        const transformedComments = answerComments.map(comment => {
          const commentAuthor = mockUsers.find(u => u.id === comment.authorId);
          return {
            id: comment.id,
            body: comment.body,
            author: {
              id: commentAuthor?.id || 'unknown',
              username: commentAuthor?.username || 'Unknown User',
              reputation: commentAuthor?.reputation || 0,
              avatar: commentAuthor?.avatar
            },
            votes: comment.votes,
            parentCommentId: comment.parentCommentId,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt
          };
        });

        transformedComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return {
          id: answer.id,
          body: answer.body,
          author: {
            id: answerAuthor?.id || 'unknown',
            username: answerAuthor?.username || 'Unknown User',
            reputation: answerAuthor?.reputation || 0,
            avatar: answerAuthor?.avatar
          },
          votes: answer.votes,
          isAccepted: answer.isAccepted,
          createdAt: answer.createdAt,
          updatedAt: answer.updatedAt,
          comments: transformedComments
        };
      });

      transformedAnswers.sort((a, b) => {
        if (a.isAccepted && !b.isAccepted) return -1;
        if (!a.isAccepted && b.isAccepted) return 1;
        if (a.votes !== b.votes) return b.votes - a.votes;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const transformedQuestion = {
        id: question.id,
        title: question.title,
        body: question.body,
        tags: question.tags,
        author: {
          id: author?.id || 'unknown',
          username: author?.username || 'Unknown User',
          reputation: author?.reputation || 0,
          avatar: author?.avatar
        },
        votes: question.votes,
        answers: question.answerCount,
        views: question.views,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        hasAcceptedAnswer: question.hasAcceptedAnswer,
        isApproved: question.isApproved,
        approvedAt: question.approvedAt,
        answersList: transformedAnswers
      };

      res.json(transformedQuestion);
    } else {
      // MongoDB mode
      const question = await MongoQuestion.findById(id).populate('authorId', 'username reputation avatar');

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Check if user can view this question (approved or admin/author)
      let user = null;
      if (userId) {
        user = await MongoUser.findById(userId);
      }

      const canView = question.isApproved ||
                     user?.isAdmin ||
                     question.authorId._id.toString() === userId;

      if (!canView) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Increment view count
      question.views += 1;
      await question.save();

      console.log(`👁️ Question viewed (MONGODB): "${question.title}" - Views: ${question.views}`);

      const transformedQuestion = {
        id: question._id.toString(),
        title: question.title,
        body: question.body,
        tags: question.tags,
        author: {
          id: question.authorId._id.toString(),
          username: question.authorId.username,
          reputation: question.authorId.reputation,
          avatar: question.authorId.avatar
        },
        votes: question.votes,
        answers: question.answerCount,
        views: question.views,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        hasAcceptedAnswer: question.hasAcceptedAnswer,
        isApproved: question.isApproved,
        approvedAt: question.approvedAt,
        answersList: await (async () => {
          const questionAnswers = await MongoAnswer.find({ questionId: id })
            .populate('authorId', 'username reputation avatar')
            .sort({ isAccepted: -1, votes: -1, createdAt: 1 });

                    return await Promise.all(questionAnswers.map(async (answer) => {
            const answerComments = await MongoComment.find({ answerId: answer._id.toString() })
              .populate('authorId', 'username reputation avatar')
              .sort({ createdAt: 1 });

            return {
              id: answer._id.toString(),
              body: answer.body,
              author: {
                id: answer.authorId._id.toString(),
                username: answer.authorId.username,
                reputation: answer.authorId.reputation,
                avatar: answer.authorId.avatar
              },
              votes: answer.votes,
              isAccepted: answer.isAccepted,
              createdAt: answer.createdAt,
              updatedAt: answer.updatedAt,
              comments: answerComments.map(comment => ({
                id: comment._id.toString(),
                body: comment.body,
                author: {
                  id: comment.authorId._id.toString(),
                  username: comment.authorId.username,
                  reputation: comment.authorId.reputation,
                  avatar: comment.authorId.avatar
                },
                votes: comment.votes,
                parentCommentId: comment.parentCommentId,
                createdAt: comment.createdAt,
                updatedAt: comment.updatedAt
              }))
            };
          }));
        })()
      };

      res.json(transformedQuestion);
    }
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

    if (USE_MOCK_DATA) {
      // Mock data mode
      const newQuestion: Question = {
        id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        body,
        tags,
        authorId: userId,
        votes: 0,
        voters: [],
        answerCount: 0,
        views: 0,
        hasAcceptedAnswer: false,
        isApproved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockQuestions.push(newQuestion);
      console.log(`❓ New question created (MOCK): ${title} by ${userId}`);

      // Get author details
      const author = mockUsers.find(u => u.id === userId);

      // Transform response
      const questionResponse = {
        id: newQuestion.id,
        title: newQuestion.title,
        body: newQuestion.body,
        tags: newQuestion.tags,
        author: {
          id: author?.id || 'unknown',
          username: author?.username || 'Unknown User',
          reputation: author?.reputation || 0,
          avatar: author?.avatar
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
    } else {
      // MongoDB mode
      const newQuestion = new MongoQuestion({
        title,
        body,
        tags,
        authorId: userId,
        votes: 0,
        voters: [],
        answerCount: 0,
        views: 0,
        hasAcceptedAnswer: false,
        isApproved: false
      });

      await newQuestion.save();
      console.log(`❓ New question created (MONGODB): ${title} by ${userId} - ID: ${newQuestion._id}`);

      // Get author details
      const author = await MongoUser.findById(userId).select('-password');

      // Transform response
      const questionResponse = {
        id: newQuestion._id.toString(),
        title: newQuestion.title,
        body: newQuestion.body,
        tags: newQuestion.tags,
        author: {
          id: author?._id.toString() || 'unknown',
          username: author?.username || 'Unknown User',
          reputation: author?.reputation || 0,
          avatar: author?.avatar
        },
        votes: newQuestion.votes,
        answers: newQuestion.answerCount,
        views: newQuestion.views,
        createdAt: newQuestion.createdAt,
        updatedAt: newQuestion.updatedAt,
        hasAcceptedAnswer: newQuestion.hasAcceptedAnswer,
        isApproved: newQuestion.isApproved
      };

      // Create notification for all admins
      try {
        const admins = await MongoUser.find({ isAdmin: true });
        for (const admin of admins) {
          await createNotification(admin._id.toString(), {
            type: 'question_submitted',
            sourceUserId: userId,
            questionId: newQuestion._id.toString(),
            message: `New question submitted: "${title}"`
          });
        }
      } catch (notifError) {
        console.error('Error creating admin notifications:', notifError);
      }

      res.status(201).json({
        ...questionResponse,
        message: 'Question submitted for admin approval'
      });
    }
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
    
    if (USE_MOCK_DATA) {
      const question = mockQuestions.find(q => q.id === id);

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Check if user has already voted
      const existingVoteIndex = question.voters.findIndex(
        v => v.userId === userId
      );

      if (existingVoteIndex >= 0) {
        return res.status(400).json({ error: 'You have already voted on this question' });
      }

      // Add vote
      question.votes += vote;
      question.voters.push({
        userId: userId,
        value: vote
      });
      question.updatedAt = new Date();

      res.json({
        questionId: question.id,
        newVoteCount: question.votes,
        message: vote === 1 ? 'Question upvoted' : 'Question downvoted'
      });
    } else {
      // MongoDB mode
      const question = await MongoQuestion.findById(id);
      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

       // Check if user already voted
      const existingVote = question.voters.find(v => v.userId.toString() === userId);
      
      if (existingVote) {
        if (existingVote.value === vote) {
          // Remove the vote (toggle off) - use atomic operation
          const updatedQuestion = await MongoQuestion.findByIdAndUpdate(
            id,
            {
              $inc: { votes: -vote },
              $pull: { voters: { userId } }
            },
            { new: true }
          );
          
          return res.json({
            votes: updatedQuestion.votes,
            userVote: 0,
            message: 'Vote removed'
          });
        } else {
          // Change vote - use atomic operation
          const voteChange = vote - existingVote.value;
          const updatedQuestion = await MongoQuestion.findByIdAndUpdate(
            id,
            {
              $inc: { votes: voteChange },
              $set: { "voters.$.value": vote }
            },
            { 
              new: true,
              arrayFilters: [{ "voter.userId": userId }]
            }
          );
          
          return res.json({
            votes: updatedQuestion.votes,
            userVote: vote,
            message: 'Vote updated successfully'
          });
        }
      } else {
        // Add new vote - use atomic operation
        const updatedQuestion = await MongoQuestion.findByIdAndUpdate(
          id,
          {
            $inc: { votes: vote },
            $push: { voters: { userId, value: vote } }
          },
          { new: true }
        );
        
        return res.json({
          votes: updatedQuestion.votes,
          userVote: vote,
          message: 'Vote recorded successfully'
        });
      }
    }
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

    if (USE_MOCK_DATA) {
      // Mock data mode
      const user = mockUsers.find(u => u.id === userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;

      const question = mockQuestions.find(q => q.id === id);

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      question.isApproved = true;
      question.approvedBy = userId;
      question.approvedAt = new Date();
      question.updatedAt = new Date();

      // Increase author's reputation for approved question
      const author = mockUsers.find(u => u.id === question.authorId);
      if (author) {
        author.reputation += 10; // Award 10 reputation points for approved question
        console.log(`✅ Increased ${author.username}'s reputation by 10 (now ${author.reputation})`);
      }

      // Create notification for the question author
      createNotification(
        question.authorId,
        'question_approved',
        'Question Approved!',
        `Your question "${question.title}" has been approved and is now visible to the community.`,
        {
          sourceUserId: userId,
          questionId: question.id
        }
      );

      res.json({
        message: 'Question approved successfully',
        question: {
          id: question.id,
          title: question.title,
          isApproved: question.isApproved,
          approvedAt: question.approvedAt
        }
      });
    } else {
      // MongoDB mode
      const user = await MongoUser.findById(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;

      const question = await MongoQuestion.findById(id);

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Update question approval status
      question.isApproved = true;
      question.approvedBy = userId;
      question.approvedAt = new Date();
      await question.save();

      // Increase author's reputation for approved question
      const author = await MongoUser.findById(question.authorId);
      if (author) {
        author.reputation += 10; // Award 10 reputation points for approved question
        await author.save();
        console.log(`✅ Increased ${author.username}'s reputation by 10 (now ${author.reputation})`);
      }

      // Create notification for the question author
      await createNotification(question.authorId.toString(), {
        type: 'question_approved',
        sourceUserId: userId,
        questionId: question._id.toString(),
        message: `Your question "${question.title}" has been approved and is now visible to the community.`
      });

      console.log(`✅ Question approved (MONGODB): "${question.title}" by admin ${user.username}`);

      res.json({
        message: 'Question approved successfully',
        question: {
          id: question._id.toString(),
          title: question.title,
          isApproved: question.isApproved,
          approvedAt: question.approvedAt
        }
      });
    }
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

    if (USE_MOCK_DATA) {
      // Mock data mode
      const user = mockUsers.find(u => u.id === userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;

      const pendingQuestions = mockQuestions.filter(q => !q.isApproved);
      const paginatedQuestions = pendingQuestions.slice(startIndex, endIndex);

      const transformedQuestions = paginatedQuestions.map(q => {
        const author = mockUsers.find(u => u.id === q.authorId);
        return {
          id: q.id,
          title: q.title,
          body: q.body,
          tags: q.tags,
          author: {
            id: author?.id || 'unknown',
            username: author?.username || 'Unknown User',
            reputation: author?.reputation || 0,
            avatar: author?.avatar
          },
          votes: q.votes,
          views: q.views,
          createdAt: q.createdAt,
          isApproved: q.isApproved
        };
      });

      res.json({
        questions: transformedQuestions,
        total: pendingQuestions.length,
        page: pageNum,
        limit: limitNum
      });
    } else {
      // MongoDB mode
      const user = await MongoUser.findById(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Get pending questions from MongoDB
      const pendingQuestions = await MongoQuestion.find({ isApproved: false })
        .populate('authorId', 'username reputation avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const totalPending = await MongoQuestion.countDocuments({ isApproved: false });

      const transformedQuestions = pendingQuestions.map(q => ({
        id: q._id.toString(),
        title: q.title,
        body: q.body,
        tags: q.tags,
        author: {
          id: q.authorId._id.toString(),
          username: q.authorId.username,
          reputation: q.authorId.reputation,
          avatar: q.authorId.avatar
        },
        votes: q.votes,
        views: q.views,
        createdAt: q.createdAt,
        isApproved: q.isApproved
      }));

      console.log(`📋 Admin viewing ${transformedQuestions.length} pending questions (Total: ${totalPending})`);

      res.json({
        questions: transformedQuestions,
        total: totalPending,
        page: pageNum,
        limit: limitNum
      });
    }
  } catch (error) {
    console.error('Error fetching pending questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mock answers interface
interface Answer {
  id: string;
  questionId: string;
  body: string;
  authorId: string;
  votes: number;
  voters: { userId: string; value: number }[];
  isAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock answers store - cleared for fresh testing
const mockAnswers: Answer[] = [];
console.log('📝 Fresh start: Answers cleared');

// Mock comments interface
interface Comment {
  id: string;
  answerId: string;
  authorId: string;
  body: string;
  parentCommentId?: string;
  votes: number;
  voters: { userId: string; value: number }[];
  createdAt: Date;
  updatedAt: Date;
}

// Mock comments store - cleared for fresh testing
const mockComments: Comment[] = [];
console.log('💬 Fresh start: Comments cleared');

// Submit answer to question
export const submitAnswer: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { questionId } = req.params;
    const { body } = req.body;

    if (!body || body.trim().length < 10) {
      return res.status(400).json({ error: 'Answer must be at least 10 characters long' });
    }

    if (USE_MOCK_DATA) {
  // Mock data mode
  const question = mockQuestions.find(q => q.id === questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  if (!question.isApproved) {
    return res.status(400).json({ error: 'Cannot answer unapproved question' });
  }

  const newAnswer: Answer = {
    id: `answer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    questionId,
    body: body.trim(),
    authorId: userId,
    votes: 0,
    voters: [],
    isAccepted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  mockAnswers.push(newAnswer);

  // Update question answer count
  question.answerCount += 1;
  question.updatedAt = new Date();

  // Create notification for question author (if not the same user)
  if (question.authorId !== userId) {
    createNotification(
      question.authorId,
      'question_answered',
      'New Answer to Your Question',
      `Someone answered your question "${question.title}"`,
      {
        sourceUserId: userId,
        questionId,
        answerId: newAnswer.id
      }
    );
  }

  const author = mockUsers.find(u => u.id === userId);

  res.status(201).json({
    id: newAnswer.id,
    body: newAnswer.body,
    author: {
      id: author?.id || 'unknown',
      username: author?.username || 'Unknown User',
      reputation: author?.reputation || 0,
      avatar: author?.avatar
    },
    votes: newAnswer.votes,
    isAccepted: newAnswer.isAccepted,
    createdAt: newAnswer.createdAt,
    message: 'Answer submitted successfully'
  });
} else {
  // MongoDB mode
  const question = await MongoQuestion.findById(questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  if (!question.isApproved) {
    return res.status(400).json({ error: 'Cannot answer unapproved question' });
  }

  const newAnswer = new MongoAnswer({
    questionId,
    body: body.trim(),
    authorId: userId,
    votes: 0,
    voters: [],
    isAccepted: false
  });

  await newAnswer.save();
  
  // Update question answer count
  question.answerCount += 1;
  await question.save();
  
  console.log(`📝 New answer posted (MONGODB): ${body.substring(0, 50)}... by ${userId}`);
  
  // Create notification for question author (if not the same user)
  if (question.authorId.toString() !== userId) {
    await createNotification(question.authorId.toString(), {
      type: 'question_answered',
      sourceUserId: userId,
      questionId,
      answerId: newAnswer._id.toString(),
      message: `Someone answered your question "${question.title}"`
    });
  }
  
  const author = await MongoUser.findById(userId).select('-password');
  
  res.status(201).json({
    id: newAnswer._id.toString(),
    body: newAnswer.body,
    author: {
      id: author._id.toString(),
      username: author.username,
      reputation: author.reputation,
      avatar: author.avatar
    },
    votes: newAnswer.votes,
    isAccepted: newAnswer.isAccepted,
    createdAt: newAnswer.createdAt,
    message: 'Answer submitted successfully'
  });
}
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Vote on answer
export const voteAnswer: RequestHandler = async (req, res) => {
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

     if (USE_MOCK_DATA) {
      const answer = mockAnswers.find(a => a.id === id);
      
      if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
      }

      // Check if user already voted on answer
      const existingAnswerVote = answer.voters.find(v => v.userId.toString() === userId);

      if (existingAnswerVote) {
        if (existingAnswerVote.value === vote) {
          // Remove the vote (toggle off) - use atomic operation
          const updatedAnswer = await MongoAnswer.findByIdAndUpdate(
            id,
            {
              $inc: { votes: -vote },
              $pull: { voters: { userId } }
            },
            { new: true }
          );

          return res.json({
            votes: updatedAnswer.votes,
            userVote: 0,
            message: 'Vote removed'
          });
        } else {
          // Change vote - use atomic operation
          const voteChange = vote - existingAnswerVote.value;
          const updatedAnswer = await MongoAnswer.findByIdAndUpdate(
            id,
            {
              $inc: { votes: voteChange },
              $set: { "voters.$.value": vote }
            },
            {
              new: true,
              arrayFilters: [{ "voter.userId": userId }]
            }
          );

          return res.json({
            votes: updatedAnswer.votes,
            userVote: vote,
            message: 'Vote updated successfully'
          });
        }
      } else {
        // Add new vote - use atomic operation
        const updatedAnswer = await MongoAnswer.findByIdAndUpdate(
          id,
          {
            $inc: { votes: vote },
            $push: { voters: { userId, value: vote } }
          },
          { new: true }
        );

        return res.json({
          votes: updatedAnswer.votes,
          userVote: vote,
          message: 'Vote recorded successfully'
        });
      }
    }
  } catch (error) {
    console.error('Error voting on answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get comments for an answer
export const getAnswerComments: RequestHandler = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = mockComments.filter(c => c.answerId === answerId);

    // Sort by creation date (oldest first for comments)
    comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Apply pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedComments = comments.slice(startIndex, endIndex);

    // Transform comments with author details
    const transformedComments = paginatedComments.map(comment => {
      const author = mockUsers.find(u => u.id === comment.authorId);
      return {
        id: comment.id,
        body: comment.body,
        author: {
          id: author?.id || 'unknown',
          username: author?.username || 'Unknown User',
          reputation: author?.reputation || 0,
          avatar: author?.avatar
        },
        votes: comment.votes,
        parentCommentId: comment.parentCommentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt
      };
    });

    res.json({
      comments: transformedComments,
      total: comments.length,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new comment
export const createComment: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { answerId, body, parentCommentId } = req.body;

    // Validation
    if (!answerId || !body) {
      return res.status(400).json({ error: 'Answer ID and comment body are required' });
    }

    if (body.trim().length < 5) {
      return res.status(400).json({ error: 'Comment must be at least 5 characters long' });
    }

    if (body.trim().length > 1000) {
      return res.status(400).json({ error: 'Comment must be less than 1000 characters' });
    }

    // Check if answer exists
    if (USE_MOCK_DATA) {
      const answer = mockAnswers.find(a => a.id === answerId);
      if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
      }
    } else {
      // MongoDB mode - check if answer exists
      const answer = await MongoAnswer.findById(answerId);
      if (!answer) {
        return res.status(404).json({ error: 'Answer not found' });
      }
    }

    if (USE_MOCK_DATA) {
      // If replying to a comment, check if parent comment exists
      if (parentCommentId) {
        const parentComment = mockComments.find(c => c.id === parentCommentId && c.answerId === answerId);
        if (!parentComment) {
          return res.status(404).json({ error: 'Parent comment not found' });
        }
      }

      const newComment: Comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        answerId,
        authorId: userId,
        body: body.trim(),
        parentCommentId,
        votes: 0,
        voters: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockComments.push(newComment);

      const author = mockUsers.find(u => u.id === userId);

      res.status(201).json({
        id: newComment.id,
        body: newComment.body,
        author: {
          id: author?.id || 'unknown',
          username: author?.username || 'Unknown User',
          reputation: author?.reputation || 0,
          avatar: author?.avatar
        },
        votes: newComment.votes,
        parentCommentId: newComment.parentCommentId,
        createdAt: newComment.createdAt,
        message: 'Comment added successfully'
      });
    } else {
      // MongoDB mode
      if (parentCommentId) {
        const parentComment = await MongoComment.findOne({ _id: parentCommentId, answerId });
        if (!parentComment) {
          return res.status(404).json({ error: 'Parent comment not found' });
        }
      }

      const newComment = new MongoComment({
        answerId,
        authorId: userId,
        body: body.trim(),
        parentCommentId,
        votes: 0,
        voters: []
      });

      await newComment.save();
      await newComment.populate('authorId', 'username reputation avatar');

      res.status(201).json({
        id: newComment._id.toString(),
        body: newComment.body,
        author: {
          id: newComment.authorId._id.toString(),
          username: newComment.authorId.username,
          reputation: newComment.authorId.reputation,
          avatar: newComment.authorId.avatar
        },
        votes: newComment.votes,
        parentCommentId: newComment.parentCommentId,
        createdAt: newComment.createdAt,
        message: 'Comment added successfully'
      });
    }
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Vote on a comment
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

    const comment = mockComments.find(c => c.id === id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user has already voted
    const existingVoteIndex = comment.voters.findIndex(
      v => v.userId === userId
    );

    if (existingVoteIndex >= 0) {
      return res.status(400).json({ error: 'You have already voted on this comment' });
    }

    // Add vote
    comment.votes += vote;
    comment.voters.push({
      userId: userId,
      value: vote
    });
    comment.updatedAt = new Date();

    res.json({
      commentId: comment.id,
      newVoteCount: comment.votes,
      message: vote === 1 ? 'Comment upvoted' : 'Comment downvoted'
    });
  } catch (error) {
    console.error('Error voting on comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a comment (author only)
export const deleteComment: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const commentIndex = mockComments.findIndex(c => c.id === id);

    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = mockComments[commentIndex];

    // Check if user is author or admin
    const user = mockUsers.find(u => u.id === userId);
    if (comment.authorId !== userId && !user?.isAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    mockComments.splice(commentIndex, 1);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Export mock questions, answers, and comments for use in other modules
export { mockQuestions, mockAnswers, mockComments };
