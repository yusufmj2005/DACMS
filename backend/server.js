require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/datasets', require('./routes/datasets'));
app.use('/api/access', require('./routes/access'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DACMS API is running', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'DACMS Backend API', docs: '/api/health' });
});

// 404 handler (API routes only)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong.' });
});

// Start server
async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DACMS Backend running on port ${PORT}`);
    console.log(`📡 Health: http://localhost:${PORT}/api/health`);
  });
}
start();

module.exports = app;
