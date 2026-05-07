const app = require('../server');
const { initDB } = require('../db');

// Initialize DB on cold start
let dbInitialized = false;

module.exports = async (req, res) => {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
  return app(req, res);
};
