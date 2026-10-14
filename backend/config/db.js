require('dotenv').config();
const mysql = require('mysql2');
const dbConfig = require('./dbConfig');

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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

// Export the promise-based version for use in controllers
module.exports = pool.promise();
