import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';

export const DEMO_ACCOUNTS = [
  {
    name: 'Aarav Sharma (Citizen Demo)',
    email: 'citizen@roadwise.ai',
    password: 'Citizen@123',
    role: 'citizen',
    alias: 'MetroRider_26',
    pointsBalance: 125,
    badges: [
      { id: 'scout_1', name: 'Civic Scout', description: 'Submitted 3 validated road hazard reports' },
    ],
  },
  {
    name: 'Chief Engineer Priya Patel (Admin Demo)',
    email: 'admin@roadwise.ai',
    password: 'Admin@123',
    role: 'admin',
    alias: 'UrbanOps_Lead',
    pointsBalance: 0,
    badges: [],
  },
  {
    name: 'Inspector Vikram Singh (Field Inspector Demo)',
    email: 'inspector@roadwise.ai',
    password: 'Inspector@123',
    role: 'inspector',
    alias: 'FieldLead_Zone4',
    pointsBalance: 0,
    badges: [],
  },
];

export const seedDemoAccounts = async () => {
  console.log('🌱 Seeding synthetic demo accounts...');
  for (const account of DEMO_ACCOUNTS) {
    const existing = await User.findOne({ email: account.email });
    if (!existing) {
      await User.create(account);
      console.log(`  ➕ Created [${account.role.toUpperCase()}] ${account.email} (${account.name})`);
    } else {
      console.log(`  ℹ️ Account already exists: [${account.role.toUpperCase()}] ${account.email}`);
    }
  }
  console.log('✅ Demo accounts seeded successfully.');
};

// If run directly via node command:
if (process.argv[1]?.endsWith('seedDemoAccounts.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDemoAccounts();
      await closeDB();
      process.exit(0);
    } catch (err) {
      console.error('Failed to seed demo accounts:', err);
      process.exit(1);
    }
  })();
}
