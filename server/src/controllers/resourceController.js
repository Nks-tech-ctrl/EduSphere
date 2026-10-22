const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const {
  RESOURCES_UPLOADS_DIR,
  deleteResourceFileIfExists,
  sanitizeFilename
} = require('../utils/fileUpload');

/**
 * Faculty: Upload / Create a study resource
 * POST /api/resources
 */
async function createResource(req, res) {
  try {
    const { course_id, title, description, category, external_url } = req.body;

    // Validate course_id
    if (!course_id) {
      if (req.file) deleteResourceFileIfExists(req.file.path);
      return res.status(400).json({ success: false, message: 'Course is required.' });
    }

    const course = db.prepare(`
      SELECT id, faculty_id, name, code 
      FROM courses 
      WHERE id = ?
    `).get(course_id);

    if (!course) {
      if (req.file) deleteResourceFileIfExists(req.file.path);
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Ownership check: logged-in faculty must teach the course
    if (course.faculty_id !== req.user.id) {
      if (req.file) deleteResourceFileIfExists(req.file.path);
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only upload resources for your assigned courses.'
      });
    }

    // Validate title
    const cleanTitle = title && typeof title === 'string' ? title.trim() : '';
    if (!cleanTitle || cleanTitle.length > 200) {
      if (req.file) deleteResourceFileIfExists(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Title is required (maximum 200 characters).'
      });
    }

    // Validate category
    const VALID_CATEGORIES = ['notes', 'slides', 'previous_paper', 'reference', 'other'];
    if (!VALID_CATEGORIES.includes(category)) {
      if (req.file) deleteResourceFileIfExists(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Allowed: notes, slides, previous_paper, reference, other.'
      });
    }

    // Validate external_url if provided
    let cleanUrl = external_url && typeof external_url === 'string' ? external_url.trim() : null;
    if (cleanUrl) {
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        if (req.file) deleteResourceFileIfExists(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'External reference URL must begin with http:// or https://'
        });
      }

      try {
        const parsed = new URL(cleanUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          if (req.file) deleteResourceFileIfExists(req.file.path);
          return res.status(400).json({
            success: false,
            message: 'External URL must use http or https protocol.'
          });
        }
      } catch (err) {
        if (req.file) deleteResourceFileIfExists(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Invalid external URL format.'
        });
      }
    }

    // Validate resource source: must have either a file or an external_url
    if (!req.file && !cleanUrl) {
      return res.status(400).json({
        success: false,
        message: 'A study resource must provide either an uploaded file or an external reference URL.'
      });
    }

    const filePath = req.file ? req.file.path : null;
    const fileName = req.file ? req.file.originalname : null;
    const fileSize = req.file ? req.file.size : null;
    const cleanDescription = description && typeof description === 'string' ? description.trim() : null;

    const insertStmt = db.prepare(`
      INSERT INTO resources (
        course_id, title, description, category,
        file_path, file_name, file_size, external_url,
        uploaded_by, created_at, download_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0)
    `);

    const info = insertStmt.run(
      course_id,
      cleanTitle,
      cleanDescription,
      category,
      filePath,
      fileName,
      fileSize,
      cleanUrl,
      req.user.id
    );

    const createdResource = db.prepare(`
      SELECT 
        r.*,
        c.code AS course_code,
        c.name AS course_name,
        u.name AS uploaded_by_name
      FROM resources r
      JOIN courses c ON r.course_id = c.id
      JOIN users u ON r.uploaded_by = u.id
      WHERE r.id = ?
    `).get(info.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Study resource uploaded successfully.',
      resource: createdResource
    });
  } catch (err) {
    if (req.file) deleteResourceFileIfExists(req.file.path);
    console.error('Error in createResource:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload study resource.' });
  }
}

/**
 * Faculty: Get own uploaded resources
 * GET /api/resources/faculty
 */
