// Fallback mock data system when MongoDB is not available

export interface MockUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  reputation: number;
  isAdmin: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockQuestion {
  _id: string;
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

export interface MockAnswer {
  _id: string;
  questionId: string;
  body: string;
  authorId: string;
  votes: number;
  voters: { userId: string; value: number }[];
  isAccepted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockNotification {
  _id: string;
  userId: string;
  type: string;
  message: string;
  isRead: boolean;
  sourceUserId?: string;
  questionId?: string;
  answerId?: string;
  commentId?: string;
  data?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockComment {
  _id: string;
  answerId: string;
  authorId: string;
  body: string;
  parentCommentId?: string;
  votes: number;
  voters: { userId: string; value: number }[];
  createdAt: Date;
  updatedAt: Date;
}

// Mock data stores
export const mockUsers: MockUser[] = [
  {
    _id: 'admin_user_1',
    username: 'sudeesh_admin',
    email: 'sudeeshsri882001@gmail.com',
    password: '$2b$12$hashed_password_for_admin123', // admin123 hashed
    reputation: 50000,
    isAdmin: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export const mockQuestions: MockQuestion[] = [];
export const mockAnswers: MockAnswer[] = [];
export const mockNotifications: MockNotification[] = [];
export const mockComments: MockComment[] = [];

// Helper functions for ID generation
let idCounter = 1;
export function generateId(): string {
  return `mock_${Date.now()}_${idCounter++}`;
}

// Helper function to check if MongoDB is connected
export function isMongoDBConnected(): boolean {
  // Check if mongoose is connected
  try {
    const mongoose = require('mongoose');
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}

// Helper function to find user by email
export function findUserByEmail(email: string): MockUser | undefined {
  return mockUsers.find(user => user.email === email);
}

// Helper function to find user by ID
export function findUserById(id: string): MockUser | undefined {
  return mockUsers.find(user => user._id === id);
}

// Helper function to create user
export function createUser(userData: Omit<MockUser, '_id' | 'createdAt' | 'updatedAt'>): MockUser {
  const newUser: MockUser = {
    ...userData,
    _id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  mockUsers.push(newUser);
  return newUser;
}
