import { RequestHandler } from "express";
import { User } from "../models/User";
import { getCurrentUserFromToken } from "./auth";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables


const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ;
console.log("id passed bro"+GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ;

// Check if real Google OAuth is configured
const isGoogleConfigured = GOOGLE_CLIENT_ID !== "demo-client-id" && GOOGLE_CLIENT_SECRET !== "demo-client-secret";

// Helper function to generate JWT token
function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Google OAuth login URL
export const getGoogleAuthUrl: RequestHandler = (req, res) => {
  if (!isGoogleConfigured) {
    return res.status(400).json({
      error: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
    });
  }

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: GOOGLE_REDIRECT_URI,
    client_id: GOOGLE_CLIENT_ID,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  };

  const qs = new URLSearchParams(options);
  const authUrl = `${rootUrl}?${qs.toString()}`;
  
  res.json({ authUrl });
};

// Google OAuth callback handler
export const handleGoogleCallback: RequestHandler = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code not provided" });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code as string,
        grant_type: "authorization_code",
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokens);
      return res.status(400).json({ error: "Failed to exchange authorization code" });
    }

    // Get user info from Google
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`
    );

    const googleUser = await userResponse.json();

    if (!userResponse.ok) {
      console.error("Failed to get user info:", googleUser);
      return res.status(400).json({ error: "Failed to get user information" });
    }

    // Check if user exists or create new user
    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      // Create new user from Google data
      user = new User({
        username: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        password: "", // No password for OAuth users
        reputation: 1,
        googleId: googleUser.id,
        avatar: googleUser.picture,
        isAdmin: googleUser.email === 'sudeeshsri882001@gmail.com'
      });
      await user.save();
    } else {
      // Update existing user with Google data if needed
      if (!user.googleId) {
        user.googleId = googleUser.id;
        user.avatar = googleUser.picture;
        await user.save();
      }
    }

    // Create JWT token
    const jwtToken = generateToken(user._id.toString());

    // Return user data
    const userResponseData = {
      id: user._id,
      username: user.username,
      email: user.email,
      reputation: user.reputation,
      isAdmin: user.isAdmin,
      avatar: user.avatar,
      createdAt: user.createdAt
    };

    // For development, redirect to frontend with token
  const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${jwtToken}&user=${encodeURIComponent(JSON.stringify(userResponseData))}`;
res.redirect(redirectUrl);


  } catch (error) {
    console.error("Google OAuth error:", error);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
};

// Verify Google token (optional - for direct Google token verification)
export const verifyGoogleToken: RequestHandler = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Google token required" });
    }

    // Verify token with Google
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
    const tokenInfo = await response.json();

    if (!response.ok) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    // Get user info
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`
    );
    const googleUser = await userResponse.json();

    if (!userResponse.ok) {
      return res.status(400).json({ error: "Failed to get user information" });
    }

    // Find or create user
    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      user = new User({
        username: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        password: "",
        reputation: 1,
        googleId: googleUser.id,
        avatar: googleUser.picture,
        isAdmin: googleUser.email === 'sudeeshsri882001@gmail.com'
      });
      await user.save();
    }

    // Create JWT token
    const jwtToken = generateToken(user._id.toString());
    
    const userResponseData = {
      id: user._id,
      username: user.username,
      email: user.email,
      reputation: user.reputation,
      isAdmin: user.isAdmin,
      avatar: user.avatar,
      createdAt: user.createdAt
    };

    res.json({
      message: "Google authentication successful",
      user: userResponseData,
      token: jwtToken
    });

  } catch (error) {
    console.error("Google token verification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
