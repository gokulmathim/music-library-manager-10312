const db = require('../services/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

/**
 * Music controller: manages music upload, search, view details, and streaming.
 */

const AUDIO_UPLOAD_DIR = process.env.AUDIO_UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

// Ensure directory exists for uploads
fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: AUDIO_UPLOAD_DIR,
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// PUBLIC_INTERFACE
function uploadMiddleware() {
  return upload.single('audio');
}

class MusicController {
  // PUBLIC_INTERFACE
  async uploadTrack(req, res) {
    /**
     * POST /music/upload
     * Upload an audio file and associate metadata (title, artist, genre, etc.).
     * Form fields: title, artist, genre, album, year, file (audio)
     */
    try {
      const { user_id } = req.user;
      const { title, artist, genre, album, year } = req.body;
      // Uploaded file info
      if (!req.file) {
        return res.status(400).json({ error: 'Missing audio file' });
      }
      const filePath = req.file.path;
      const fileName = path.basename(filePath);

      const resp = await db.query(
        `INSERT INTO music_tracks (user_id, file_path, title, artist, genre, album, year, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
        [user_id, fileName, title, artist, genre, album, year]
      );

      res.status(201).json(resp.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async listTracks(req, res) {
    /**
     * GET /music
     * Query params for search/filter: title, artist, genre, album, year, user_id
     */
    try {
      let q = 'SELECT * FROM music_tracks WHERE 1=1';
      const vals = [];
      let idx = 1;
      for (const key of ['title', 'artist', 'genre', 'album', 'user_id']) {
        if (req.query[key]) {
          q += ` AND ${key} ILIKE $${idx++}`;
          vals.push('%' + req.query[key] + '%');
        }
      }
      if (req.query.year) {
        q += ` AND year=$${idx++}`;
        vals.push(req.query.year);
      }
      const resp = await db.query(q + ' ORDER BY uploaded_at DESC', vals);
      res.status(200).json(resp.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async getTrackById(req, res) {
    /**
     * GET /music/:id
     * Fetch track details by id
     */
    try {
      const { id } = req.params;
      const resp = await db.query('SELECT * FROM music_tracks WHERE track_id = $1', [id]);
      if (resp.rows.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.status(200).json(resp.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // PUBLIC_INTERFACE
  async streamTrack(req, res) {
    /**
     * GET /music/:id/stream
     * Streams audio file for playback (range requests supported).
     */
    try {
      const { id } = req.params;
      const resp = await db.query('SELECT file_path FROM music_tracks WHERE track_id = $1', [id]);
      if (resp.rows.length === 0) {
        return res.status(404).json({ error: 'Track not found' });
      }
      const audioPath = path.join(AUDIO_UPLOAD_DIR, resp.rows[0].file_path);
      const stat = fs.statSync(audioPath);

      // Handle range request
      const range = req.headers.range;
      if (!range) {
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': stat.size,
        });
        fs.createReadStream(audioPath).pipe(res);
      } else {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = (end - start) + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg',
        });

        fs.createReadStream(audioPath, { start, end }).pipe(res);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = {
  MusicController: new MusicController(),
  uploadMiddleware,
};
