const crypto = require('crypto');
const os = require('os');
const db = require('../config/db');
const { getLocalDateString } = require('../utils/attendanceHelper');

// In-memory rate limiting map: `${sessionId}:${studentId}` -> Array of timestamp ms
const wrongCodeAttempts = new Map();

/**
 * Normalizes client IP by stripping ::ffff: prefix if present
 */
function normalizeIp(ip) {
  if (!ip) return '';
  let cleaned = String(ip).trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.replace('::ffff:', '');
  }
  return cleaned;
}

/**
 * Converts dotted-decimal IPv4 to unsigned 32-bit integer
 */
function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

/**
 * Checks if two IPv4 addresses share the same subnet given a netmask
 */
function isSameSubnet(ipA, ipB, netmask) {
  try {
    const a = ipToInt(ipA);
    const b = ipToInt(ipB);
    const mask = ipToInt(netmask);
    return (a & mask) === (b & mask);
  } catch {
    return false;
  }
}

/**
 * Validates if client IP is on the server's local network or loopback
 */
function isClientOnServerNetwork(rawClientIp) {
  const clientIp = normalizeIp(rawClientIp);
  if (!clientIp) return false;

  // Loopback addresses are always considered on-network
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') {
    return true;
  }

  // Must be valid IPv4
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clientIp)) {
    return false;
  }

  const interfaces = os.networkInterfaces();
  for (const ifaceName of Object.keys(interfaces)) {
    for (const iface of interfaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.netmask) {
        if (isSameSubnet(clientIp, iface.address, iface.netmask)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Retrieves the server's non-internal LAN IPv4 addresses
 */
function getServerLanInterfaces() {
  const interfaces = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        results.push({
          name,
          address: iface.address,
          netmask: iface.netmask
        });
      }
    }
  }

  const getScore = (ip) => {
    if (!ip) return 99;
    if (/^192\.168\./.test(ip)) return 1;
    if (/^10\./.test(ip)) return 2;
    const parts = ip.split('.').map(Number);
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return 3;
    return 4;
  };

  return results.sort((a, b) => getScore(a.address) - getScore(b.address));
}

/**
 * Calculates current time window and remaining seconds
 */
function getWindowInfo(intervalSeconds = 20) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowIndex = Math.floor(nowSeconds / intervalSeconds);
  const secondsRemaining = intervalSeconds - (nowSeconds % intervalSeconds);
  return { nowSeconds, windowIndex, secondsRemaining };
}

/**
 * Computes 6-digit HMAC-SHA256 code for a given secret and window index
 */
function computeCodeForWindow(secret, windowIndex) {
  const hmac = crypto.createHmac('sha256', secret).update(String(windowIndex)).digest('hex');
  const num = parseInt(hmac.slice(0, 8), 16) % 1000000;
  return String(num).padStart(6, '0');
}

/**
 * Wrong-code rate limit checker (max 5 wrong codes per student per session per minute)
 */
function isRateLimited(sessionId, studentId) {
  const key = `${sessionId}:${studentId}`;
  const now = Date.now();
  const attempts = (wrongCodeAttempts.get(key) || []).filter((t) => now - t < 60000);
  wrongCodeAttempts.set(key, attempts);
  return attempts.length >= 5;
}

/**
 * Records a wrong code attempt
 */
function recordWrongCode(sessionId, studentId) {
  const key = `${sessionId}:${studentId}`;
  const now = Date.now();
  const attempts = (wrongCodeAttempts.get(key) || []).filter((t) => now - t < 60000);
  attempts.push(now);
  wrongCodeAttempts.set(key, attempts);
}

/**
 * Lazily checks and auto-closes expired open sessions
 */
function checkAndAutoCloseExpiredSessions() {
  const nowIso = new Date().toISOString();
  const expired = db.prepare(`
    SELECT id FROM attendance_sessions WHERE status = 'open' AND ends_at <= ?
  `).all(nowIso);

  for (const session of expired) {
    try {
      closeSessionInternal(session.id);
    } catch (err) {
      console.error(`[LiveAttendance] Failed to auto-close session ${session.id}:`, err);
    }
  }
}

/**
 * Closes an attendance session, inserting absent for unmarked enrolled students
 * (except students with pending flagged check-ins). Idempotent.
 */
function closeSessionInternal(sessionId) {
  const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
  if (!session) return null;

  if (session.status !== 'closed') {
    const closed_at = new Date().toISOString();
    db.prepare("UPDATE attendance_sessions SET status = 'closed', closed_at = ? WHERE id = ?").run(closed_at, sessionId);
    session.status = 'closed';
    session.closed_at = closed_at;
  }

  // Fetch all active enrolled students for the course
  const enrolledStudents = db.prepare(`
    SELECT student_id FROM enrollments WHERE course_id = ? AND status = 'active'
  `).all(session.course_id);

  // Fetch student IDs who have a pending flagged check-in for this session
  const pendingCheckins = db.prepare(`
    SELECT student_id FROM attendance_checkins WHERE session_id = ? AND review = 'pending'
  `).all(sessionId);
  const pendingStudentIds = new Set(pendingCheckins.map((p) => p.student_id));

  const checkAttendance = db.prepare(`
    SELECT id FROM attendance WHERE student_id = ? AND course_id = ? AND date = ?
  `);
  const insertAbsent = db.prepare(`
    INSERT INTO attendance (student_id, course_id, date, status, marked_by, remarks)
    VALUES (?, ?, ?, 'absent', ?, 'Absent - Live session closed')
  `);

  for (const student of enrolledStudents) {
    // Pending flagged check-ins stay unmarked until faculty review
    if (pendingStudentIds.has(student.student_id)) {
      continue;
    }
    const existing = checkAttendance.get(student.student_id, session.course_id, session.date);
    if (!existing) {
      insertAbsent.run(student.student_id, session.course_id, session.date, session.faculty_id);
    }
  }

  return session;
}

module.exports = {
  normalizeIp,
  isSameSubnet,
  isClientOnServerNetwork,
  getServerLanInterfaces,
  getWindowInfo,
  computeCodeForWindow,
  isRateLimited,
  recordWrongCode,
  checkAndAutoCloseExpiredSessions,
  closeSessionInternal
};
