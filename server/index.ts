// Enhanced server entry point
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Choose which server to use based on environment
const USE_ENHANCED_MODE = process.env.USE_MOCK_DATA === 'false';

if (USE_ENHANCED_MODE) {
  console.log('🚀 Starting Enhanced Server (MongoDB + OAuth)...');
  const { createServer } = await import('./index-enhanced.js');
  const app = createServer();
  
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🌐 Enhanced server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.USE_MOCK_DATA === 'true' ? 'Mock Data' : 'MongoDB'}`);
    console.log(`🔐 OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Google OAuth Enabled' : 'Standard Auth Only'}`);
    console.log(`👑 Admin: sudeeshsri882001@gmail.com / admin123`);
  });
} else {
  console.log('🚀 Starting Simple Server (Mock Data)...');
  const { createServer } = await import('./index-simple.js');
  const app = createServer();
  
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🌐 Simple server running on http://localhost:${PORT}`);
    console.log(`📊 Database: Mock Data`);
    console.log(`👑 Admin: sudeeshsri882001@gmail.com / admin123`);
  });
}
