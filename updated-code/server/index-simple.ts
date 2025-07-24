import express from "express";
import cors from "cors";
import { connectDatabase } from "./database.js";
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
  logout
} from "./routes/auth-simple";
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "./routes/notifications-simple";

export function createServer() {
  console.log('🚀 Creating Express server (simple mode)...');

  const app = express();

  console.log('🔧 Setting up middleware...');

  // Connect to database
  connectDatabase().catch(error => {
    console.error('Database connection failed:', error);
  });

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // Authentication API routes
  app.post("/api/auth/register", register);
  app.post("/api/auth/login", login);
  app.get("/api/auth/me", getCurrentUser);
  app.get("/api/users", getAllUsers);
  app.post("/api/auth/logout", logout);


  // Questions API routes
  app.get("/api/questions", getQuestions);
  app.get("/api/questions/pending", getPendingQuestions);
  app.get("/api/questions/:id", getQuestionById);
  app.post("/api/questions", createQuestion);
  app.post("/api/questions/:id/vote", voteQuestion);
  app.post("/api/questions/:id/approve", approveQuestion);

  // Answer routes (now implemented)
  app.post("/api/questions/:questionId/answers", submitAnswer);
  app.post("/api/answers/:id/vote", voteAnswer);

  // Comment routes (now implemented)
  app.get("/api/answers/:answerId/comments", getAnswerComments);
  app.post("/api/comments", createComment);
  app.post("/api/comments/:id/vote", voteComment);
  app.delete("/api/comments/:id", deleteComment);
  
  app.post("/api/answers/:id/accept", (req, res) => {
    res.status(501).json({ error: "Feature not available in simple mode" });
  });
  
  app.get("/api/answers/:answerId/comments", (req, res) => {
    res.json({ comments: [], total: 0, page: 1, limit: 20 });
  });
  
  app.post("/api/comments", (req, res) => {
    res.status(501).json({ error: "Feature not available in simple mode" });
  });
  
  app.post("/api/comments/:id/vote", (req, res) => {
    res.status(501).json({ error: "Feature not available in simple mode" });
  });
  
  app.delete("/api/comments/:id", (req, res) => {
    res.status(501).json({ error: "Feature not available in simple mode" });
  });
  
  // Notifications API routes
  app.get("/api/notifications", getUserNotifications);
  app.post("/api/notifications/:id/read", markNotificationRead);
  app.post("/api/notifications/read-all", markAllNotificationsRead);

  console.log('✅ Express server created successfully (simple mode)');
  return app;
}
