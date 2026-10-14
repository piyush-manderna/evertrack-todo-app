require('dotenv').config();

// One place for the database connection settings, shared by the query pool
// (config/db.js) and the session store (server.js).
//
// Local MySQL:   DB_HOST=localhost, DB_PORT unset (3306), DB_SSL unset
// TiDB Cloud:    DB_PORT=4000 and DB_SSL=true  (TiDB requires an encrypted connection)
const useSsl = String(process.env.DB_SSL).toLowerCase() === 'true';

module.exports = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...(useSsl && { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }),
};
