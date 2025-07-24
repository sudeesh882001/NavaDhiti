import { RequestHandler } from "express";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User as MongoUser } from '../models/User.js';
import { Question as MongoQuestion } from '../models/Question.js';
import { Answer as MongoAnswer } from '../models/Answer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';

// Simple mock user interface
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  reputation: number;
  isAdmin: boolean;
  avatar?: string;
  createdAt: Date;
}

// Mock users store - cleared for fresh testing
const mockUsers: User[] = [];

// Initialize admin user
async function initializeAdminUser() {
  // Clear existing users and reinitialize admin
  mockUsers.length = 0;
  const hashedPassword = await bcrypt.hash('admin123', 12);
  mockUsers.push({
    id: 'admin_1',
    username: 'sudeesh_admin',
    email: 'sudeeshsri882001@gmail.com',
    password: hashedPassword,
    reputation: 1000, // Fresh start reputation
    isAdmin: true,
    createdAt: new Date()
  });
  console.log('🆕 Fresh start: Admin user initialized');
}

// Initialize admin user immediately
initializeAdminUser();

// Helper function to generate JWT token
function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Helper function to get current user from auth token
export function getCurrentUserFromToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// Helper function to get current user from request
export function getCurrentUserFromRequest(req: any) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return getCurrentUserFromToken(token);
  }

  return null;
}

// Register new user
export const register: RequestHandler = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email, and password are required"
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: "Username must be at least 3 characters long"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long"
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please enter a valid email address"
      });
    }

    if (USE_MOCK_DATA) {
      // Mock data mode
      const existingUser = mockUsers.find(
        user => user.email === email || user.username === username
      );

      if (existingUser) {
        return res.status(400).json({
          error: "Username or email already exists"
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create new user
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        email,
        password: hashedPassword,
        reputation: 1,
        isAdmin: email === 'sudeeshsri882001@gmail.com',
        createdAt: new Date()
      };

      mockUsers.push(newUser);
      console.log(`👤 New user registered (MOCK): ${username} (${email})`);

      // Generate JWT token
      const token = generateToken(newUser.id);

      // Return user without password
      const userResponse = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        reputation: newUser.reputation,
        isAdmin: newUser.isAdmin,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt
      };

      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        token
      });
    } else {
      // MongoDB mode
      const existingUser = await MongoUser.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          error: "Username or email already exists"
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create new user in MongoDB
      const newUser = new MongoUser({
        username,
        email,
        password: hashedPassword,
        reputation: 1,
        isAdmin: email === 'sudeeshsri882001@gmail.com'
      });

      await newUser.save();
      console.log(`👤 New user registered (MONGODB): ${username} (${email}) - ID: ${newUser._id}`);

      // Generate JWT token
      const token = generateToken(newUser._id.toString());

      // Return user without password
      const userResponse = {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
        reputation: newUser.reputation,
        isAdmin: newUser.isAdmin,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt
      };

      res.status(201).json({
        message: "User registered successfully",
        user: userResponse,
        token
      });
    }

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Login user
export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    if (USE_MOCK_DATA) {
      // Mock data mode
      const user = mockUsers.find(u => u.email === email);

      if (!user) {
        return res.status(401).json({
          error: "User not found. Please register first."
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Invalid email or password"
        });
      }

      // Generate JWT token
      const token = generateToken(user.id);

      // Return user without password
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        reputation: user.reputation,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        createdAt: user.createdAt
      };

      res.json({
        message: "Login successful",
        user: userResponse,
        token
      });
    } else {
      // MongoDB mode
      const user = await MongoUser.findOne({ email });

      if (!user) {
        return res.status(401).json({
          error: "User not found. Please register first."
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Invalid email or password"
        });
      }

      // Generate JWT token
      const token = generateToken(user._id.toString());

      // Return user without password
      const userResponse = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        reputation: user.reputation,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        createdAt: user.createdAt
      };

      res.json({
        message: "Login successful",
        user: userResponse,
        token
      });
    }

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get current user (validate token)
export const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify JWT token
    const userId = getCurrentUserFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (USE_MOCK_DATA) {
      // Mock data mode
      const user = mockUsers.find(u => u.id === userId);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Return user without password
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        reputation: user.reputation,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        createdAt: user.createdAt
      };

      res.json({ user: userResponse });
    } else {
      // MongoDB mode
      const user = await MongoUser.findById(userId).select('-password');

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Return user without password
      const userResponse = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        reputation: user.reputation,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        createdAt: user.createdAt
      };

      res.json({ user: userResponse });
    }

  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all users with question and answer counts
