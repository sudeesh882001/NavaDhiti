import { RequestHandler } from "express";
import { Answer } from '../models/Answer';
import { Question } from '../models/Question';
import { User } from '../models/User';
import { getCurrentUserFromRequest } from './auth';
import { createNotification, NotificationType } from './notifications';
import mongoose from 'mongoose';

// Create new answer
export const createAnswer: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { questionId } = req.params;
    const { body } = req.body;
    
    // Basic validation
    if (!body || body.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Answer must be at least 10 characters long' 
      });
    }
    
    // Verify question exists and is approved
    const question = await Question.findById(questionId).populate('authorId', 'username');
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    if (!question.isApproved) {
      return res.status(400).json({ error: 'Cannot answer unapproved questions' });
    }
    
    // Create new answer
    const newAnswer = new Answer({
      questionId: new mongoose.Types.ObjectId(questionId),
      body: body.trim(),
      authorId: new mongoose.Types.ObjectId(userId),
      votes: 0,
      isAccepted: false
    });
    
    await newAnswer.save();
    await newAnswer.populate('authorId', 'username reputation avatar');
    
    // Update question answer count
    await Question.findByIdAndUpdate(questionId, {
      $inc: { answerCount: 1 },
      updatedAt: new Date()
    });
    
    // Notify question author about new answer
    const answerer = await User.findById(userId);
    if (question.authorId._id.toString() !== userId) {
      await createNotification(
        question.authorId._id,
        NotificationType.QUESTION_ANSWERED,
        `${answerer?.username} answered your question "${question.title}"`,
        {
          sourceUserId: new mongoose.Types.ObjectId(userId),
          questionId: question._id,
          answerId: newAnswer._id
        }
      );
    }
    
    // Transform response
    const answerResponse = {
      id: newAnswer._id,
      questionId: newAnswer.questionId,
      body: newAnswer.body,
      author: {
        id: (newAnswer.authorId as any)._id,
        username: (newAnswer.authorId as any).username,
        reputation: (newAnswer.authorId as any).reputation,
        avatar: (newAnswer.authorId as any).avatar
      },
      votes: newAnswer.votes,
      isAccepted: newAnswer.isAccepted,
      createdAt: newAnswer.createdAt,
      updatedAt: newAnswer.updatedAt
    };
    
    res.status(201).json(answerResponse);
  } catch (error) {
    console.error('Error creating answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get answers for a question
export const getAnswersForQuestion: RequestHandler = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const answers = await Answer.find({ questionId })
      .populate('authorId', 'username reputation avatar')
      .sort({ isAccepted: -1, votes: -1 });
    
    const transformedAnswers = answers.map(a => ({
      id: a._id,
      questionId: a.questionId,
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
    }));
    
    res.json(transformedAnswers);
  } catch (error) {
    console.error('Error fetching answers:', error);
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
    
    const answer = await Answer.findById(id).populate('authorId', 'username');
    
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    
    // Check if user has already voted
    const existingVoteIndex = answer.voters.findIndex(
      v => v.userId.toString() === userId
    );

    if (existingVoteIndex >= 0) {
      return res.status(400).json({ error: 'You have already voted on this answer' });
    }

    // Add vote
    answer.votes += vote;
    answer.voters.push({ 
      userId: new mongoose.Types.ObjectId(userId), 
      value: vote 
    });
    
    await answer.save();
    
    // Notify answer author about vote (only for upvotes)
    if (vote === 1 && answer.authorId._id.toString() !== userId) {
      const voter = await User.findById(userId);
      await createNotification(
        answer.authorId._id,
        NotificationType.ANSWER_VOTED,
        `${voter?.username} upvoted your answer`,
        {
          sourceUserId: new mongoose.Types.ObjectId(userId),
          answerId: answer._id
        }
      );
    }
    
    res.json({ 
      answerId: answer._id,
      newVoteCount: answer.votes,
      message: vote === 1 ? 'Answer upvoted' : 'Answer downvoted'
    });
  } catch (error) {
    console.error('Error voting on answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Accept answer (mark as solution)
export const acceptAnswer: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { id } = req.params;
    
    const answer = await Answer.findById(id).populate('authorId', 'username');
    
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    
    // Verify the user is the question author or admin
    const question = await Question.findById(answer.questionId);
    const user = await User.findById(userId);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    if (question.authorId.toString() !== userId && !user?.isAdmin) {
      return res.status(403).json({ error: 'Only question author can accept answers' });
    }
    
    // Unaccept any previously accepted answers for this question
    await Answer.updateMany(
      { questionId: answer.questionId, _id: { $ne: answer._id } },
      { isAccepted: false }
    );
    
    // Accept this answer
    answer.isAccepted = true;
    await answer.save();
    
    // Update question to mark it has accepted answer
    await Question.findByIdAndUpdate(answer.questionId, {
      hasAcceptedAnswer: true,
      acceptedAnswerId: answer._id,
      updatedAt: new Date()
    });
    
    res.json({ 
      answerId: answer._id,
      message: 'Answer accepted as solution'
    });
  } catch (error) {
    console.error('Error accepting answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
