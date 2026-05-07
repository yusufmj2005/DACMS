const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.DB_URL || 'file:dacms.db',
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS datasets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      size TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS access_mappings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      dataset_id TEXT NOT NULL,
      granted_by TEXT NOT NULL,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, dataset_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (dataset_id) REFERENCES datasets(id),
      FOREIGN KEY (granted_by) REFERENCES users(id)
    )
  `);

  console.log('✅ Database initialized successfully');
}

module.exports = { db, initDB };
