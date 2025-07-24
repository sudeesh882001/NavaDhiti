import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devhub-qa';

export const connectDatabase = async () => {
  if (process.env.USE_MOCK_DATA === 'true') {
    console.log('🔄 Running in mock data mode - skipping MongoDB connection');
    return;
  }

  console.log('🔌 Attempting to connect to MongoDB...');
  console.log('📊 Database: Nava');

  // Add timeout to prevent hanging
  const connectWithTimeout = () => {
    return Promise.race([
      mongoose.connect(MONGODB_URI),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
      )
    ]);
  };

  try {
    await connectWithTimeout();
    console.log('✅ Connected to MongoDB successfully!');
    console.log('🏠 Cluster: devhub-cluster.oyxxcoa.mongodb.net');
    console.log('📚 Database: Nava');

    // Create admin user if not exists
    await createAdminUser();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.error('Connection details:');
    console.error('- Cluster: devhub-cluster.oyxxcoa.mongodb.net');
    console.error('- Database: Nava');
    console.error('- Username: houseofmangoes01');
    
    console.warn('⚠️ Falling back to mock data mode...');
    process.env.USE_MOCK_DATA = 'true';
  }
};

const createAdminUser = async () => {
  try {
    const adminEmail = 'sudeeshsri882001@gmail.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      // Hash the password properly
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const adminUser = new User({
        username: 'sudeesh_admin',
        email: adminEmail,
        password: hashedPassword,
        reputation: 1000,
        isAdmin: true
      });
      
      await adminUser.save();
      console.log('👑 Admin user created in MongoDB');
      console.log('📧 Email: sudeeshsri882001@gmail.com');
      console.log('🔒 Password: admin123');
    } else {
      // Ensure existing user is admin
      if (!existingAdmin.isAdmin) {
        existingAdmin.isAdmin = true;
        await existingAdmin.save();
        console.log('✅ Admin privileges granted to:', adminEmail);
      } else {
        console.log('👑 Admin user already exists in MongoDB');
      }
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
};

export const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
  }
};
