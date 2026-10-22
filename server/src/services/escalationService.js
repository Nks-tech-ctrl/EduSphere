const db = require('../config/db');

/**
 * Check all unresolved complaints and apply 3-day SLA escalation.
 * 
 * Rules:
 * 1. Assigned to 'hod' & unresolved for > 3 days:
 *    - set escalated = 1, escalated_at = now
 *    - reassign to assigned_role = 'admin'
 *    - add timeline update: "Auto-escalated to Admin: no resolution within 3 days"
 * 2. Assigned to 'admin' & unresolved for > 3 days:
 *    - set escalated = 1, escalated_at = now
 *    - stays with admin
 *    - add timeline update: "Flagged overdue: unresolved for more than 3 days"
 */
function runEscalationCheck() {
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Find system administrator ID for the system log author
  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  const adminId = adminUser ? adminUser.id : 1;

  // Find unresolved complaints that haven't been escalated yet
  const unresolvedComplaints = db.prepare(`
    SELECT id, ticket_no, category, status, assigned_role, department_id, created_at, escalated
    FROM complaints
    WHERE status != 'resolved' AND escalated = 0
  `).all();

  let escalatedCount = 0;
  const escalatedTickets = [];

  const updateComplaintStmt = db.prepare(`
    UPDATE complaints
    SET escalated = 1,
        escalated_at = CURRENT_TIMESTAMP,
        assigned_role = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const insertUpdateStmt = db.prepare(`
    INSERT INTO complaint_updates (
      complaint_id, new_status, remark, updated_by, created_at
    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const processEscalations = db.transaction(() => {
    for (const c of unresolvedComplaints) {
      if (!c.created_at) continue;

      const createdTime = new Date(c.created_at).getTime();
      const ageMs = now - createdTime;

      if (ageMs >= THREE_DAYS_MS) {
        if (c.assigned_role === 'hod') {
          // Rule 1: Reassign to Admin
          updateComplaintStmt.run('admin', c.id);
          insertUpdateStmt.run(
            c.id,
            c.status,
            'Auto-escalated to Admin: no resolution within 3 days',
            adminId
          );
          escalatedCount++;
          escalatedTickets.push({ ticket_no: c.ticket_no, type: 'reassigned_to_admin' });
        } else if (c.assigned_role === 'admin') {
          // Rule 2: Flag overdue with Admin
          updateComplaintStmt.run('admin', c.id);
          insertUpdateStmt.run(
            c.id,
            c.status,
            'Flagged overdue: unresolved for more than 3 days',
            adminId
          );
          escalatedCount++;
          escalatedTickets.push({ ticket_no: c.ticket_no, type: 'flagged_overdue' });
        }
      }
    }
  });

  processEscalations();

  if (escalatedCount > 0) {
    console.log(`[Edusphere Escalation Engine] Escalated ${escalatedCount} overdue complaints:`, escalatedTickets.map(t => t.ticket_no).join(', '));
  } else {
    console.log('[Edusphere Escalation Engine] Routine check complete. No new complaints required escalation.');
  }

  return {
    success: true,
    escalatedCount,
    escalatedTickets
  };
}

/**
 * Start the background escalation scheduler.
 * Runs on startup and hourly timer ONLY if process.env.AUTO_ESCALATION === 'true'.
 * This keeps demo data un-escalated until the user clicks the live Admin button.
 */
function startEscalationScheduler() {
  const autoEscalation = process.env.AUTO_ESCALATION === 'true';

  if (!autoEscalation) {
    console.log('[Edusphere Escalation Engine] AUTO_ESCALATION is disabled in environment. Auto-scheduler skipped (on-demand Admin trigger active).');
    return;
  }

  console.log('[Edusphere Escalation Engine] Starting background SLA monitor (interval: 1 hour)...');
  // Initial run on startup
  try {
    runEscalationCheck();
  } catch (err) {
    console.error('[Edusphere Escalation Engine] Startup check error:', err);
  }

  // Hourly recurring check
  setInterval(() => {
    try {
      runEscalationCheck();
    } catch (err) {
      console.error('[Edusphere Escalation Engine] Hourly scheduled check error:', err);
    }
  }, 60 * 60 * 1000);
}

module.exports = {
  runEscalationCheck,
  startEscalationScheduler
};
