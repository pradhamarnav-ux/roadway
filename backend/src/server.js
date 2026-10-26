import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { connectDB } from './config/db.js';
import { seedSyntheticData } from './seed/seedSyntheticData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await seedSyntheticData({ quiet: false });

    const server = app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 RoadWise AI API Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔑 Demo Accounts seeded & ready for testing:`);
      console.log(`   - Citizen:   citizen@roadwise.ai   / Citizen@123`);
      console.log(`   - Admin:     admin@roadwise.ai     / Admin@123`);
      console.log(`   - Inspector: inspector@roadwise.ai / Inspector@123`);
      console.log(`======================================================\n`);
    });

    return server;
  } catch (error) {
    console.error('Fatal Server Boot Error:', error);
    process.exit(1);
  }
}

startServer();
