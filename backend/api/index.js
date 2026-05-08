const app = require('../server');
const { initDB } = require('../db');

// Initialize DB on cold start
let dbInitialized = false;

module.exports = async (req, res) => {
  if (!dbInitialized) {
    try {
      await initDB();
      dbInitialized = true;
    } catch (err) {
      console.error('DB Init Error:', err);
      return res.status(500).json({ 
        error: 'Database initialization failed.', 
        details: err.message,
        stack: err.stack 
      });
    }
  }
  return app(req, res);
};
