const db = require('../config/db');

const ALLOWED_TARGET_ROLES = ['all', 'student', 'faculty', 'hod'];

/**
 * GET /api/notices (All roles)
 * - Admin sees ALL notices (no audience filter) to facilitate full management.
 * - Other roles see notices matching their department & role, OR notices they authored.
 */
function getNotices(req, res) {
  try {
    const { id: userId, role, department_id: deptId } = req.user;

    let query = '';
    let params = [];

    if (role === 'admin') {
      // Admin sees ALL notices across the institution
      query = `
        SELECT
          n.id, n.title, n.content, n.target_role, n.department_id, n.author_id, n.created_at,
          u.name as author_name, u.role as author_role, u.avatar_url as author_avatar,
          d.name as department_name, d.code as department_code
        FROM notices n
        LEFT JOIN users u ON n.author_id = u.id
        LEFT JOIN departments d ON n.department_id = d.id
        ORDER BY n.created_at DESC
      `;
    } else {
      // Non-admin: relevant to user's role/dept OR authored by user
      query = `
        SELECT
          n.id, n.title, n.content, n.target_role, n.department_id, n.author_id, n.created_at,
          u.name as author_name, u.role as author_role, u.avatar_url as author_avatar,
          d.name as department_name, d.code as department_code
        FROM notices n
        LEFT JOIN users u ON n.author_id = u.id
        LEFT JOIN departments d ON n.department_id = d.id
        WHERE n.author_id = ?
           OR (
             (n.department_id IS NULL OR n.department_id = ?)
             AND (n.target_role = 'all' OR n.target_role = ?)
           )
        ORDER BY n.created_at DESC
      `;
      params = [userId, deptId, role];
    }

    const notices = db.prepare(query).all(...params);

    return res.status(200).json({
      success: true,
      count: notices.length,
      notices
    });
  } catch (err) {
    console.error('Error in getNotices:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notices.' });
  }
}



/**
 * POST /api/notices (Faculty, HOD, Admin)
 * Broadcasts a new notice respecting strict role scopes.
 */
function createNotice(req, res) {
  try {
    const { id: userId, role, department_id: userDeptId } = req.user;
    const { title, content, target_role, department_id } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Title must be at least 3 characters long.' });
    }

    if (!content || content.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Content must be at least 5 characters long.' });
    }

    if (!target_role || !ALLOWED_TARGET_ROLES.includes(target_role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid target_role. Allowed roles: ${ALLOWED_TARGET_ROLES.join(', ')}`
      });
    }

    let finalDeptId = department_id ? Number(department_id) : null;

    // Role-specific permission verification
    if (role === 'faculty') {
      if (target_role !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'Faculty members are only permitted to broadcast notices to students.'
        });
      }

      if (!finalDeptId) {
        return res.status(400).json({
          success: false,
          message: 'Faculty must specify a department for course announcements.'
        });
      }

      // Check if faculty teaches any course in this department
      const teachesInDept = db.prepare(`
        SELECT id FROM courses WHERE faculty_id = ? AND department_id = ? LIMIT 1
      `).get(userId, finalDeptId);

      if (!teachesInDept) {
        return res.status(403).json({
          success: false,
          message: 'You may only publish notices for departments where you teach allocated courses.'
        });
      }
    } else if (role === 'hod') {
      if (!userDeptId) {
        return res.status(400).json({ success: false, message: 'HOD user must belong to a department.' });
      }

      // HOD may only publish to their own department
      finalDeptId = userDeptId;

      if (!['all', 'student', 'faculty'].includes(target_role)) {
        return res.status(400).json({
          success: false,
          message: 'HOD notices can only target all, student, or faculty.'
        });
      }
    } else if (role === 'admin') {
      // Admin can publish to any department or institution-wide (null)
      if (finalDeptId) {
        const deptExists = db.prepare('SELECT id FROM departments WHERE id = ?').get(finalDeptId);
        if (!deptExists) {
          return res.status(400).json({ success: false, message: 'Invalid department_id specified.' });
        }
      }
    } else {
      return res.status(403).json({ success: false, message: 'Students are not authorized to broadcast notices.' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO notices (title, content, target_role, department_id, author_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(title.trim(), content.trim(), target_role, finalDeptId, userId);
    const newNoticeId = result.lastInsertRowid;

    const notice = db.prepare(`
      SELECT
        n.id, n.title, n.content, n.target_role, n.department_id, n.author_id, n.created_at,
        u.name as author_name, u.role as author_role,
        d.code as department_code, d.name as department_name
      FROM notices n
      LEFT JOIN users u ON n.author_id = u.id
      LEFT JOIN departments d ON n.department_id = d.id
      WHERE n.id = ?
    `).get(newNoticeId);

    return res.status(201).json({
      success: true,
      message: 'Notice broadcast published successfully.',
      notice
    });
  } catch (err) {
    console.error('Error in createNotice:', err);
    return res.status(500).json({ success: false, message: 'Failed to create notice.' });
  }
}

/**
 * DELETE /api/notices/:id (Author or Admin only)
 */
function deleteNotice(req, res) {
  try {
    const { id: userId, role } = req.user;
    const { id: noticeId } = req.params;

    const notice = db.prepare('SELECT id, author_id, title FROM notices WHERE id = ?').get(noticeId);
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found.' });
    }

    // Authorization: Must be the author or a system Administrator
    if (role !== 'admin' && notice.author_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this notice.'
      });
    }

    db.prepare('DELETE FROM notices WHERE id = ?').run(noticeId);

    return res.status(200).json({
      success: true,
      message: `Notice "${notice.title}" deleted successfully.`
    });
  } catch (err) {
    console.error('Error in deleteNotice:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete notice.' });
  }
}

module.exports = {
  getNotices,
  createNotice,
  deleteNotice
};
