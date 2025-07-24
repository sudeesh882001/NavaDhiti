import { RequestHandler } from "express";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User as MongoUser } from '../models/User.js'; // Renamed to MongoUser to avoid conflict
import { Question as MongoQuestion } from '../models/Question.js';
import { Answer as MongoAnswer } from '../models/Answer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';

// Log the JWT_SECRET being used (for debugging purposes)
console.log(`🔑 JWT_SECRET being used: ${JWT_SECRET ? 'Defined' : 'UNDEFINED or FALLBACK'}`);
if (JWT_SECRET === 'fallback-secret-key') {
    console.warn('⚠️ Using fallback JWT_SECRET. Ensure process.env.JWT_SECRET is set in your .env file.');
}


// Simple mock user interface (keep this if you use mock data)
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  reputation: number;
  isAdmin: boolean;
  avatar?: string;
  createdAt: Date;
  skills?: string[]; // Add skills to mock user interface
  bio?: string;      // Add bio to mock user interface
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
    createdAt: new Date(),
    skills: ['admin', 'management'], // Ensure mock admin has skills/bio
    bio: 'System Administrator'
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
    console.error("Error verifying token:", error); // Added/kept this log
    return null;
  }
}

// Helper function to get current user from request
export function getCurrentUserFromRequest(req: any) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    console.log("Extracted token from request:", token); // Added/kept this log
    return getCurrentUserFromToken(token);
  }
  console.log("No authorization header or not a Bearer token."); // Added/kept this log
  return null;
}

// Register new user
export const register: RequestHandler = async (req, res) => {
    console.log('*** START OF AUTH-SIMPLE REGISTER FUNCTION - RAW REQ.BODY ***', req.body);
    // Keep this single destructuring at the top
    const { username, email, password, skills, bio } = req.body; 

    console.log('🔍 AUTH-SIMPLE REGISTRATION DEBUG - Destructured:', {
        username,
        email,
        skills,
        bio,
        skillsType: typeof skills,
        bioType: typeof bio,
        skillsArray: Array.isArray(skills),
        fullBody: req.body
    });
  try {
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

    // Ensure skills is an array (allow empty for now)
    const userSkills = Array.isArray(skills) ? skills : [];
    const userBio = typeof bio === 'string' ? bio : ''; // Ensure bio is a string

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
        createdAt: new Date(),
        skills: userSkills.map((skill: string) => skill.toLowerCase().trim()), // Pass skills
        bio: userBio // Pass bio
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
        createdAt: newUser.createdAt,
        skills: newUser.skills, // Include skills in response
        bio: newUser.bio // Include bio in response
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
        isAdmin: email === 'sudeeshsri882001@gmail.com',
        skills: userSkills.map((skill: string) => skill.toLowerCase().trim()), // <--- ADDED THIS!
        bio: userBio // <--- ADDED THIS!
      });

      await newUser.save();
      console.log(`👤 New user registered (MONGODB): ${username} (${email}) - ID: ${newUser._id}`);
      // Also log the saved user's skills and bio for verification
      console.log('Saved user skills:', newUser.skills);
      console.log('Saved user bio:', newUser.bio);

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
        createdAt: newUser.createdAt,
        skills: newUser.skills, // Include skills in response
        bio: newUser.bio // Include bio in response
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
        createdAt: user.createdAt,
        skills: user.skills, // Include skills in response
        bio: user.bio // Include bio in response
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
        createdAt: user.createdAt,
        skills: user.skills, // Include skills in response
        bio: user.bio // Include bio in response
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
        createdAt: user.createdAt,
        skills: user.skills, // Include skills in response
        bio: user.bio // Include bio in response
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
        createdAt: user.createdAt,
        skills: user.skills, // Include skills in response
        bio: user.bio // Include bio in response
      };

      res.json({ user: userResponse });
    }

  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user profile
export const updateProfile: RequestHandler = async (req, res) => {
  console.log('Profile update request received');
  // console.log('Request user:', (req as any).user); // This line is not needed and can be removed
  console.log('Request body:', req.body);
  
  try {
    const userId = getCurrentUserFromRequest(req);
    if (!userId) {
      console.log('Unauthorized: No user ID found from token.'); // Added/kept this log
      return res.status(401).json({ error: 'Unauthorized: No user ID found from token.' });
    }

    const { username, skills, bio } = req.body;

    // Validation
    if (!username || username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters long" });
    }

    // Ensure skills is an array (can be empty)
    const userSkills = Array.isArray(skills) ? skills : [];
    const userBio = typeof bio === 'string' ? bio : '';

    if (USE_MOCK_DATA) {
      // Mock mode
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return res.status(404).json({ error: "User not found in mock data" });
      }

      // Check if username is taken by another user
      const existingUser = mockUsers.find(u => u.username === username && u.id !== userId);
      if (existingUser) {
        return res.status(400).json({ error: "Username is already taken" });
      }

      mockUsers[userIndex] = {
        ...mockUsers[userIndex],
        username,
        skills: userSkills.map((skill: string) => skill.toLowerCase().trim()),
        bio: userBio
      };

      const updatedUserResponse = {
        id: mockUsers[userIndex].id,
        username: mockUsers[userIndex].username,
        email: mockUsers[userIndex].email,
        skills: mockUsers[userIndex].skills,
        bio: mockUsers[userIndex].bio,
        reputation: mockUsers[userIndex].reputation,
        isAdmin: mockUsers[userIndex].isAdmin
      };

      res.json({
        message: "Profile updated successfully",
        user: updatedUserResponse
      });
    } else {
      // MongoDB mode
      // Check if username is taken by another user
      const existingUser = await MongoUser.findOne({ 
        username, 
        _id: { $ne: userId } // Exclude current user
      });
      
      if (existingUser) {
        return res.status(400).json({ error: "Username is already taken" });
      }

      console.log('Updating user profile in MongoDB:', {
        userId,
        username,
        skills: userSkills.map((skill: string) => skill.toLowerCase().trim()),
        bio: userBio
      });

      const updatedUser = await MongoUser.findByIdAndUpdate(
        userId,
        {
          username,
          skills: userSkills.map((skill: string) => skill.toLowerCase().trim()),
          bio: userBio
        },
        { new: true } // Return the updated document
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found in database" });
      }

      console.log('User updated successfully in MongoDB:', {
        id: updatedUser._id,
        username: updatedUser.username,
        skills: updatedUser.skills,
        bio: updatedUser.bio
      });

      const updatedUserResponse = {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
        email: updatedUser.email,
        reputation: updatedUser.reputation,
        isAdmin: updatedUser.isAdmin,
        avatar: updatedUser.avatar,
        createdAt: updatedUser.createdAt,
        skills: updatedUser.skills, // Include skills in response
        bio: updatedUser.bio // Include bio in response
      };

      res.json({
        message: "Profile updated successfully",
        user: updatedUserResponse
      });
    }
  } catch (error) {
    console.error("Profile update error:", error);
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
          ...user,
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
