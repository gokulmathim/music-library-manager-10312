//
// Database connection service for PostgreSQL
//
const { Pool } = require('pg');

/**
 * Gets configuration for PostgreSQL from environment variables.
 * The music_library_backend should connect to the music_library_database
 * using DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME (these names should
 * match the env vars defined in the database container!)
 */
const pool = new Pool({
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
});

module.exports = {
  query: (...args) => pool.query(...args),
  pool,
};
