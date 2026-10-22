const db = require('../config/db');
const { maskComplaintForUser } = require('../utils/maskComplaint');
const { runEscalationCheck } = require('../services/escalationService');

const VALID_CATEGORIES = [
  'academic',
  'faculty',
  'hostel',
  'canteen',
  'infrastructure',
  'library',
  'other'
];

const STAGE_RANKS = {
  submitted: 1,
  under_review: 2,
  in_progress: 3,
  resolved: 4
};

/**
 * Generate the next sequential ticket number (CMP-0001, CMP-0002, etc.)
 */
function getNextTicketNo() {
  const row = db.prepare('SELECT ticket_no FROM complaints ORDER BY id DESC LIMIT 1').get();
  if (!row || !row.ticket_no) {
    return 'CMP-0001';
  }

  const match = row.ticket_no.match(/CMP-(\d+)/i);
  if (match) {
    const nextNumber = parseInt(match[1], 10) + 1;
    return `CMP-${String(nextNumber).padStart(4, '0')}`;
  }

  const countRow = db.prepare('SELECT COUNT(*) as total FROM complaints').get();
  const nextNum = (countRow?.total || 0) + 1;
  return `CMP-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Calculate age in days from a created_at timestamp
 */
function calculateAgeInDays(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  const diff = Date.now() - created;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * POST /api/complaints
 * Create a new complaint (Student only)
 */
function createComplaint(req, res) {
  try {
    const { category, title, description, is_anonymous } = req.body;
    const studentId = req.user.id;
    const studentDeptId = req.user.department_id;

    if (!category || !VALID_CATEGORIES.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Title must be at least 5 characters long.'
      });
    }

    if (title.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Title cannot exceed 120 characters.'
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters long with sufficient detail.'
      });
    }

    const isAnon = is_anonymous ? 1 : 0;
    const cleanCategory = category.toLowerCase().trim();
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    let assignedRole = 'admin';
    let assignedDeptId = null;

    if (['academic', 'faculty'].includes(cleanCategory)) {
      assignedRole = 'hod';
      assignedDeptId = studentDeptId || null;
    } else {
      assignedRole = 'admin';
      assignedDeptId = null;
    }

    const ticketNo = getNextTicketNo();

    const executeInsert = db.transaction(() => {
      const insertComplaintStmt = db.prepare(`
        INSERT INTO complaints (
          ticket_no, title, description, category, status, is_anonymous,
          escalated, assigned_role, submitted_by, department_id
        ) VALUES (?, ?, ?, ?, 'submitted', ?, 0, ?, ?, ?)
      `);

      const complaintRes = insertComplaintStmt.run(
        ticketNo,
        cleanTitle,
        cleanDescription,
        cleanCategory,
        isAnon,
        assignedRole,
        studentId,
        assignedDeptId
      );

      const complaintId = complaintRes.lastInsertRowid;

      const initialRemark = isAnon
        ? 'Anonymous complaint registered in the portal. Awaiting review.'
        : 'Complaint registered by student in the portal. Awaiting review.';

      const insertUpdateStmt = db.prepare(`
        INSERT INTO complaint_updates (
          complaint_id, new_status, remark, updated_by
        ) VALUES (?, 'submitted', ?, ?)
      `);

      insertUpdateStmt.run(complaintId, initialRemark, studentId);

      return complaintId;
    });

    const newComplaintId = executeInsert();

    const newComplaint = db.prepare(`
      SELECT c.*, d.name as department_name, d.code as department_code
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.id = ?
    `).get(newComplaintId);

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      ticket_no: ticketNo,
      complaint: newComplaint
    });
  } catch (err) {
    console.error('Error creating complaint:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit complaint. Please try again later.'
    });
  }
}

/**
 * GET /api/complaints/mine
 * List complaints submitted by the logged-in student
 */
function getMyComplaints(req, res) {
  try {
    const studentId = req.user.id;
    const { status, category } = req.query;

    let query = `
      SELECT c.id, c.ticket_no, c.title, c.description, c.category, c.status,
             c.is_anonymous, c.escalated, c.escalated_at, c.assigned_role,
             c.created_at, c.updated_at,
             d.name as department_name, d.code as department_code,
             (SELECT COUNT(*) FROM complaint_updates cu WHERE cu.complaint_id = c.id) as timeline_count
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.submitted_by = ?
    `;

    const params = [studentId];

    if (status && status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status.toLowerCase().trim());
    }

    if (category && category !== 'all') {
      query += ' AND c.category = ?';
      params.push(category.toLowerCase().trim());
    }

    query += ' ORDER BY c.created_at DESC';

    const rawComplaints = db.prepare(query).all(...params);

    const complaints = rawComplaints.map((c) => ({
      ...c,
      age_in_days: calculateAgeInDays(c.created_at)
    }));

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (err) {
    console.error('Error fetching student complaints:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your complaints.'
    });
  }
}

/**
 * GET /api/complaints/:ticket_no
 * Retrieve complaint details and update timeline for student
 */
function getComplaintByTicket(req, res) {
  try {
    const { ticket_no } = req.params;
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;

    if (!ticket_no) {
      return res.status(400).json({
        success: false,
        message: 'Ticket number is required.'
      });
    }

    const complaint = db.prepare(`
      SELECT c.*, 
             u.name as submitter_name, u.email as submitter_email, u.phone as submitter_phone,
             d.name as department_name, d.code as department_code
      FROM complaints c
      LEFT JOIN users u ON c.submitted_by = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE LOWER(c.ticket_no) = LOWER(?)
    `).get(ticket_no.trim());

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: `Complaint ticket "${ticket_no}" not found.`
      });
    }

    if (currentUserRole === 'student' && Number(complaint.submitted_by) !== Number(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own complaints.'
      });
    }

    const timeline = db.prepare(`
      SELECT cu.id, cu.complaint_id, cu.new_status, cu.remark, cu.created_at,
             u.name as updater_name, u.role as updater_role, u.avatar_url as updater_avatar,
             cu.updated_by
      FROM complaint_updates cu
      LEFT JOIN users u ON cu.updated_by = u.id
      WHERE cu.complaint_id = ?
      ORDER BY cu.created_at ASC, cu.id ASC
    `).all(complaint.id);

    const { complaint: safeComplaint, timeline: safeTimeline } = maskComplaintForUser(
      complaint,
      timeline,
      currentUserId
    );

    return res.status(200).json({
      success: true,
      complaint: safeComplaint,
      timeline: safeTimeline
    });
  } catch (err) {
    console.error('Error fetching complaint details:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint details.'
    });
  }
}

/**
 * GET /api/complaints/assigned
 * HOD and Admin complaint queue.
 * - HOD sees complaints with assigned_role='hod' AND department_id = their own department,
 *   PLUS complaints originating from their department that were escalated to Admin (visible as read-only!).
 * - Admin sees ALL complaints.
 * - Applies anonymity masking so student shows "Anonymous" for anonymous tickets.
 */
function getAssignedComplaints(req, res) {
  try {
    const { role, department_id, id: userId } = req.user;
    const { status, category, escalated, search } = req.query;

    let query = `
      SELECT c.id, c.ticket_no, c.title, c.description, c.category, c.status,
             c.is_anonymous, c.escalated, c.escalated_at, c.assigned_role,
             c.created_at, c.updated_at, c.submitted_by,
             u.name as submitter_name, u.email as submitter_email,
             d.name as department_name, d.code as department_code,
             (SELECT COUNT(*) FROM complaint_updates cu WHERE cu.complaint_id = c.id) as timeline_count
      FROM complaints c
      LEFT JOIN users u ON c.submitted_by = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE 1=1
    `;

    const params = [];

    // Role-based scoping
    if (role === 'hod') {
      // HOD sees complaints currently assigned to HOD in their dept,
      // OR complaints from their dept that were escalated to Admin (per requirement 3).
      query += ` AND (c.department_id = ? AND (c.assigned_role = 'hod' OR c.escalated = 1))`;
      params.push(department_id);
    } else if (role === 'admin') {
      // Admin has institutional oversight over all complaints
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Requires HOD or Administrator privileges.'
      });
    }

    // Filter by status
    if (status && status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status.toLowerCase().trim());
    }

    // Filter by category
    if (category && category !== 'all') {
      query += ' AND c.category = ?';
      params.push(category.toLowerCase().trim());
    }

    // Filter by escalation
    if (escalated === 'true' || escalated === '1') {
      query += ' AND c.escalated = 1';
    }

    // Search query (ticket, title, student name)
    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      query += ' AND (LOWER(c.ticket_no) LIKE ? OR LOWER(c.title) LIKE ? OR LOWER(u.name) LIKE ?)';
      params.push(s, s, s);
    }

    query += ' ORDER BY c.escalated DESC, c.created_at DESC';

    const rawRows = db.prepare(query).all(...params);

    // Apply anonymity masking helper and calculate age
    const complaints = rawRows.map((row) => {
      const { complaint: safeRow } = maskComplaintForUser(row, [], userId);
      return {
        ...safeRow,
        age_in_days: calculateAgeInDays(safeRow.created_at),
        is_escalated_to_admin: row.escalated === 1 && row.assigned_role === 'admin'
      };
    });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (err) {
    console.error('Error in getAssignedComplaints:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve assigned complaints.'
    });
  }
}

/**
 * GET /api/complaints/manage/:ticket_no
 * Detail view for HOD / Admin with access scoping, masking, and is_read_only flag.
 */
function getManagedComplaintDetail(req, res) {
  try {
    const { ticket_no } = req.params;
    const { role, department_id, id: userId } = req.user;

    if (!ticket_no) {
      return res.status(400).json({
        success: false,
        message: 'Ticket number is required.'
      });
    }

    const complaint = db.prepare(`
      SELECT c.*, 
             u.name as submitter_name, u.email as submitter_email, u.phone as submitter_phone,
             d.name as department_name, d.code as department_code
      FROM complaints c
      LEFT JOIN users u ON c.submitted_by = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE LOWER(c.ticket_no) = LOWER(?)
    `).get(ticket_no.trim());

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: `Complaint ticket "${ticket_no}" not found.`
      });
    }

    // Access Scoping:
    // A HOD must get 403 for complaints outside their department
    if (role === 'hod' && Number(complaint.department_id) !== Number(department_id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: This complaint does not belong to your department.'
      });
    }

    // Determine read-only mode:
    // HOD is read-only if complaint was escalated to Admin (assigned_role !== 'hod') or already resolved.
    // Admin is read-only if complaint is already resolved.
    let isReadOnly = false;
    let readOnlyReason = '';

    if (complaint.status === 'resolved') {
      isReadOnly = true;
      readOnlyReason = 'This complaint is marked as Resolved and closed.';
    } else if (role === 'hod' && complaint.assigned_role === 'admin') {
      isReadOnly = true;
      readOnlyReason = 'This complaint has been escalated to Central Administration and is in read-only mode for HOD.';
    }

    const timeline = db.prepare(`
      SELECT cu.id, cu.complaint_id, cu.new_status, cu.remark, cu.created_at,
             u.name as updater_name, u.role as updater_role, u.avatar_url as updater_avatar,
             cu.updated_by
      FROM complaint_updates cu
      LEFT JOIN users u ON cu.updated_by = u.id
      WHERE cu.complaint_id = ?
      ORDER BY cu.created_at ASC, cu.id ASC
    `).all(complaint.id);

    const { complaint: safeComplaint, timeline: safeTimeline } = maskComplaintForUser(
      complaint,
      timeline,
      userId
    );

    return res.status(200).json({
      success: true,
      complaint: {
        ...safeComplaint,
        age_in_days: calculateAgeInDays(safeComplaint.created_at)
      },
      timeline: safeTimeline,
      is_read_only: isReadOnly,
      read_only_reason: readOnlyReason
    });
  } catch (err) {
    console.error('Error in getManagedComplaintDetail:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint details.'
    });
  }
}

/**
 * PATCH /api/complaints/manage/:ticket_no/status
 * HOD / Admin update complaint status.
 * - Forward-only transition: submitted > under_review > in_progress > resolved
 * - Mandatory remark (min 5 chars)
 * - Resolved is final
 */
function updateComplaintStatus(req, res) {
  try {
    const { ticket_no } = req.params;
    const { new_status, remark } = req.body;
    const { role, department_id, id: userId, name: userName } = req.user;

    // 1. Validation
    if (!new_status || !STAGE_RANKS[new_status.toLowerCase()]) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${Object.keys(STAGE_RANKS).join(', ')}`
      });
    }

    if (!remark || typeof remark !== 'string' || remark.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'A descriptive remark of at least 5 characters is mandatory for audit logging.'
      });
    }

    const cleanNewStatus = new_status.toLowerCase().trim();
    const cleanRemark = remark.trim();

    // 2. Fetch current complaint
    const complaint = db.prepare(`
      SELECT * FROM complaints WHERE LOWER(ticket_no) = LOWER(?)
    `).get(ticket_no.trim());

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: `Complaint ticket "${ticket_no}" not found.`
      });
    }

    // 3. Scoping & Authority checks
    if (role === 'hod') {
      if (Number(complaint.department_id) !== Number(department_id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: This complaint does not belong to your department.'
        });
      }

      if (complaint.assigned_role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied: This complaint has been escalated to Central Administration and is read-only for HOD.'
        });
      }
    }

    // 4. Forward-only state transition check
    const currentRank = STAGE_RANKS[complaint.status] || 1;
    const newRank = STAGE_RANKS[cleanNewStatus];

    if (complaint.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'This complaint is already Resolved and closed. No further status changes are permitted.'
      });
    }

    if (newRank <= currentRank) {
      return res.status(400).json({
        success: false,
        message: `Status can only move forward in the sequence: Submitted → Under Review → In Progress → Resolved. Cannot transition from "${complaint.status}" to "${cleanNewStatus}".`
      });
    }

    // 5. Apply Status Update and Timeline Entry in Transaction
    const executeStatusUpdate = db.transaction(() => {
      db.prepare(`
        UPDATE complaints
        SET status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(cleanNewStatus, complaint.id);

      db.prepare(`
        INSERT INTO complaint_updates (
          complaint_id, new_status, remark, updated_by, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(complaint.id, cleanNewStatus, cleanRemark, userId);
    });

    executeStatusUpdate();

    // 6. Fetch updated record and timeline
    const updatedComplaint = db.prepare(`
      SELECT c.*, d.name as department_name, d.code as department_code
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.id = ?
    `).get(complaint.id);

    const updatedTimeline = db.prepare(`
      SELECT cu.id, cu.complaint_id, cu.new_status, cu.remark, cu.created_at,
             u.name as updater_name, u.role as updater_role, u.avatar_url as updater_avatar,
             cu.updated_by
      FROM complaint_updates cu
      LEFT JOIN users u ON cu.updated_by = u.id
      WHERE cu.complaint_id = ?
      ORDER BY cu.created_at ASC, cu.id ASC
    `).all(complaint.id);

    const { complaint: safeComplaint, timeline: safeTimeline } = maskComplaintForUser(
      updatedComplaint,
      updatedTimeline,
      userId
    );

    return res.status(200).json({
      success: true,
      message: `Complaint ${complaint.ticket_no} status advanced to "${cleanNewStatus.replace('_', ' ')}".`,
      complaint: safeComplaint,
      timeline: safeTimeline
    });
  } catch (err) {
    console.error('Error updating complaint status:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update complaint status.'
    });
  }
}

/**
 * POST /api/complaints/escalation/run
 * On-demand manual escalation check (Admin only).
 * Always executes regardless of AUTO_ESCALATION env flag.
 */
function runEscalationOnDemand(req, res) {
  try {
    const result = runEscalationCheck();
    return res.status(200).json({
      success: true,
      count: result.escalatedCount,
      tickets: result.escalatedTickets,
      message: result.escalatedCount > 0
        ? `SLA check completed: ${result.escalatedCount} overdue complaints were successfully escalated.`
        : 'SLA check completed: All active complaints are currently within acceptable time limits.'
    });
  } catch (err) {
    console.error('Error running manual escalation:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to run escalation check: ' + err.message
    });
  }
}

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintByTicket,
  getAssignedComplaints,
  getManagedComplaintDetail,
  updateComplaintStatus,
  runEscalationOnDemand
};
