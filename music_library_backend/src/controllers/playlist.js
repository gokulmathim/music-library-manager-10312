const db = require('../services/db');

/**
 * Playlist controller: manages playlist creation, update, deletion, listing, and track management.
 */

class PlaylistController {
  // PUBLIC_INTERFACE
  async create(req, res) {
    /**
     * POST /playlists
     * Create a new playlist.
     * Body: {name, description}
     */
    try {
      const { user_id } = req.user;
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Missing playlist name' });
      }
      const resp = await db.query(
        'INSERT INTO playlists (user_id, name, description, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
        [user_id, name, description]
      );
      res.status(201).json(resp.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async list(req, res) {
    /**
     * GET /playlists
     * List user playlists.
     */
    try {
      const { user_id } = req.user;
      const resp = await db.query(
        'SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC',
        [user_id]
      );
      res.status(200).json(resp.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async get(req, res) {
    /**
     * GET /playlists/:id
     * Get playlist details (including tracks).
     */
    try {
      const { user_id } = req.user;
      const { id } = req.params;
      const playlistQ = await db.query(
        'SELECT * FROM playlists WHERE playlist_id = $1 AND user_id = $2',
        [id, user_id]
      );
      if (playlistQ.rows.length === 0) {
        return res.status(404).json({ error: 'Playlist not found' });
      }
      const playlist = playlistQ.rows[0];
      const tracksResp = await db.query(
        'SELECT mt.* FROM playlist_tracks pt JOIN music_tracks mt ON pt.track_id = mt.track_id WHERE pt.playlist_id = $1',
        [id]
      );
      playlist.tracks = tracksResp.rows;
      res.status(200).json(playlist);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async addTrack(req, res) {
    /**
     * POST /playlists/:id/tracks
     * Add a track to playlist.
     */
    try {
      const { user_id } = req.user;
      const { id } = req.params;
      const { track_id } = req.body;
      // Check playlist ownership
      const q = await db.query('SELECT * FROM playlists WHERE playlist_id = $1 AND user_id = $2', [id, user_id]);
      if (q.rows.length === 0) {
        return res.status(404).json({ error: 'Playlist not found or not owned' });
      }
      await db.query(
        'INSERT INTO playlist_tracks (playlist_id, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, track_id]
      );
      res.status(201).json({ message: 'Track added' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async removeTrack(req, res) {
    /**
     * DELETE /playlists/:id/tracks/:track_id
     * Remove a track from playlist.
     */
    try {
      const { user_id } = req.user;
      const { id, track_id } = req.params;
      // Check playlist ownership
      const q = await db.query('SELECT * FROM playlists WHERE playlist_id = $1 AND user_id = $2', [id, user_id]);
      if (q.rows.length === 0) {
        return res.status(404).json({ error: 'Playlist not found or not owned' });
      }
      await db.query(
        'DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2',
        [id, track_id]
      );
      res.status(200).json({ message: 'Track removed' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async delete(req, res) {
    /**
     * DELETE /playlists/:id
     * Delete playlist (owner only).
     */
    try {
      const { user_id } = req.user;
      const { id } = req.params;
      // Remove tracks from playlist and delete
      await db.query('DELETE FROM playlist_tracks WHERE playlist_id = $1', [id]);
      await db.query('DELETE FROM playlists WHERE playlist_id = $1 AND user_id = $2', [id, user_id]);
      res.status(200).json({ message: 'Playlist deleted' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = new PlaylistController();
