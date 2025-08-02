const authService = require('../services/auth');
const db = require('../services/db');

/**
 * User controller: manages registration, login, account profile, and changing password
 */

class UserController {
  // PUBLIC_INTERFACE
  async register(req, res) {
    /**
     * POST /users/register
     * Register a new user.
     */
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing username, email, or password' });
      }
      const user = await authService.registerUser({ username, email, password });
      res.status(201).json({ user });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async login(req, res) {
    /**
     * POST /users/login
     * Login and get access token.
     */
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
      }
      const { token, user_id } = await authService.loginUser({ email, password });
      res.status(200).json({ token, user_id });
    } catch (e) {
      res.status(401).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async getProfile(req, res) {
    /**
     * GET /users/me
     * Get details for current user.
     */
    try {
      const { user_id } = req.user;
      const resp = await db.query('SELECT user_id, username, email, created_at FROM users WHERE user_id = $1', [user_id]);
      if (resp.rows.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.status(200).json(resp.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async updateProfile(req, res) {
    /**
     * PATCH /users/me
     * Update user's profile: username or email (not password here).
     */
    try {
      const { user_id } = req.user;
      const { username, email } = req.body;
      if (!username && !email) {
        return res.status(400).json({ error: 'Nothing to update' });
      }
      const fields = [];
      const vals = [];
      let idx = 1;
      if (username) {
        fields.push(`username = $${idx++}`); vals.push(username);
      }
      if (email) {
        fields.push(`email = $${idx++}`); vals.push(email);
      }
      vals.push(user_id);
      const q = `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${idx} RETURNING user_id, username, email, created_at`;
      const resp = await db.query(q, vals);
      res.status(200).json(resp.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async changePassword(req, res) {
    /**
     * PATCH /users/me/password
     * Change password (requires old password).
     */
    try {
      const { user_id } = req.user;
      const { oldPassword, newPassword } = req.body;
      const resp = await db.query('SELECT password_hash FROM users WHERE user_id = $1', [user_id]);
      if (resp.rows.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      const user = resp.rows[0];
      const valid = await require('bcryptjs').compare(oldPassword, user.password_hash);
      if (!valid) {
        return res.status(400).json({ error: 'Old password incorrect' });
      }
      const password_hash = await require('bcryptjs').hash(newPassword, 12);
      await db.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [password_hash, user_id]);
      res.status(200).json({ message: 'Password changed' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = new UserController();
