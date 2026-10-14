
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

// Require a session secret in production
if (isProd && !process.env.SESSION_SECRET) {
  console.error(
    '✗ SESSION_SECRET is not set. Refusing to start in production.'
  );
  process.exit(1);
}

app.disable('x-powered-by');

// Trust Render's HTTPS proxy
if (isProd) {
  app.set('trust proxy', 1);
}

// CORS configuration
const corsOrigin =
  process.env.CLIENT_ORIGIN ||
  (!isProd ? 'http://localhost:5173' : null);

if (corsOrigin) {
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );
}

app.use(express.json());

// Health check: does not require a database connection
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// MySQL session store with TLS enabled for TiDB Cloud
const sessionStore = new MySQLStore({
  ...dbConfig,
  ssl: {
    minVersion: 'TLSv1.2',
  },
});

// Handle session-store errors
sessionStore.on('error', (err) => {
  console.error('Session store error:', err.message);
});

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Serve the built React application in production
const distPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found.',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Internal server error.',
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `\n🚀 Server running on port ${PORT}${
      isProd ? ' (production)' : ' — http://localhost:' + PORT
    }\n`
  );
});
