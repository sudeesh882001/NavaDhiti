import { RequestHandler } from "express";
import { getCurrentUserFromRequest, mockUsers } from './auth-simple';
import { Notification as MongoNotification } from '../models/Notification.js';

const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';

// Simple mock notification interface
interface Notification {
  id: string;
  userId: string;
  type: 'question_approved' | 'question_answered' | 'answer_voted' | 'question_voted' | 'mention';
  title: string;
  message: string;
  sourceUserId?: string;
  questionId?: string;
  answerId?: string;
  isRead: boolean;
  createdAt: Date;
  data?: any;
}

// Mock notifications store - cleared for fresh testing
const mockNotifications: Notification[] = [];
console.log('🔔 Fresh start: Notifications cleared');

// Get user notifications
export const getUserNotifications: RequestHandler = async (req, res) => {
  try {
    const userId = getCurrentUserFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    if (USE_MOCK_DATA) {
      // Mock data mode
      let userNotifications = mockNotifications.filter(n => n.userId === userId);

      if (unreadOnly === 'true') {
        userNotifications = userNotifications.filter(n => !n.isRead);
      }

      // Sort by creation date (newest first)
      userNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedNotifications = userNotifications.slice(startIndex, endIndex);

      // Transform notifications with source user details
      const transformedNotifications = paginatedNotifications.map(notification => {
        const sourceUser = notification.sourceUserId ?
          mockUsers.find(u => u.id === notification.sourceUserId) : null;

        return {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          sourceUser: sourceUser ? {
            id: sourceUser.id,
            username: sourceUser.username,
            avatar: sourceUser.avatar
          } : null,
          questionId: notification.questionId,
          answerId: notification.answerId,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          data: notification.data
        };
      });

      const unreadCount = mockNotifications.filter(n => n.userId === userId && !n.isRead).length;

      res.json({
        notifications: transformedNotifications,
        total: userNotifications.length,
        unreadCount,
        page: pageNum,
        limit: limitNum
      });
    } else {
      // MongoDB mode
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build query filter
      const filter: any = { userId };
      if (unreadOnly === 'true') {
        filter.isRead = false;
      }

      // Get notifications from MongoDB
      const notifications = await MongoNotification.find(filter)
        .populate('sourceUserId', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await MongoNotification.countDocuments(filter);
      const unreadCount = await MongoNotification.countDocuments({ userId, isRead: false });

      // Transform notifications
      const transformedNotifications = notifications.map(notification => ({
        id: notification._id.toString(),
        type: notification.type,
        message: notification.message,
        sourceUser: notification.sourceUserId ? {
          id: notification.sourceUserId._id.toString(),
          username: notification.sourceUserId.username,
          avatar: notification.sourceUserId.avatar
        } : null,
        questionId: notification.questionId?.toString(),
        answerId: notification.answerId?.toString(),
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        data: notification.data
      }));

      res.json({
        notifications: transformedNotifications,
        total,
        unreadCount,
        page: pageNum,
        limit: limitNum
      });
    }
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

    const notification = mockNotifications.find(n => n.id === id && n.userId === userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.isRead = true;

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

    // Mark all user notifications as read
    mockNotifications
      .filter(n => n.userId === userId && !n.isRead)
      .forEach(n => n.isRead = true);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to create notifications - supports both old and new interfaces
export const createNotification = async (
  userId: string,
  typeOrOptions: Notification['type'] | {
    type: string;
    sourceUserId?: string;
    questionId?: string;
    answerId?: string;
    message: string;
    data?: any;
  },
  title?: string,
  message?: string,
  data?: {
    sourceUserId?: string;
    questionId?: string;
    answerId?: string;
    data?: any;
  }
) => {
  try {
    // Handle both old and new interfaces
    let notificationData;
    if (typeof typeOrOptions === 'string') {
      // Old interface: createNotification(userId, type, title, message, data)
      notificationData = {
        type: typeOrOptions,
        title: title || '',
        message: message || '',
        sourceUserId: data?.sourceUserId,
        questionId: data?.questionId,
        answerId: data?.answerId,
        data: data?.data
      };
    } else {
      // New interface: createNotification(userId, { type, message, ... })
      notificationData = {
        type: typeOrOptions.type,
        title: typeOrOptions.message.substring(0, 50), // Use first part of message as title
        message: typeOrOptions.message,
        sourceUserId: typeOrOptions.sourceUserId,
        questionId: typeOrOptions.questionId,
        answerId: typeOrOptions.answerId,
        data: typeOrOptions.data
      };
    }

    if (USE_MOCK_DATA) {
      // Mock data mode
      const notification: Notification = {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: notificationData.type as Notification['type'],
        title: notificationData.title,
        message: notificationData.message,
        sourceUserId: notificationData.sourceUserId,
        questionId: notificationData.questionId,
        answerId: notificationData.answerId,
        isRead: false,
        createdAt: new Date(),
        data: notificationData.data
      };

      mockNotifications.push(notification);
      console.log(`✅ Created notification (MOCK) for user ${userId}: ${notificationData.title}`);
      return notification;
    } else {
      // MongoDB mode
      const notification = new MongoNotification({
        userId,
        type: notificationData.type,
        message: notificationData.message,
        sourceUserId: notificationData.sourceUserId,
        questionId: notificationData.questionId,
        answerId: notificationData.answerId,
        isRead: false,
        data: notificationData.data
      });

      await notification.save();
      console.log(`✅ Created notification (MONGODB) for user ${userId}: ${notificationData.message} - ID: ${notification._id}`);
      return notification;
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Export notifications for use in other modules
export { mockNotifications };
