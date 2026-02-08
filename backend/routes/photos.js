/**
 * Photo Upload Routes for Dora Learning App
 * Handles image uploads from kids snapping pictures of curious things
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Multer for file uploads
const multer = require('multer');

// Create uploads directory
const UPLOAD_DIR = path.join(__dirname, '../uploads/photos');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `photo_${timestamp}_${uniqueId}${ext}`);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed! 🖼️'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1
  }
});

// Middleware for upload errors
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'Photo too big! Please use a smaller image (under 5MB) 📏' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false, 
        error: 'Only one photo at a time please! 📸' 
      });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  
  if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  
  next();
}

// ========================================
// PHOTO ROUTES
// ========================================

/**
 * POST /api/photos/upload
 * Upload a photo
 * Body: multipart/form-data with 'image' field
 * Optional: profileId, lessonId, description
 */
router.post('/upload', upload.single('image'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No photo provided! Please select or capture an image 📷' 
      });
    }

    const { profileId, lessonId, description } = req.body;
    
    // Get file info
    const photo = {
      id: path.basename(req.file.filename, path.extname(req.file.filename)),
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/photos/${req.file.filename}`,
      profileId: profileId || null,
      lessonId: lessonId ? parseInt(lessonId) : null,
      description: description || null,
      uploadedAt: new Date().toISOString()
    };

    // Save metadata to database if available
    const db = req.app.get('db');
    if (db) {
      try {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO photos (filename, original_name, mimetype, size, url, profile_id, lesson_id, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [photo.filename, photo.originalName, photo.mimetype, photo.size, photo.url, photo.profileId, photo.lessonId, photo.description],
            function(err) {
              if (err) reject(err);
              else {
                photo.dbId = this.lastID;
                resolve();
              }
            }
          );
        });
      } catch (dbErr) {
        // Non-fatal - photo still saved to disk
        console.warn('Could not save photo metadata to DB:', dbErr.message);
      }
    }

    console.log('📸 Photo uploaded:', photo.filename);

    res.status(201).json({
      success: true,
      message: 'Great photo! 🌟',
      photo
    });

  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Oops! Could not save your photo. Try again! 🌈' 
    });
  }
});

/**
 * GET /api/photos/:filename
 * Get photo by filename
 */
router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ 
      success: false, 
      error: 'Photo not found! 🔍' 
    });
  }

  res.sendFile(filePath);
});

/**
 * GET /api/photos/profile/:profileId
 * Get all photos for a profile
 */
router.get('/profile/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const db = req.app.get('db');

  if (!db) {
    return res.status(500).json({ success: false, error: 'Database not available' });
  }

  try {
    const photos = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM photos WHERE profile_id = ? ORDER BY created_at DESC`,
        [profileId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({ success: true, photos });
  } catch (err) {
    console.error('Error fetching photos:', err);
    res.status(500).json({ success: false, error: 'Could not fetch photos' });
  }
});

/**
 * DELETE /api/photos/:filename
 * Delete a photo
 */
router.delete('/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    // Delete from filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database if available
    const db = req.app.get('db');
    if (db) {
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM photos WHERE filename = ?', [filename], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({ success: true, message: 'Photo deleted! 🗑️' });
  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ success: false, error: 'Could not delete photo' });
  }
});

module.exports = router;