export const getAllUsers: RequestHandler = async (req, res) => {
  try {
    if (USE_MOCK_DATA) {
      // Mock data mode
      const { mockQuestions, mockAnswers } = await import('./questions-simple.js');

      // Calculate user statistics
      const usersWithStats = mockUsers.map(({ password, ...user }) => {
        // Count questions asked by this user
        const questionsAsked = mockQuestions.filter(q => q.authorId === user.id).length;

        // Count answers given by this user
        const answersGiven = mockAnswers.filter(a => a.authorId === user.id).length;

        // Count accepted answers by this user
        const acceptedAnswers = mockAnswers.filter(a => a.authorId === user.id && a.isAccepted).length;

        // Get tags from user's questions
        const userQuestions = mockQuestions.filter(q => q.authorId === user.id);
        const topTags = [...new Set(userQuestions.flatMap(q => q.tags))].slice(0, 3);

        return {
          ...user,
          questionsAsked,
          answersGiven,
          acceptedAnswers,
          topTags,
          joinedDate: user.createdAt.toISOString()
        };
      });

      // Sort by reputation (default)
      const { sortBy = 'reputation' } = req.query;

      switch (sortBy) {
        case 'username':
          usersWithStats.sort((a, b) => a.username.localeCompare(b.username));
          break;
        case 'joined':
          usersWithStats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'answers':
          usersWithStats.sort((a, b) => b.answersGiven - a.answersGiven);
          break;
        default: // reputation
          usersWithStats.sort((a, b) => b.reputation - a.reputation);
      }

      res.json({
        users: usersWithStats,
        total: usersWithStats.length
      });
    } else {
      // MongoDB mode
      const users = await MongoUser.find({}).select('-password');

      // Calculate user statistics using MongoDB aggregation
      const usersWithStats = await Promise.all(users.map(async (user) => {
        const userId = user._id;

        // Count questions asked by this user
        const questionsAsked = await MongoQuestion.countDocuments({ authorId: userId });

        // Count answers given by this user
        const answersGiven = await MongoAnswer.countDocuments({ authorId: userId });

        // Count accepted answers by this user
        const acceptedAnswers = await MongoAnswer.countDocuments({ authorId: userId, isAccepted: true });

        // Get tags from user's questions
        const userQuestions = await MongoQuestion.find({ authorId: userId }).select('tags');
        const topTags = [...new Set(userQuestions.flatMap(q => q.tags))].slice(0, 3);

        return {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          reputation: user.reputation,
          isAdmin: user.isAdmin,
          avatar: user.avatar,
          createdAt: user.createdAt,
          questionsAsked,
          answersGiven,
          acceptedAnswers,
          topTags,
          joinedDate: user.createdAt.toISOString()
        };
      }));

      // Sort by reputation (default)
      const { sortBy = 'reputation' } = req.query;

      switch (sortBy) {
        case 'username':
          usersWithStats.sort((a, b) => a.username.localeCompare(b.username));
          break;
        case 'joined':
          usersWithStats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'answers':
          usersWithStats.sort((a, b) => b.answersGiven - a.answersGiven);
          break;
        default: // reputation
          usersWithStats.sort((a, b) => b.reputation - a.reputation);
      }

      res.json({
        users: usersWithStats,
        total: usersWithStats.length
      });
    }
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Logout (for completeness, though JWT tokens are stateless)
export const logout: RequestHandler = (req, res) => {
  res.json({ message: "Logged out successfully" });
};

// Export mock users for use in other modules
export { mockUsers };
