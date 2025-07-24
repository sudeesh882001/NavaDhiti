import { RequestHandler } from "express";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { isMongoDBConnected, findUserByEmail, createUser, findUserById, mockUsers } from '../fallback/mockData';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

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

    // Check if user already exists
    let existingUser;
    if (isMongoDBConnected()) {
      existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });
    } else {
      existingUser = findUserByEmail(email) || mockUsers.find(u => u.username === username);
    }

    if (existingUser) {
      return res.status(400).json({
        error: "Username or email already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    let newUser;
    if (isMongoDBConnected()) {
      newUser = new User({
        username,
        email,
        password: hashedPassword,
        reputation: 1,
        isAdmin: email === 'sudeeshsri882001@gmail.com'
      });
      await newUser.save();
    } else {
      newUser = createUser({
        username,
        email,
        password: hashedPassword,
        reputation: 1,
        isAdmin: email === 'sudeeshsri882001@gmail.com'
      });
    }

    // Generate JWT token
    const token = generateToken(newUser._id.toString());

    // Return user without password
    const userResponse = {
      id: newUser._id,
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

    // Find user
    let user;
    if (isMongoDBConnected()) {
      user = await User.findOne({ email });
    } else {
      user = findUserByEmail(email);
    }

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
      id: user._id,
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

    let user;
    if (isMongoDBConnected()) {
      user = await User.findById(userId);
    } else {
      user = findUserById(userId);
    }

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Return user without password
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      reputation: user.reputation,
      isAdmin: user.isAdmin,
      avatar: user.avatar,
      createdAt: user.createdAt
    };

    res.json({ user: userResponse });

  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
// Callback route after Google authentication
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login',
  }),
  (req, res) => {
    // Create JWT token or any response you want
    const user = req.user;

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    // Redirect to frontend with token and user data
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`;

    res.redirect(redirectUrl);
  }
);
// Get all users
export const getAllUsers: RequestHandler = async (req, res) => {
  try {
    let users;
    if (isMongoDBConnected()) {
      users = await User.find({}, '-password').sort({ reputation: -1 });
    } else {
      users = mockUsers.map(({ password, ...user }) => user).sort((a, b) => b.reputation - a.reputation);
    }

    res.json({ users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to get current user from request
export function getCurrentUserFromRequest(req: any) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return getCurrentUserFromToken(token);
  }

  return null;
}

// Logout (for completeness, though JWT tokens are stateless)
export const logout: RequestHandler = (req, res) => {
  // In a real JWT implementation, you might add token to a blacklist
  res.json({ message: "Logged out successfully" });
};
