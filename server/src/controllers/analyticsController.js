const db = require('../config/db');
const { calcAttendancePercentage } = require('../utils/attendanceHelper');

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for chart labels e.g. "Oct 12"
 */
function formatDateLabel(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * GET /api/analytics/complaints
 * Comprehensive grievance analytics for Central Admin and Department HODs.
 * - Admin: institution-wide analytics
 * - HOD: scoped to own department (including complaints escalated from dept to Admin)
 * - Returns: totals, status breakdown, category breakdown, continuous 14-day zero-filled trend,
 *   avg resolution time, escalation rate, resolved percentage, and department breakdown (Admin only).
 * - Aggregates ONLY: zero submitter names or student identity exposed.
 */
function getComplaintAnalytics(req, res) {
  try {
    const { role, department_id } = req.user;
    const isHod = role === 'hod';
    const deptId = isHod ? department_id : null;

    // Base WHERE clause
    const whereClause = isHod ? 'WHERE c.department_id = ?' : 'WHERE 1=1';
    const params = isHod ? [deptId] : [];

    // 1. Executive Totals and KPIs in a single efficient SQL query
    const totalsQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN c.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN c.status = 'under_review' THEN 1 ELSE 0 END) as under_review_count,
        SUM(CASE WHEN c.status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
        SUM(CASE WHEN c.escalated = 1 THEN 1 ELSE 0 END) as escalated_count,
        AVG(CASE WHEN c.status = 'resolved' THEN (julianday(c.updated_at) - julianday(c.created_at)) * 24.0 END) as avg_resolution_hours
      FROM complaints c
      ${whereClause}
    `;
    const totalsRow = db.prepare(totalsQuery).get(...params) || {};

    const total = Number(totalsRow.total) || 0;
    const resolved = Number(totalsRow.resolved_count) || 0;
    const inProgress = Number(totalsRow.in_progress_count) || 0;
    const underReview = Number(totalsRow.under_review_count) || 0;
    const submitted = Number(totalsRow.submitted_count) || 0;
    const escalated = Number(totalsRow.escalated_count) || 0;

    const resolvedPercentage = total > 0 ? Math.round((resolved / total) * 1000) / 10 : 0;
    const escalationRate = total > 0 ? Math.round((escalated / total) * 1000) / 10 : 0;

    const rawHours = totalsRow.avg_resolution_hours != null ? Number(totalsRow.avg_resolution_hours) : null;
    const avgResolutionHours = rawHours != null ? Math.round(rawHours * 10) / 10 : 0;
    const avgResolutionDays = rawHours != null ? Math.round((rawHours / 24.0) * 10) / 10 : 0;

    let avgResolutionTimeFormatted = 'N/A';
    if (avgResolutionDays >= 1) {
      avgResolutionTimeFormatted = `${avgResolutionDays} ${avgResolutionDays === 1 ? 'day' : 'days'}`;
    } else if (avgResolutionHours > 0) {
      avgResolutionTimeFormatted = `${avgResolutionHours} hrs`;
    }

    // 2. Breakdown by Status (consistent status colors)
    const statusQuery = `
      SELECT c.status, COUNT(*) as count
      FROM complaints c
      ${whereClause}
      GROUP BY c.status
    `;
    const statusRows = db.prepare(statusQuery).all(...params);
    const statusCountMap = {};
    statusRows.forEach(r => { statusCountMap[r.status] = Number(r.count); });

    const statusConfig = [
      { status: 'submitted', label: 'Submitted', color: '#3b82f6' },     // Blue
      { status: 'under_review', label: 'Under Review', color: '#f59e0b' }, // Amber
      { status: 'in_progress', label: 'In Progress', color: '#6366f1' },  // Indigo
      { status: 'resolved', label: 'Resolved', color: '#10b981' }        // Emerald
    ];

    const byStatus = statusConfig.map(s => ({
      status: s.status,
      label: s.label,
      count: statusCountMap[s.status] || 0,
      percentage: total > 0 ? Math.round(((statusCountMap[s.status] || 0) / total) * 1000) / 10 : 0,
      color: s.color
    }));

    // 3. Breakdown by Category
    const categoryQuery = `
      SELECT c.category, COUNT(*) as count
      FROM complaints c
      ${whereClause}
      GROUP BY c.category
      ORDER BY count DESC
    `;
    const categoryRows = db.prepare(categoryQuery).all(...params);
    const categoryMap = {};
    categoryRows.forEach(r => { categoryMap[r.category] = Number(r.count); });

    const allCategories = [
      { category: 'academic', label: 'Academic' },
      { category: 'faculty', label: 'Faculty' },
      { category: 'infrastructure', label: 'Infrastructure' },
      { category: 'library', label: 'Library' },
      { category: 'hostel', label: 'Hostel' },
      { category: 'canteen', label: 'Canteen' },
      { category: 'other', label: 'Other' }
    ];

    const byCategory = allCategories.map(cat => ({
      category: cat.category,
      label: cat.label,
      count: categoryMap[cat.category] || 0,
      percentage: total > 0 ? Math.round(((categoryMap[cat.category] || 0) / total) * 1000) / 10 : 0
    })).sort((a, b) => b.count - a.count);

    // 4. Daily Complaint Trend for the Last 14 Days (Zero-filled continuous timeline)
    const dailyQuery = `
      SELECT
        date(c.created_at) as day_date,
        COUNT(*) as total_created,
        SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) as total_resolved
      FROM complaints c
      ${whereClause} AND c.created_at >= datetime(CURRENT_TIMESTAMP, '-14 days')
      GROUP BY date(c.created_at)
    `;
    const dailyRows = db.prepare(dailyQuery).all(...params);
    const dailyMap = {};
    dailyRows.forEach(r => {
      dailyMap[r.day_date] = {
        total: Number(r.total_created),
        resolved: Number(r.total_resolved)
      };
    });

    const dailyTrend = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = formatDateKey(d);
      const label = formatDateLabel(d);
      const record = dailyMap[key] || { total: 0, resolved: 0 };
      dailyTrend.push({
        date: key,
        label,
        count: record.total,
        resolved: record.resolved
      });
    }

    // 5. Counts by Department & Status Breakdown (Admin only)
    let byDepartment = null;
    if (!isHod) {
      const deptQuery = `
        SELECT
          COALESCE(d.code, 'Central') as department,
          COALESCE(d.name, 'Central Administration') as department_name,
          COUNT(*) as total,
          SUM(CASE WHEN c.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
          SUM(CASE WHEN c.status = 'under_review' THEN 1 ELSE 0 END) as under_review,
          SUM(CASE WHEN c.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END) as resolved
        FROM complaints c
        LEFT JOIN departments d ON c.department_id = d.id
        GROUP BY c.department_id
        ORDER BY total DESC
      `;
      byDepartment = db.prepare(deptQuery).all().map(row => ({
        department: row.department,
        department_name: row.department_name,
        total: Number(row.total),
        submitted: Number(row.submitted),
        under_review: Number(row.under_review),
        in_progress: Number(row.in_progress),
        resolved: Number(row.resolved)
      }));
    }

    return res.status(200).json({
      success: true,
      role,
      department_id: deptId,
      kpis: {
        total,
        resolved,
        inProgress,
        underReview,
        submitted,
        escalated,
        resolvedPercentage,
        escalationRate,
        avgResolutionHours,
        avgResolutionDays,
        avgResolutionTimeFormatted
      },
      byStatus,
      byCategory,
      dailyTrend,
      byDepartment
    });
  } catch (err) {
    console.error('Error in getComplaintAnalytics:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve complaint analytics.'
    });
  }
}

/**
 * GET /api/analytics/attendance
 * Average attendance % per department and per course.
 * - Admin sees all courses and all departments.
 * - HOD is scoped to their own department (both for courses and department-level attendance).
 */
function getAttendanceAnalytics(req, res) {
  try {
    const { role, department_id } = req.user;
    const isHod = role === 'hod';
    const deptId = isHod ? department_id : null;

    // 1. Course-level attendance query
    const courseWhere = isHod ? 'WHERE c.department_id = ?' : 'WHERE 1=1';
    const courseParams = isHod ? [deptId] : [];

    const courseQuery = `
      SELECT
        c.id, c.code, c.name, d.code as department_code, d.name as department_name,
        COUNT(a.id) as total_sessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_sessions,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_sessions
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN attendance a ON a.course_id = c.id
      ${courseWhere}
      GROUP BY c.id
      ORDER BY c.code ASC
    `;
    const courseRows = db.prepare(courseQuery).all(...courseParams);

    const byCourse = courseRows.map(c => {
      const total = Number(c.total_sessions);
      const present = Number(c.present_sessions);
      const late = Number(c.late_sessions);
      const rate = calcAttendancePercentage(present, late, total);
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        department_code: c.department_code,
        department_name: c.department_name,
        total_sessions: total,
        present_sessions: present,
        late_sessions: late,
        attendance_rate: rate
      };
    });

    // 2. Department-level attendance query (scoped to HOD's own department or all for Admin)
    const deptWhere = isHod ? 'WHERE d.id = ?' : 'WHERE 1=1';
    const deptParams = isHod ? [deptId] : [];

    const deptQuery = `
      SELECT
        d.id, d.name, d.code,
        COUNT(a.id) as total_sessions,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_sessions,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_sessions
      FROM departments d
      LEFT JOIN courses c ON c.department_id = d.id
      LEFT JOIN attendance a ON a.course_id = c.id
      ${deptWhere}
      GROUP BY d.id
      ORDER BY d.code ASC
    `;
    const deptRows = db.prepare(deptQuery).all(...deptParams);

    const byDepartment = deptRows.map(d => {
      const total = Number(d.total_sessions);
      const present = Number(d.present_sessions);
      const late = Number(d.late_sessions);
      const rate = calcAttendancePercentage(present, late, total);
      return {
        id: d.id,
        name: d.name,
        code: d.code,
        total_sessions: total,
        present_sessions: present,
        late_sessions: late,
        attendance_rate: rate
      };
    });

    return res.status(200).json({
      success: true,
      role,
      department_id: deptId,
      byCourse,
      byDepartment
    });
  } catch (err) {
    console.error('Error in getAttendanceAnalytics:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance analytics.'
    });
  }
}

module.exports = {
  getComplaintAnalytics,
  getAttendanceAnalytics
};
