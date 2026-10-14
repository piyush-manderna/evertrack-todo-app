require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const dbConfig = require('./config/dbConfig');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.SESSION_SECRET) {
  console.error('✗ SESSION_SECRET is not set. Refusing to start in production.');
  process.exit(1);
}

app.disable('x-powered-by');

// Behind Render's HTTPS proxy: needed so secure cookies work
if (isProd) app.set('trust proxy', 1);

// CORS is only needed when the frontend runs on a different origin:
//  - local dev (React dev server on :5173), or
//  - a separately hosted frontend (set CLIENT_ORIGIN to its URL)
// When Express serves the built frontend itself, everything is same-origin.
const corsOrigin = process.env.CLIENT_ORIGIN || (!isProd ? 'http://localhost:5173' : null);
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin, credentials: true }));
}

app.use(express.json());

// Health check (before sessions so pings never touch the database)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Store sessions in MySQL so they survive server restarts and sleeping
const sessionStore = new MySQLStore({ ...dbConfig });

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,   // JS cannot read this cookie — prevents XSS theft
    secure: isProd,   // HTTPS only in production
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Serve the built React app (frontend/dist) in production
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Any other GET (e.g. refreshing /upcoming) gets the React app
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}${isProd ? ' (production)' : ` — http://localhost:${PORT}`}\n`);
});
