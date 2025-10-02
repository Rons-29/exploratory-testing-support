#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/exploratory_testing'
});

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Insert sample users
    await client.query(`
      INSERT INTO users (id, email, name, provider, provider_id, created_at, updated_at)
      VALUES 
        ('user_1', 'test@example.com', 'Test User', 'google', 'google_123', NOW(), NOW()),
        ('user_2', 'admin@example.com', 'Admin User', 'github', 'github_456', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Sample users created');
    
    // Insert sample sessions
    await client.query(`
      INSERT INTO sessions (id, user_id, name, description, status, start_time, end_time, metadata, created_at, updated_at)
      VALUES 
        ('session_1', 'user_1', 'Sample Test Session', 'A sample exploratory testing session', 'completed', NOW() - INTERVAL '1 hour', NOW(), '{"url": "https://example.com", "userAgent": "Chrome/120.0"}', NOW(), NOW()),
        ('session_2', 'user_2', 'Admin Test Session', 'An admin testing session', 'active', NOW() - INTERVAL '30 minutes', NULL, '{"url": "https://admin.example.com", "userAgent": "Chrome/120.0"}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Sample sessions created');
    
    // Insert sample events
    await client.query(`
      INSERT INTO events (id, session_id, type, data, timestamp, created_at)
      VALUES 
        ('event_1', 'session_1', 'click', '{"x": 100, "y": 200, "target": "button"}', NOW() - INTERVAL '50 minutes', NOW()),
        ('event_2', 'session_1', 'keydown', '{"key": "Enter", "target": "input"}', NOW() - INTERVAL '45 minutes', NOW()),
        ('event_3', 'session_2', 'click', '{"x": 300, "y": 400, "target": "link"}', NOW() - INTERVAL '20 minutes', NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Sample events created');
    
    console.log('🎉 Seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
