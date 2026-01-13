import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'top_active_whatsapp',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

export async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Create tables if they don't exist
    await createTables(client);
    
    client.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

async function createTables(client) {
  const queries = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      company_name VARCHAR(255),
      phone VARCHAR(20),
      profile_image VARCHAR(255),
      plan VARCHAR(50) DEFAULT 'free',
      status VARCHAR(50) DEFAULT 'active',
      whatsapp_api_token VARCHAR(500),
      openai_api_key VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Contacts table
    `CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone VARCHAR(20) NOT NULL,
      name VARCHAR(255),
      email VARCHAR(255),
      last_name VARCHAR(255),
      address VARCHAR(500),
      city VARCHAR(100),
      state VARCHAR(100),
      zip_code VARCHAR(20),
      variables JSONB,
      status VARCHAR(50) DEFAULT 'active',
      has_whatsapp BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, phone)
    )`,

    // Groups table
    `CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      group_id VARCHAR(255) UNIQUE,
      member_count INTEGER DEFAULT 0,
      description TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Group members table
    `CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      phone VARCHAR(20),
      name VARCHAR(255),
      role VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Messages table
    `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id INTEGER REFERENCES contacts(id),
      group_id INTEGER REFERENCES groups(id),
      message_type VARCHAR(50),
      content TEXT,
      attachments JSONB,
      variables JSONB,
      status VARCHAR(50) DEFAULT 'pending',
      sent_at TIMESTAMP,
      delivered_at TIMESTAMP,
      read_at TIMESTAMP,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Chatbots table
    `CREATE TABLE IF NOT EXISTS chatbots (
      id SERIAL PRIMARY KEY,
      uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      greeting_message TEXT,
      tone VARCHAR(50),
      business_description TEXT,
      status VARCHAR(50) DEFAULT 'inactive',
      config JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Chatbot rules (for regular chatbots)
    `CREATE TABLE IF NOT EXISTS chatbot_rules (
      id SERIAL PRIMARY KEY,
      chatbot_id INTEGER NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
      trigger VARCHAR(255) NOT NULL,
      response TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Chatbot products (for sales chatbots)
    `CREATE TABLE IF NOT EXISTS chatbot_products (
      id SERIAL PRIMARY KEY,
      chatbot_id INTEGER NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
      product_id INTEGER,
      name VARCHAR(255),
      description TEXT,
      price DECIMAL(10, 2),
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Conversations (for chatbot interactions)
    `CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      chatbot_id INTEGER NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
      contact_id INTEGER REFERENCES contacts(id),
      phone VARCHAR(20),
      messages JSONB,
      total_spent DECIMAL(10, 2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Validation results
    `CREATE TABLE IF NOT EXISTS validations (
      id SERIAL PRIMARY KEY,
      uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name VARCHAR(255),
      total_numbers INTEGER,
      valid_numbers INTEGER,
      invalid_numbers INTEGER,
      success_rate DECIMAL(5, 2),
      valid_list JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Analytics/logs
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(255),
      target VARCHAR(255),
      data JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create indices for better performance
    `CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)`,
    `CREATE INDEX IF NOT EXISTS idx_chatbots_user_id ON chatbots(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_id ON conversations(chatbot_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)`,
  ];

  for (const query of queries) {
    try {
      await client.query(query);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error('❌ Error creating table/index:', error.message);
      }
    }
  }
}

export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✓ Executed query (${duration}ms)`);
    return result;
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
}

export default pool;
