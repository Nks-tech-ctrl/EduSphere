const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Base uploads directory
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Dedicated Study Resources directory (Phase 9)
const RESOURCES_UPLOADS_DIR = path.join(UPLOADS_DIR, 'resources');
if (!fs.existsSync(RESOURCES_UPLOADS_DIR)) {
  fs.mkdirSync(RESOURCES_UPLOADS_DIR, { recursive: true });
}

// Allowed extensions
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip', '.png', '.jpg']);

// Multer storage with secure random unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${safeBase}${ext}`);
  }
});

// Resources storage (under server/uploads/resources/)
const resourceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RESOURCES_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = `res-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${safeBase}${ext}`);
  }
});

// File filter checking extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const err = new Error('Invalid file type. Allowed formats: pdf, doc, docx, ppt, pptx, txt, zip, png, jpg.');
    err.status = 400;
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }
  cb(null, true);
};

// 10 MB limit for assignments & submissions
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 20 MB limit for Study Resources (Phase 9)
const resourceUpload = multer({
  storage: resourceStorage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

/**
 * Delete a file safely from disk
 */
function deleteFileIfExists(filePath) {
  if (!filePath) return;
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(UPLOADS_DIR, path.basename(filePath));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn('[Edusphere Uploads] Failed to delete file:', filePath, err.message);
  }
}

/**
 * Delete a resource file safely from resources uploads directory
 */
function deleteResourceFileIfExists(filePath) {
  if (!filePath) return;
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(RESOURCES_UPLOADS_DIR, path.basename(filePath));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn('[Edusphere Resources] Failed to delete resource file:', filePath, err.message);
  }
}

/**
 * Extract text safely from PDF, DOCX, or TXT (up to 50,000 characters)
 * Never throws error; returns null on failure or unsupported type.
 */
async function extractTextFromFile(filePath, originalName) {
  if (!filePath) return null;
  const ext = path.extname(originalName || filePath).toLowerCase();

  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(UPLOADS_DIR, path.basename(filePath));
    if (!fs.existsSync(fullPath)) return null;

    if (ext === '.txt') {
      const content = fs.readFileSync(fullPath, 'utf8');
      return content.slice(0, 50000);
    }

    if (ext === '.docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: fullPath });
      return (result && result.value ? result.value : '').slice(0, 50000);
    }

    if (ext === '.pdf') {
      // Classic pdf-parse safe entry point
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const dataBuffer = fs.readFileSync(fullPath);
      const data = await pdfParse(dataBuffer);
      return (data && data.text ? data.text : '').slice(0, 50000);
    }

    return null;
  } catch (err) {
    console.warn('[Edusphere Uploads] Safe text extraction skipped/failed:', err.message);
    return null;
  }
}

/**
 * Sanitize filename for Content-Disposition header
 */
function sanitizeFilename(originalName) {
  if (!originalName) return 'downloaded_file';
  // Remove path traversal and unsafe characters
  const base = path.basename(originalName);
  return base.replace(/[^\w\.\-\s]/gi, '_');
}

module.exports = {
  UPLOADS_DIR,
  RESOURCES_UPLOADS_DIR,
  upload,
  resourceUpload,
  deleteFileIfExists,
  deleteResourceFileIfExists,
  extractTextFromFile,
  sanitizeFilename
};

