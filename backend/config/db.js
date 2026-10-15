require('dotenv').config();
const mysql = require('mysql2');
const dbConfig = require('./dbConfig');

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,      // hosted databases drop idle connections; keep them alive
  keepAliveInitialDelay: 10000,
  maxIdle: 2,                 // don't hold many idle connections
  idleTimeout: 30000,         // recycle idle connections before the server kills them
  dateStrings: true, // Return DATE and DATETIME as string literals (avoids UTC timezone shift)
});

// "Today", "overdue" and completed_at all use CURDATE()/CURTIME()/NOW() inside MySQL.
// Hosted databases run in UTC, so pin each connection to your own timezone
// (e.g. DB_TIMEZONE=+05:30 for India). Leave it unset to use the server's default.
if (process.env.DB_TIMEZONE) {
  pool.on('connection', (connection) => {
    connection.query('SET time_zone = ?', [process.env.DB_TIMEZONE]);
  });
}

// Test the connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('✗ MySQL connection failed:', err.message);
  } else {
    console.log('✓ Connected to MySQL database');
    connection.release();
  }
});

const promisePool = pool.promise();

// If a pooled connection was silently dropped (common on free hosted databases
// and after the server wakes from sleep), retry the query once on a fresh one.
const TRANSIENT_CODES = new Set(['ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST']);
const isTransient = (err) =>
  TRANSIENT_CODES.has(err.code) || /connection.*(closed|lost)|closed state/i.test(err.message || '');

const rawQuery = promisePool.query.bind(promisePool);
promisePool.query = async (...args) => {
  try {
    return await rawQuery(...args);
  } catch (err) {
    if (!isTransient(err)) throw err;
    console.warn('! Dropped DB connection, retrying once:', err.code || err.message);
    return rawQuery(...args);
  }
};

// Export the promise-based version for use in controllers
module.exports = promisePool;
