const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');
const db = require('../config/db');
const seedDatabase = require('../db/seed');
const { JWT_SECRET } = require('../middleware/auth');
const timetableRoutes = require('../routes/timetableRoutes');

test.describe('Phase 12B: Timetable API Endpoints Suite', { concurrency: 1 }, () => {
  let app;
  let hodToken;
  let adminToken;
  let studentToken;

  test.before(() => {
    // Create Express test app
    app = express();
    app.use(express.json());
    app.use('/api/timetable', timetableRoutes);
  });

  test.beforeEach(() => {
    seedDatabase();

    const hodCse = db.prepare("SELECT id, email, role, department_id FROM users WHERE email = 'hod.cse@edusphere.edu'").get();
    const admin = db.prepare("SELECT id, email, role, department_id FROM users WHERE role = 'admin' LIMIT 1").get();
    const student = db.prepare("SELECT id, email, role, department_id FROM users WHERE role = 'student' LIMIT 1").get();

    hodToken = jwt.sign({ id: hodCse.id, email: hodCse.email, role: hodCse.role, department_id: hodCse.department_id }, JWT_SECRET);
    adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role, department_id: null }, JWT_SECRET);
    studentToken = jwt.sign({ id: student.id, email: student.email, role: student.role, department_id: student.department_id }, JWT_SECRET);
  });

  // Helper function to mock request/response through express routes
  function mockRequest(method, url, headers, body) {
    return new Promise((resolve) => {
      const req = {
        method,
        url,
        headers: headers || {},
        body: body || {},
        query: {}
      };

      const res = {
        statusCode: 200,
        headers: {},
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
          resolve(this);
          return this;
        },
        setHeader(k, v) {
          this.headers[k] = v;
        }
      };

      app.handle(req, res, () => {
        resolve(res);
      });
    });
  }

  test('Security: Admin and Student receive 403 Forbidden on generate endpoints', async () => {
    // Admin request
    const adminRes = await mockRequest(
      'POST',
      '/api/timetable/generate/preview',
      { authorization: `Bearer ${adminToken}` },
      { semesters: [3] }
    );
    assert.equal(adminRes.statusCode, 403, 'Admin should get 403 on timetable preview generation');

    // Student request
    const studentRes = await mockRequest(
      'POST',
      '/api/timetable/generate/preview',
      { authorization: `Bearer ${studentToken}` },
      { semesters: [3] }
    );
    assert.equal(studentRes.statusCode, 403, 'Student should get 403 on timetable preview generation');
  });

  test('POST /api/timetable/generate/preview returns proposal, unplaced and stats without saving', async () => {
    const slotsBefore = db.prepare('SELECT COUNT(*) AS cnt FROM timetable_slots').get().cnt;

    const res = await mockRequest(
      'POST',
      '/api/timetable/generate/preview',
      { authorization: `Bearer ${hodToken}` },
      {
        semesters: [3],
        working_days: [1, 2, 3, 4, 5],
        replace_existing: true,
        seed: 12345
      }
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.slots));
    assert.ok(Array.isArray(res.body.unplaced));
    assert.ok(res.body.stats);
    assert.equal(res.body.stats.placed_sessions, res.body.slots.length);

    // Verify nothing saved to database
    const slotsAfter = db.prepare('SELECT COUNT(*) AS cnt FROM timetable_slots').get().cnt;
    assert.equal(slotsBefore, slotsAfter, 'Preview generation must save nothing to database');
  });

  test('POST /api/timetable/generate/apply: Rejects invalid proposals and rolls back transaction', async () => {
    const cseDeptId = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get().id;
    // 1. Invalid room test
    const cseCourse = db.prepare('SELECT id FROM courses WHERE department_id = ? LIMIT 1').get(cseDeptId);
    const badProposal = [
      {
        course_id: cseCourse.id,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
        room: 'NON_EXISTENT_ROOM_XYZ',
        slot_type: 'lecture'
      }
    ];

    const res1 = await mockRequest(
      'POST',
      '/api/timetable/generate/apply',
      { authorization: `Bearer ${hodToken}` },
      {
        proposal: badProposal,
        semesters: [3],
        replace_existing: false
      }
    );

    assert.equal(res1.statusCode, 400);
    assert.equal(res1.body.success, false);
    assert.ok(res1.body.message.includes('does not exist'));

    // 2. Room type mismatch test (lab slot placed in lecture room)
    const lectureRoom = db.prepare("SELECT name FROM rooms WHERE room_type = 'lecture' LIMIT 1").get();
    const badTypeProposal = [
      {
        course_id: cseCourse.id,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '11:00',
        room: lectureRoom.name,
        slot_type: 'lab' // Mismatch!
      }
    ];

    const res2 = await mockRequest(
      'POST',
      '/api/timetable/generate/apply',
      { authorization: `Bearer ${hodToken}` },
      {
        proposal: badTypeProposal,
        semesters: [3],
        replace_existing: false
      }
    );

    assert.equal(res2.statusCode, 400);
    assert.equal(res2.body.success, false);
    assert.ok(res2.body.message.includes('Type mismatch'));

    // 3. Break overlap test
    const res3 = await mockRequest(
      'POST',
      '/api/timetable/generate/apply',
      { authorization: `Bearer ${hodToken}` },
      {
        proposal: [
          {
            course_id: cseCourse.id,
            day_of_week: 1,
            start_time: '13:00',
            end_time: '14:00', // Overlaps 13:15 - 14:00
            room: lectureRoom.name,
            slot_type: 'lecture'
          }
        ],
        semesters: [3],
        replace_existing: false
      }
    );

    assert.equal(res3.statusCode, 400);
    assert.equal(res3.body.success, false);
    assert.ok(res3.body.message.includes('overlaps break window'));
  });

  test('POST /api/timetable/generate/apply: Successfully applies proposal in one transaction and never affects other departments', async () => {
    const cseDeptId = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get().id;
    const eceDeptId = db.prepare("SELECT id FROM departments WHERE code = 'ECE'").get().id;

    // Count ECE slots before apply
    const eceSlotsBefore = db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      WHERE c.department_id = ?
    `).get(eceDeptId).cnt;
    assert.ok(eceSlotsBefore > 0, 'ECE slots should exist in seed data');

    // 1. Generate preview for CSE Semesters 3 & 4
    const previewRes = await mockRequest(
      'POST',
      '/api/timetable/generate/preview',
      { authorization: `Bearer ${hodToken}` },
      {
        semesters: [3, 4],
        working_days: [1, 2, 3, 4, 5],
        replace_existing: true,
        seed: 8888
      }
    );

    assert.equal(previewRes.statusCode, 200);
    const proposal = previewRes.body.slots;
    assert.ok(proposal.length > 0);

    // 2. Apply proposal
    const applyRes = await mockRequest(
      'POST',
      '/api/timetable/generate/apply',
      { authorization: `Bearer ${hodToken}` },
      {
        proposal,
        semesters: [3, 4],
        replace_existing: true
      }
    );

    assert.equal(applyRes.statusCode, 200);
    assert.equal(applyRes.body.success, true);
    assert.equal(applyRes.body.applied_count, proposal.length);

    // 3. Verify ECE slots were NEVER touched
    const eceSlotsAfter = db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      WHERE c.department_id = ?
    `).get(eceDeptId).cnt;
    assert.equal(eceSlotsBefore, eceSlotsAfter, 'Other departments timetable slots must NEVER be touched');

    // 4. Verify all applied slots are present in DB
    const cseSlotsCount = db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM timetable_slots s
      JOIN courses c ON s.course_id = c.id
      WHERE c.department_id = ?
    `).get(cseDeptId).cnt;
    assert.equal(cseSlotsCount, proposal.length);
  });
});
