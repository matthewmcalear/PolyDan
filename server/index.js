const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { supabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// CORS whitelist
const allowedOrigins = [
  process.env.HEROKU_APP_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

// Basic rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// DB test route
app.get('/api/test-db', async (_, res) => {
  const { data, error } = await supabase.from('competitions').select('*').limit(1);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ rows: data.length });
});

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`)); 