async function getFacultyResources(req, res) {
  try {
    const resources = db.prepare(`
      SELECT 
        r.*,
        c.code AS course_code,
        c.name AS course_name
      FROM resources r
      JOIN courses c ON r.course_id = c.id
      WHERE c.faculty_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.id);

    const courses = db.prepare(`
      SELECT id, code, name
      FROM courses
      WHERE faculty_id = ?
      ORDER BY code ASC
    `).all(req.user.id);

    return res.status(200).json({
      success: true,
      resources,
      courses
    });
  } catch (err) {
    console.error('Error in getFacultyResources:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch faculty study resources.' });
  }
}

/**
 * Faculty: Delete own resource
 * DELETE /api/resources/:id
 */
async function deleteResource(req, res) {
  try {
    const resourceId = parseInt(req.params.id, 10);
    if (isNaN(resourceId)) {
      return res.status(400).json({ success: false, message: 'Invalid resource ID.' });
    }

    const resource = db.prepare(`
      SELECT r.*, c.faculty_id
      FROM resources r
      JOIN courses c ON r.course_id = c.id
      WHERE r.id = ?
    `).get(resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Study resource not found.' });
    }

    // Ownership check: only uploader or assigned faculty
    if (resource.uploaded_by !== req.user.id && resource.faculty_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own study resources.'
      });
    }

    // Delete file from disk if present
    if (resource.file_path) {
      deleteResourceFileIfExists(resource.file_path);
    }

    db.prepare('DELETE FROM resources WHERE id = ?').run(resourceId);

    return res.status(200).json({
      success: true,
      message: 'Study resource deleted successfully.'
    });
  } catch (err) {
    console.error('Error in deleteResource:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete study resource.' });
  }
}

/**
 * Student: Get study resources for enrolled courses only
 * GET /api/resources/mine
 */
async function getStudentResources(req, res) {
  try {
    const { search, course_id, category, limit } = req.query;

    let query = `
      SELECT 
        r.id,
        r.course_id,
        r.title,
        r.description,
        r.category,
        r.file_name,
        r.file_size,
        r.external_url,
        r.created_at,
        r.download_count,
        c.code AS course_code,
        c.name AS course_name,
        u.name AS uploaded_by_name
      FROM resources r
      JOIN courses c ON r.course_id = c.id
      JOIN enrollments e ON e.course_id = r.course_id
      JOIN users u ON r.uploaded_by = u.id
      WHERE e.student_id = ? AND e.status = 'active'
    `;
    const params = [req.user.id];

    if (search && search.trim()) {
      query += ` AND (r.title LIKE ? OR r.description LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (course_id) {
      query += ` AND r.course_id = ?`;
      params.push(course_id);
    }

    if (category) {
      query += ` AND r.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY r.created_at DESC`;

    const limitNum = parseInt(limit, 10);
    if (!isNaN(limitNum) && limitNum > 0) {
      query += ` LIMIT ?`;
      params.push(limitNum);
    }

    const resources = db.prepare(query).all(...params);

    // Also get the list of enrolled courses for filter dropdowns
    const enrolledCourses = db.prepare(`
      SELECT c.id, c.code, c.name
      FROM courses c
      JOIN enrollments e ON e.course_id = c.id
      WHERE e.student_id = ? AND e.status = 'active'
      ORDER BY c.code ASC
    `).all(req.user.id);

    return res.status(200).json({
      success: true,
      resources,
      enrolledCourses
    });
  } catch (err) {
    console.error('Error in getStudentResources:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch student study resources.' });
  }
}

/**
 * Authenticated Download: Student, Course Faculty, Department HOD, Admin
 * GET /api/resources/:id/download
 */
async function downloadResource(req, res) {
  try {
    const resourceId = parseInt(req.params.id, 10);
    if (isNaN(resourceId)) {
      return res.status(400).json({ success: false, message: 'Invalid resource ID.' });
    }

    const resource = db.prepare(`
      SELECT 
        r.*,
        c.faculty_id,
        c.department_id,
        c.code AS course_code
      FROM resources r
      JOIN courses c ON r.course_id = c.id
      WHERE r.id = ?
    `).get(resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Study resource not found.' });
    }

    // Role-based authorization: Faculty (own courses) and enrolled students keep their access; HOD and Admin are denied
    let isAuthorized = false;
    if (req.user.role === 'faculty' && req.user.id === resource.faculty_id) {
      isAuthorized = true;
    } else if (req.user.role === 'student') {
      const enrollment = db.prepare(`
        SELECT 1 FROM enrollments 
        WHERE student_id = ? AND course_id = ? AND status = 'active'
      `).get(req.user.id, resource.course_id);
      if (enrollment) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to download study resources for this course.'
      });
    }

    // External link check
    if (!resource.file_path) {
      return res.status(400).json({
        success: false,
        message: 'This resource is an external reference link and cannot be downloaded as a file.',
        external_url: resource.external_url
      });
    }

    // Secure path resolution strictly using stored generated filename
    const safeBaseName = path.basename(resource.file_path);
    const fullPath = path.join(RESOURCES_UPLOADS_DIR, safeBaseName);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'Resource file not found on disk.' });
    }

    // Requirement: Only student downloads increment download_count. Faculty, HOD and Admin do not.
    if (req.user.role === 'student') {
      db.prepare('UPDATE resources SET download_count = download_count + 1 WHERE id = ?').run(resource.id);
    }

    const clientFileName = sanitizeFilename(resource.file_name || safeBaseName);
    return res.download(fullPath, clientFileName);
  } catch (err) {
    console.error('Error in downloadResource:', err);
    return res.status(500).json({ success: false, message: 'Failed to process resource download.' });
  }
}

