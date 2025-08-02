const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

/**
 * User authentication and management service.
 * Handles registration (with hashed passwords),
 * login, and JWT token issuance/verification.
 */

// PUBLIC_INTERFACE
async function registerUser({ username, email, password }) {
  // Check if user exists
  const userExists = await db.query(
    'SELECT user_id FROM users WHERE email=$1 OR username=$2',
    [email, username]
  );
  if (userExists.rows.length > 0) {
    throw new Error('Email or username already exists');
  }
  const password_hash = await bcrypt.hash(password, 12);
  const result = await db.query(
    'INSERT INTO users (username, email, password_hash, created_at) VALUES ($1, $2, $3, NOW()) RETURNING user_id, username, email, created_at',
    [username, email, password_hash]
  );
  return result.rows[0];
}

// PUBLIC_INTERFACE
async function loginUser({ email, password }) {
  const userRes = await db.query(
    'SELECT user_id, password_hash FROM users WHERE email=$1',
    [email]
  );
  if (userRes.rows.length === 0) {
    throw new Error('Invalid credentials');
  }
  const user = userRes.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  // If login is successful, issue JWT token
  const token = jwt.sign(
    { user_id: user.user_id },
    process.env.JWT_SECRET || 'changeme',
    { expiresIn: '7d' }
  );
  return { token, user_id: user.user_id };
}

// PUBLIC_INTERFACE
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'changeme');
  } catch (e) {
    return null;
  }
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
};
