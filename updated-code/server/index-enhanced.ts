import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import { handleDemo } from "./routes/demo";
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  voteQuestion,
  approveQuestion,
  getPendingQuestions,
  submitAnswer,
  voteAnswer,
  getAnswerComments,
  createComment,
  voteComment,
  deleteComment
} from "./routes/questions-simple";
import {
  register,
  login,
  getCurrentUser,
  getAllUsers,
  logout,
  updateProfile // Make sure updateProfile is imported here
} from "./routes/auth-simple";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "./routes/notifications-simple";

// Load environment variables
dotenv.config();

// MongoDB connection
async function connectToMongoDB() {
  try {
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('🔄 Running in mock data mode - skipping MongoDB connection');
      return;
    }

    if (!process.env.MONGODB_URI) {
      console.log('⚠️ No MongoDB URI found - falling back to mock data mode');
      process.env.USE_MOCK_DATA = 'true';
      return;
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    console.log('📊 Database mode: REAL MongoDB');
    
    // Initialize admin user in MongoDB if it doesn't exist
    await initializeAdminUser();
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.log('🔄 Falling back to mock data mode...');
    process.env.USE_MOCK_DATA = 'true';
  }
}

// Initialize admin user in MongoDB
async function initializeAdminUser() {
  try {
    const { User } = await import('./models/User.js');
    const bcrypt = await import('bcryptjs');
    
    const existingAdmin = await User.findOne({ email: 'sudeeshsri882001@gmail.com' });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.default.hash('admin123', 12);
      const adminUser = new User({
        username: 'sudeesh_admin',
        email: 'sudeeshsri882001@gmail.com',
        password: hashedPassword,
        reputation: 1000,
        isAdmin: true
      });
      
      await adminUser.save();
      console.log('👑 Admin user created in MongoDB');
      console.log('📧 Email: sudeeshsri882001@gmail.com');
      console.log('🔒 Password: admin123');
    } else {
      console.log('👑 Admin user already exists in MongoDB');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}

// Google OAuth client
let googleClient: OAuth2Client | null = null;
if (process.env.GOOGLE_CLIENT_ID) {
  googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  console.log('🔐 Google OAuth configured');
} else {
  console.log('⚠️ Google OAuth not configured - regular auth only');
}

export function createServer() {
  console.log('🚀 Creating Express server (enhanced mode)...');
  
  const app = express();

  console.log('🔧 Setting up middleware...');

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Connect to MongoDB
  connectToMongoDB();

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ 
      message: "DevHub API v2.0 Enhanced!", 
      database: process.env.USE_MOCK_DATA === 'true' ? 'Mock Data' : 'MongoDB',
      oauth: googleClient ? 'Google OAuth Enabled' : 'Standard Auth Only'
    });
  });

  app.get("/api/demo", handleDemo);

  // Authentication API routes
  app.post("/api/auth/register", register);
  app.post("/api/auth/login", login);
  app.get("/api/auth/me", getCurrentUser);
  app.get("/api/auth/users", getAllUsers);
  app.post("/api/auth/logout", logout);
  app.put("/api/auth/profile", updateProfile); // This line is crucial for the PUT request

  // Google OAuth routes
  if (googleClient) {
    app.post("/api/auth/google", async (req, res) => {
      try {
        const { idToken } = req.body;
        
        if (!idToken) {
          return res.status(400).json({ error: 'ID token required' });
        }

        // Verify the Google ID token
        const ticket = await googleClient!.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          return res.status(400).json({ error: 'Invalid token' });
        }

        const { sub: googleId, email, name, picture } = payload;

        // Handle user creation/login logic here
        // This would integrate with your auth system
        res.json({
          message: "Google OAuth success",
          user: { googleId, email, name, picture }
        });
      } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(400).json({ error: 'Google authentication failed' });
      }
    });
  }

  // Questions API routes
  app.get("/api/questions", getQuestions);
  app.get("/api/questions/pending", getPendingQuestions);
  app.get("/api/questions/:id", getQuestionById);
  app.post("/api/questions", createQuestion);
  app.post("/api/questions/:id/vote", voteQuestion);
  app.post("/api/questions/:id/approve", approveQuestion);

  // Answer routes
  app.post("/api/questions/:questionId/answers", submitAnswer);
  app.post("/api/answers/:id/vote", voteAnswer);
  
  // Comment routes
  app.get("/api/answers/:answerId/comments", getAnswerComments);
  app.post("/api/comments", createComment);
  app.post("/api/comments/:id/vote", voteComment);
  app.delete("/api/comments/:id", deleteComment);

  // Notification routes
  app.get("/api/notifications", getUserNotifications);
  app.post("/api/notifications/:id/read", markNotificationRead);
  app.post("/api/notifications/read-all", markAllNotificationsRead);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: process.env.USE_MOCK_DATA === 'true' ? 'Mock Data' : 'MongoDB',
      oauth: googleClient ? 'Google OAuth Enabled' : 'Standard Auth Only'
    });
  });

  console.log('✅ Express server created successfully (enhanced mode)');
  return app;
}