/**
 * HOD & Admin: Read-only resources overview with counts per course
 * GET /api/resources/overview
 */
async function getResourcesOverview(req, res) {
  try {
    const isHod = req.user.role === 'hod';
    const deptId = isHod ? req.user.department_id : null;

    const summary = db.prepare(`
      SELECT 
        COUNT(r.id) AS total_resources,
        COALESCE(SUM(r.download_count), 0) AS total_downloads,
        COUNT(DISTINCT r.course_id) AS active_courses_count,
        SUM(CASE WHEN r.file_path IS NOT NULL THEN 1 ELSE 0 END) AS total_files,
        SUM(CASE WHEN r.external_url IS NOT NULL THEN 1 ELSE 0 END) AS total_links
      FROM courses c
      LEFT JOIN resources r ON r.course_id = c.id
      WHERE (? IS NULL OR c.department_id = ?)
    `).get(deptId, deptId);

    const courses = db.prepare(`
      SELECT 
        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        d.name AS department_name,
        d.code AS department_code,
        u.name AS faculty_name,
        COUNT(r.id) AS total_resources,
        COALESCE(SUM(r.download_count), 0) AS total_downloads,
        SUM(CASE WHEN r.category = 'notes' THEN 1 ELSE 0 END) AS notes_count,
        SUM(CASE WHEN r.category = 'slides' THEN 1 ELSE 0 END) AS slides_count,
        SUM(CASE WHEN r.category = 'previous_paper' THEN 1 ELSE 0 END) AS previous_paper_count,
        SUM(CASE WHEN r.category = 'reference' THEN 1 ELSE 0 END) AS reference_count,
        SUM(CASE WHEN r.category = 'other' THEN 1 ELSE 0 END) AS other_count
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.faculty_id = u.id
      LEFT JOIN resources r ON r.course_id = c.id
      WHERE (? IS NULL OR c.department_id = ?)
      GROUP BY c.id
      ORDER BY c.code ASC
    `).all(deptId, deptId);

    // Also get the list of all resources in this scope for audit/preview
    const resourcesList = db.prepare(`
      SELECT 
        r.id,
        r.course_id,
        r.title,
        r.description,
        r.category,
        r.file_name,
        r.file_size,
        r.external_url,
        r.created_at,
        r.download_count,
        c.code AS course_code,
        c.name AS course_name,
        d.code AS department_code,
        u.name AS uploaded_by_name
      FROM resources r
      JOIN courses c ON r.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      JOIN users u ON r.uploaded_by = u.id
      WHERE (? IS NULL OR c.department_id = ?)
      ORDER BY r.created_at DESC
    `).all(deptId, deptId);

    return res.status(200).json({
      success: true,
      summary,
      courses,
      resources: resourcesList
    });
  } catch (err) {
    console.error('Error in getResourcesOverview:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch resources overview.' });
  }
}

module.exports = {
  createResource,
  getFacultyResources,
  deleteResource,
  getStudentResources,
  downloadResource,
  getResourcesOverview
};
