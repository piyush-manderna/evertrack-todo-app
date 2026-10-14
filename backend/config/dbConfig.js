
require('dotenv').config();

const useSsl =
  String(process.env.DB_SSL || 'false').toLowerCase() === 'true';

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

if (useSsl) {
  dbConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  };
}

module.exports = dbConfig;
