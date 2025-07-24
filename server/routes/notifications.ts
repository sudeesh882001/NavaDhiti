import { RequestHandler } from 'express';
import { Notification, NotificationType } from '../models/Notification';
import { User } from '../models/User';
import mongoose from 'mongoose';

// Re-export NotificationType for use in other modules
export { NotificationType };

import { getCurrentUserFromRequest } from './auth';

// Get user notifications
export const getUserNotifications: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate('sourceUserId', 'username avatar')
      .populate('questionId', 'title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      isRead: false
    });

    res.json({
      notifications,
      total,
      unreadCount,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark notification as read
export const markNotificationRead: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: new mongoose.Types.ObjectId(userId)
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark all notifications as read
export const markAllNotificationsRead: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to create notifications
export const createNotification = async (
  userId: mongoose.Types.ObjectId | string,
  type: NotificationType,
  message: string,
  data?: {
    sourceUserId?: mongoose.Types.ObjectId | string;
    questionId?: mongoose.Types.ObjectId | string;
    answerId?: mongoose.Types.ObjectId | string;
    commentId?: mongoose.Types.ObjectId | string;
    data?: any;
  }
) => {
  try {
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(userId.toString()),
      type,
      message,
      sourceUserId: data?.sourceUserId ? new mongoose.Types.ObjectId(data.sourceUserId.toString()) : undefined,
      questionId: data?.questionId ? new mongoose.Types.ObjectId(data.questionId.toString()) : undefined,
      answerId: data?.answerId ? new mongoose.Types.ObjectId(data.answerId.toString()) : undefined,
      commentId: data?.commentId ? new mongoose.Types.ObjectId(data.commentId.toString()) : undefined,
      data: data?.data
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Helper function to notify all admins
export const notifyAdmins = async (
  type: NotificationType,
  message: string,
  data?: any
) => {
  try {
    const admins = await User.find({ isAdmin: true });
    
    for (const admin of admins) {
      await createNotification(admin._id, type, message, data);
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};
