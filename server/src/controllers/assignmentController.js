const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const {
  UPLOADS_DIR,
  deleteFileIfExists,
  extractTextFromFile,
  sanitizeFilename
} = require('../utils/fileUpload');
const {
  computePairSimilarity,
  classifyRisk,
  computeAiLikelihood
} = require('../services/integrityService');

/**
 * Format Date in local server time format YYYY-MM-DD HH:mm:ss
 */
function getLocalTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

/**
 * Compare due date with server's local time
 */
function isDatePassedLocal(dueDateStr) {
  if (!dueDateStr) return false;
  const now = new Date();
  const due = new Date(dueDateStr);
  return now.getTime() > due.getTime();
}

/**
 * POST /api/assignments
 * Faculty creates an assignment for their own course.
 * Multer single('attachment')
 */
async function createAssignment(req, res) {
  const uploadedFile = req.file;

  try {
    const facultyId = req.user.id;
    const { course_id, title, description, due_date, max_score } = req.body;

    // Validation
    if (!course_id) {
      if (uploadedFile) deleteFileIfExists(uploadedFile.path);
      return res.status(400).json({ success: false, message: 'Course selection is required.' });
    }

    const courseId = Number(course_id);
    const course = db.prepare('SELECT id, faculty_id, name, code FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      if (uploadedFile) deleteFileIfExists(uploadedFile.path);
      return res.status(404).json({ success: false, message: 'Selected course not found.' });
    }

    // Must be own course
    if (course.faculty_id !== facultyId && req.user.role !== 'admin') {
      if (uploadedFile) deleteFileIfExists(uploadedFile.path);
      return res.status(403).json({ success: false, message: 'You can only create assignments for your own assigned courses.' });
    }

    if (!title || title.trim().length < 2) {
      if (uploadedFile) deleteFileIfExists(uploadedFile.path);
      return res.status(400).json({ success: false, message: 'Assignment title is required (min 2 characters).' });
    }

    if (!due_date || isNaN(new Date(due_date).getTime())) {
      if (uploadedFile) deleteFileIfExists(uploadedFile.path);
      return res.status(400).json({ success: false, message: 'A valid due date is required.' });
    }

    const maxScoreVal = max_score !== undefined && max_score !== '' ? Number(max_score) : 100;
    if (isNaN(maxScoreVal) || maxScoreVal <= 0) {
      if (uploadedFile) deleteFileIfExists(uploadedFile.path);
      return res.status(400).json({ success: false, message: 'Maximum score must be a positive number.' });
    }

    const attachmentPath = uploadedFile ? uploadedFile.filename : null;
    const attachmentName = uploadedFile ? uploadedFile.originalname : null;

    const stmt = db.prepare(`
      INSERT INTO assignments (
        course_id, title, description, due_date, max_score,
        attachment_path, attachment_name, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      courseId,
      title.trim(),
      description ? description.trim() : null,
      due_date,
      maxScoreVal,
      attachmentPath,
      attachmentName,
      facultyId,
      getLocalTimestamp()
    );

    const assignmentId = result.lastInsertRowid;
    const created = db.prepare(`
      SELECT a.id, a.course_id, a.title, a.description, a.due_date, a.max_score,
             a.attachment_name, a.created_at, c.code as course_code, c.name as course_name
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ?
    `).get(assignmentId);

    return res.status(201).json({
      success: true,
      message: `Assignment "${title.trim()}" created successfully.`,
      assignment: created
    });
  } catch (err) {
    if (uploadedFile) deleteFileIfExists(uploadedFile.path);
    console.error('Error in createAssignment:', err);
    return res.status(500).json({ success: false, message: 'Failed to create assignment: ' + err.message });
  }
}

/**
 * GET /api/assignments/faculty
 * List assignments for courses taught by the logged-in faculty
 */
function getFacultyAssignments(req, res) {
  try {
    const facultyId = req.user.id;

    const assignments = db.prepare(`
      SELECT
        a.id,
        a.course_id,
        a.title,
        a.description,
        a.due_date,
        a.max_score,
        a.attachment_name,
        a.created_at,
        c.code as course_code,
        c.name as course_name,
        d.code as department_code,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = a.course_id AND e.status = 'active') as total_enrolled,
        (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submitted_count,
        (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.score IS NOT NULL) as graded_count
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      WHERE c.faculty_id = ?
      ORDER BY a.id DESC
    `).all(facultyId);

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (err) {
    console.error('Error in getFacultyAssignments:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve faculty assignments.' });
  }
}

/**
 * GET /api/assignments/:id/submissions
 * Enrolled students roster with submission status, link, and score for a given assignment
 */
function getAssignmentSubmissions(req, res) {
  try {
    const assignmentId = Number(req.params.id);
    const assignment = db.prepare(`
      SELECT a.*, c.faculty_id, c.department_id, c.code as course_code, c.name as course_name
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ?
    `).get(assignmentId);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // Permission check: only faculty who teaches course, department HOD, or Admin
    const isOwner = req.user.role === 'faculty' && assignment.faculty_id === req.user.id;
    const isDeptHod = req.user.role === 'hod' && req.user.department_id === assignment.department_id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isDeptHod && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view submissions for this course.' });
    }

    // Get all enrolled students for this course with their submission info
    // Never return extracted_text!
    const submissions = db.prepare(`
      SELECT
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        u.avatar_url,
        s.id as submission_id,
        s.file_name,
        s.note,
        s.submitted_at,
        s.is_late,
        s.score,
        s.feedback,
        s.graded_at,
        grader.name as graded_by_name,
        CASE
          WHEN s.id IS NULL THEN 'Not submitted'
          WHEN s.is_late = 1 THEN 'Late'
          ELSE 'Submitted'
        END as status
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN submissions s ON s.assignment_id = ? AND s.student_id = u.id
      LEFT JOIN users grader ON s.graded_by = grader.id
      WHERE e.course_id = ? AND e.status = 'active'
      ORDER BY u.name ASC
    `).all(assignmentId, assignment.course_id);

    return res.status(200).json({
      success: true,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        due_date: assignment.due_date,
        max_score: assignment.max_score,
        attachment_name: assignment.attachment_name,
        course_code: assignment.course_code,
        course_name: assignment.course_name
      },
      count: submissions.length,
      submissions
    });
  } catch (err) {
    console.error('Error in getAssignmentSubmissions:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assignment submissions.' });
  }
}

/**
 * PATCH /api/assignments/submissions/:id/grade
 * Grade a student submission (score 0 to max_score, feedback)
 * Restricted to course faculty
 */
function gradeSubmission(req, res) {
  try {
    const submissionId = Number(req.params.id);
    const { score, feedback } = req.body;

    const submission = db.prepare(`
      SELECT s.id, s.assignment_id, s.student_id, a.max_score, a.course_id, c.faculty_id
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE s.id = ?
    `).get(submissionId);

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    if (req.user.role !== 'admin' && submission.faculty_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only grade submissions for your own courses.' });
    }

    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > submission.max_score) {
      return res.status(400).json({
        success: false,
        message: `Score must be a number between 0 and maximum possible score (${submission.max_score}).`
      });
    }

    const gradedTimestamp = getLocalTimestamp();

    db.prepare(`
      UPDATE submissions
      SET score = ?,
          feedback = ?,
          graded_by = ?,
          graded_at = ?
      WHERE id = ?
    `).run(numScore, feedback ? feedback.trim() : null, req.user.id, gradedTimestamp, submissionId);

    const updated = db.prepare(`
      SELECT s.id, s.assignment_id, s.student_id, s.score, s.feedback, s.graded_at,
             u.name as student_name, g.name as graded_by_name
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      LEFT JOIN users g ON s.graded_by = g.id
      WHERE s.id = ?
    `).get(submissionId);

    return res.status(200).json({
      success: true,
      message: 'Submission graded successfully.',
      submission: updated
    });
  } catch (err) {
    console.error('Error in gradeSubmission:', err);
    return res.status(500).json({ success: false, message: 'Failed to grade submission.' });
  }
}

/**
 * DELETE /api/assignments/:id
 * Delete assignment and remove files from disk
 */
function deleteAssignment(req, res) {
  try {
    const assignmentId = Number(req.params.id);
    const assignment = db.prepare(`
      SELECT a.*, c.faculty_id
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ?
    `).get(assignmentId);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (req.user.role !== 'admin' && assignment.faculty_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own assignments.' });
    }

    // Get all submission files to clean up
    const submissions = db.prepare('SELECT file_path FROM submissions WHERE assignment_id = ?').all(assignmentId);

    // Delete submission files
    submissions.forEach((s) => {
      if (s.file_path) deleteFileIfExists(s.file_path);
    });

    // Delete assignment attachment file
    if (assignment.attachment_path) {
      deleteFileIfExists(assignment.attachment_path);
    }

    // Delete from database (cascades submissions)
    db.prepare('DELETE FROM assignments WHERE id = ?').run(assignmentId);

    return res.status(200).json({
      success: true,
      message: `Assignment "${assignment.title}" and associated submission files deleted.`
    });
  } catch (err) {
    console.error('Error in deleteAssignment:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete assignment.' });
  }
}

/**
 * GET /api/assignments/mine
 * Student view: assignments for enrolled courses with status and countdown
 */
function getStudentAssignments(req, res) {
  try {
    const studentId = req.user.id;

    // Get assignments for enrolled courses with student submission
    // Exclude extracted_text!
    const rows = db.prepare(`
      SELECT
        a.id,
        a.course_id,
        a.title,
        a.description,
        a.due_date,
        a.max_score,
        a.attachment_name,
        CASE WHEN a.attachment_path IS NOT NULL THEN 1 ELSE 0 END as has_attachment,
        a.created_at,
        c.code as course_code,
        c.name as course_name,
        u.name as faculty_name,
        s.id as submission_id,
        s.file_name,
        s.note,
        s.submitted_at,
        s.is_late,
        s.score,
        s.feedback,
        s.graded_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN assignments a ON a.course_id = c.id
      LEFT JOIN users u ON c.faculty_id = u.id
      LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
      WHERE e.student_id = ? AND e.status = 'active'
      ORDER BY a.due_date ASC
    `).all(studentId, studentId);

    // Compute status in local time
    const assignments = rows.map((r) => {
      let status = 'Pending';
      const isOverdue = isDatePassedLocal(r.due_date);

      if (r.submission_id) {
        if (r.score !== null && r.score !== undefined) {
          status = 'Graded';
        } else if (r.is_late === 1) {
          status = 'Late';
        } else {
          status = 'Submitted';
        }
      } else {
        if (isOverdue) {
          status = 'Overdue';
        } else {
          status = 'Pending';
        }
      }

      return {
        id: r.id,
        course_id: r.course_id,
        title: r.title,
        description: r.description,
        due_date: r.due_date,
        max_score: r.max_score,
        attachment_name: r.attachment_name,
        has_attachment: Boolean(r.has_attachment),
        created_at: r.created_at,
        course_code: r.course_code,
        course_name: r.course_name,
        faculty_name: r.faculty_name,
        status,
        is_overdue: isOverdue,
        submission: r.submission_id
          ? {
              id: r.submission_id,
              file_name: r.file_name,
              note: r.note,
              submitted_at: r.submitted_at,
              is_late: Boolean(r.is_late),
              score: r.score,
              feedback: r.feedback,
              graded_at: r.graded_at
            }
          : null
      };
    });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (err) {
    console.error('Error in getStudentAssignments:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assignments.' });
  }
}

/**
 * POST /api/assignments/:id/submit
 * Student uploads a submission. File upload + optional note.
 * Re-submission before grading replaces old file (deletes old file from disk).
 * Blocked once graded.
 */
async function submitAssignment(req, res) {
  const uploadedFile = req.file;

  try {
    const studentId = req.user.id;
    const assignmentId = Number(req.params.id);
    const { note } = req.body;

    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'Submission file is required.' });
    }

    const assignment = db.prepare(`
      SELECT a.*, c.code as course_code
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ?
    `).get(assignmentId);

    if (!assignment) {
      deleteFileIfExists(uploadedFile.path);
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // Verify enrollment
    const enrollment = db.prepare(`
      SELECT id FROM enrollments
      WHERE student_id = ? AND course_id = ? AND status = 'active'
    `).get(studentId, assignment.course_id);

    if (!enrollment) {
      deleteFileIfExists(uploadedFile.path);
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course.' });
    }

    // Check existing submission
    const existing = db.prepare(`
      SELECT id, file_path, score
      FROM submissions
      WHERE assignment_id = ? AND student_id = ?
    `).get(assignmentId, studentId);

    if (existing && existing.score !== null && existing.score !== undefined) {
      deleteFileIfExists(uploadedFile.path);
      return res.status(400).json({
        success: false,
        message: 'Cannot re-submit: this assignment has already been evaluated and graded.'
      });
    }

    // Local time calculation for is_late
    const isLate = isDatePassedLocal(assignment.due_date) ? 1 : 0;
    const submittedTimestamp = getLocalTimestamp();

    // Extract text safely from uploaded file (first 50,000 characters)
    const extractedText = await extractTextFromFile(uploadedFile.filename, uploadedFile.originalname);

    if (existing) {
      // Replace old file: delete old file from disk
      deleteFileIfExists(existing.file_path);

      db.prepare(`
        UPDATE submissions
        SET file_path = ?,
            file_name = ?,
            note = ?,
            submitted_at = ?,
            is_late = ?,
            extracted_text = ?
        WHERE id = ?
      `).run(
        uploadedFile.filename,
        uploadedFile.originalname,
        note ? note.trim() : null,
        submittedTimestamp,
        isLate,
        extractedText,
        existing.id
      );

      return res.status(200).json({
        success: true,
        message: isLate
          ? 'Assignment resubmitted successfully (marked Late).'
          : 'Assignment resubmitted successfully.',
        submission: {
          id: existing.id,
          assignment_id: assignmentId,
          file_name: uploadedFile.originalname,
          note: note ? note.trim() : null,
          submitted_at: submittedTimestamp,
          is_late: Boolean(isLate),
          score: null,
          feedback: null
        }
      });
    } else {
      // Insert new submission
      const insertStmt = db.prepare(`
        INSERT INTO submissions (
          assignment_id, student_id, file_path, file_name,
          note, submitted_at, is_late, extracted_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(
        assignmentId,
        studentId,
        uploadedFile.filename,
        uploadedFile.originalname,
        note ? note.trim() : null,
        submittedTimestamp,
        isLate,
        extractedText
      );

      return res.status(201).json({
        success: true,
        message: isLate
          ? 'Assignment submitted successfully (marked Late).'
          : 'Assignment submitted successfully.',
        submission: {
          id: result.lastInsertRowid,
          assignment_id: assignmentId,
          file_name: uploadedFile.originalname,
          note: note ? note.trim() : null,
          submitted_at: submittedTimestamp,
          is_late: Boolean(isLate),
          score: null,
          feedback: null
        }
      });
    }
  } catch (err) {
    if (uploadedFile) deleteFileIfExists(uploadedFile.path);
    console.error('Error in submitAssignment:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit assignment: ' + err.message });
  }
}

/**
 * GET /api/assignments/:id/attachment
 * Download assignment brief attachment file
 * Authorized for enrolled students, faculty, department HOD, or Admin
 */
function downloadAssignmentAttachment(req, res) {
  try {
    const assignmentId = Number(req.params.id);
    const assignment = db.prepare(`
      SELECT a.attachment_path, a.attachment_name, a.course_id, c.faculty_id, c.department_id
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ?
    `).get(assignmentId);

    if (!assignment || !assignment.attachment_path) {
      return res.status(404).json({ success: false, message: 'Attachment not found for this assignment.' });
    }

    const { role, id: userId, department_id: deptId } = req.user;

    let allowed = false;
    if (role === 'admin') allowed = true;
    if (role === 'hod' && deptId === assignment.department_id) allowed = true;
    if (role === 'faculty' && assignment.faculty_id === userId) allowed = true;
    if (role === 'student') {
      const isEnrolled = db.prepare(`
        SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ? AND status = 'active'
      `).get(userId, assignment.course_id);
      if (isEnrolled) allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Access denied to this assignment attachment.' });
    }

    // Build path ONLY from stored generated filename inside server/uploads
    const filenameOnDisk = path.basename(assignment.attachment_path);
    const fullPath = path.join(UPLOADS_DIR, filenameOnDisk);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'Attachment file is missing from server storage.' });
    }

    const safeOriginalName = sanitizeFilename(assignment.attachment_name || 'assignment_attachment');
    res.setHeader('Content-Disposition', `attachment; filename="${safeOriginalName}"`);
    return res.sendFile(fullPath);
  } catch (err) {
    console.error('Error downloading attachment:', err);
    return res.status(500).json({ success: false, message: 'Failed to download attachment.' });
  }
}

/**
 * GET /api/assignments/submissions/:id/file
 * Download student submission file
 * Authorized for submitting student, course faculty, department HOD, or Admin
 */
function downloadSubmissionFile(req, res) {
  try {
    const submissionId = Number(req.params.id);
    const submission = db.prepare(`
      SELECT s.file_path, s.file_name, s.student_id, a.course_id, c.faculty_id, c.department_id
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE s.id = ?
    `).get(submissionId);

    if (!submission || !submission.file_path) {
      return res.status(404).json({ success: false, message: 'Submission file not found.' });
    }

    const { role, id: userId, department_id: deptId } = req.user;

    let allowed = false;
    if (role === 'admin') allowed = true;
    if (role === 'hod' && deptId === submission.department_id) allowed = true;
    if (role === 'faculty' && submission.faculty_id === userId) allowed = true;
    if (role === 'student' && submission.student_id === userId) allowed = true;

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Access denied: you can only download your own submissions.' });
    }

    // Build path ONLY from stored generated filename inside server/uploads
    const filenameOnDisk = path.basename(submission.file_path);
    const fullPath = path.join(UPLOADS_DIR, filenameOnDisk);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'Submission file is missing from server storage.' });
    }

    const safeOriginalName = sanitizeFilename(submission.file_name || 'submission_file');
    res.setHeader('Content-Disposition', `attachment; filename="${safeOriginalName}"`);
    return res.sendFile(fullPath);
  } catch (err) {
    console.error('Error downloading submission file:', err);
    return res.status(500).json({ success: false, message: 'Failed to download submission file.' });
  }
}

/**
 * POST /api/assignments/:id/integrity/run
 * Faculty (own course only, 403 otherwise):
 * Compare every pair of checkable submissions for the assignment.
 * Normalise text, compute similarity from word 5-gram shingles (Jaccard) + cosine similarity on word frequencies.
 * Deletes old pairs for this assignment and re-inserts inside a transaction.
 */
function runAssignmentIntegrityCheck(req, res) {
  try {
    const assignmentId = Number(req.params.id);
    const assignment = db.prepare(`
      SELECT a.id, a.title, a.description, a.course_id, c.faculty_id
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ?
    `).get(assignmentId);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // Faculty, own course only! (403 otherwise)
    if (req.user.role !== 'faculty' || assignment.faculty_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: only the assigned faculty member for this course can run integrity checks.'
      });
    }

    // Fetch all submissions for this assignment
    const submissions = db.prepare(`
      SELECT id, student_id, file_name, extracted_text, submitted_at
      FROM submissions
      WHERE assignment_id = ?
    `).all(assignmentId);

    // Identify checkable submissions (must have non-empty extracted_text)
    const checkableSubmissions = submissions.filter(
      (s) => s.extracted_text && typeof s.extracted_text === 'string' && s.extracted_text.trim().length > 0
    );

    const notCheckableCount = submissions.length - checkableSubmissions.length;
    const computedPairs = [];

    // Compare every pair of checkable submissions
    for (let i = 0; i < checkableSubmissions.length; i++) {
      for (let j = i + 1; j < checkableSubmissions.length; j++) {
        const subA = checkableSubmissions[i];
        const subB = checkableSubmissions[j];

        const pairResult = computePairSimilarity(
          subA.extracted_text,
          subB.extracted_text,
          assignment.title,
          assignment.description
        );

        computedPairs.push({
          submission_a_id: subA.id,
          submission_b_id: subB.id,
          similarity_score: pairResult.similarity_score,
          jaccard_score: pairResult.jaccard_score,
          cosine_score: pairResult.cosine_score,
          matched_passages: JSON.stringify(pairResult.matched_passages)
        });
      }
    }

    // Inside transaction: DELETE existing integrity_pairs for this assignment, then re-insert
    const savePairsTx = db.transaction(() => {
      db.prepare('DELETE FROM integrity_pairs WHERE assignment_id = ?').run(assignmentId);

      const insertStmt = db.prepare(`
        INSERT INTO integrity_pairs (
          assignment_id, submission_a_id, submission_b_id,
          similarity_score, jaccard_score, cosine_score, matched_passages
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const pair of computedPairs) {
        insertStmt.run(
          assignmentId,
          pair.submission_a_id,
          pair.submission_b_id,
          pair.similarity_score,
          pair.jaccard_score,
          pair.cosine_score,
          pair.matched_passages
        );
      }
    });

    savePairsTx();

    return res.status(200).json({
      success: true,
      message: `Integrity check completed: ${computedPairs.length} submission pair${computedPairs.length === 1 ? '' : 's'} compared.`,
      pairs_compared: computedPairs.length,
      checkable_count: checkableSubmissions.length,
      not_checkable_count: notCheckableCount,
      total_submissions: submissions.length
    });
  } catch (err) {
    console.error('Error in runAssignmentIntegrityCheck:', err);
    return res.status(500).json({ success: false, message: 'Failed to run assignment integrity check: ' + err.message });
  }
}

/**
 * GET /api/assignments/:id/integrity
 * Faculty (own course): per-student maximum similarity, matched peer's name, matching passages, AI estimate, review state.
 * Admin: read-only summary counts with NO student names.
 * All others: 403 Forbidden.
 */
function getAssignmentIntegrity(req, res) {
  try {
    const assignmentId = Number(req.params.id);
    const assignment = db.prepare(`
      SELECT a.id, a.title, a.description, a.course_id, c.faculty_id
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ?
    `).get(assignmentId);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    const isCourseFaculty = req.user.role === 'faculty' && assignment.faculty_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Privacy & security: Only course faculty gets student data; Admin gets read-only counts; All others get 403
    if (!isCourseFaculty && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: only the assigned course faculty or administrator can access integrity data.'
      });
    }

    // Check last run timestamp and pairs count
    const lastRunRow = db.prepare(`
      SELECT MAX(created_at) as last_run_at, COUNT(*) as pairs_count
      FROM integrity_pairs
      WHERE assignment_id = ?
    `).get(assignmentId);

    const lastRunAt = lastRunRow ? lastRunRow.last_run_at : null;
    const pairsComparedCount = lastRunRow ? Number(lastRunRow.pairs_count) : 0;

    // Check if results are outdated (if any submission was submitted/updated after last_run_at)
    let isOutdated = false;
    if (lastRunAt) {
      const newerSub = db.prepare(`
        SELECT COUNT(*) as newer_count
        FROM submissions
        WHERE assignment_id = ? AND submitted_at > ?
      `).get(assignmentId, lastRunAt);
      if (newerSub && newerSub.newer_count > 0) {
        isOutdated = true;
      }
    }

    // Fetch enrolled students and their submissions
    const submissions = db.prepare(`
      SELECT
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        u.avatar_url,
        s.id as submission_id,
        s.file_name,
        s.submitted_at,
        s.is_late,
        s.score,
        s.extracted_text,
        s.integrity_status,
        s.integrity_note,
        s.integrity_reviewed_at,
        rev.name as integrity_reviewed_by_name
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      LEFT JOIN submissions s ON s.assignment_id = ? AND s.student_id = u.id
      LEFT JOIN users rev ON s.integrity_reviewed_by = rev.id
      WHERE e.course_id = ? AND e.status = 'active'
      ORDER BY u.name ASC
    `).all(assignmentId, assignment.course_id);

    // Fetch all stored pairs for this assignment
    const pairs = db.prepare(`
      SELECT *
      FROM integrity_pairs
      WHERE assignment_id = ?
    `).all(assignmentId);

    // Map submission_id -> list of related pairs
    const submissionPairsMap = new Map();
    for (const p of pairs) {
      if (!submissionPairsMap.has(p.submission_a_id)) {
        submissionPairsMap.set(p.submission_a_id, []);
      }
      submissionPairsMap.get(p.submission_a_id).push({
        peer_submission_id: p.submission_b_id,
        similarity_score: p.similarity_score,
        jaccard_score: p.jaccard_score,
        cosine_score: p.cosine_score,
        matched_passages: p.matched_passages
      });

      if (!submissionPairsMap.has(p.submission_b_id)) {
        submissionPairsMap.set(p.submission_b_id, []);
      }
      submissionPairsMap.get(p.submission_b_id).push({
        peer_submission_id: p.submission_a_id,
        similarity_score: p.similarity_score,
        jaccard_score: p.jaccard_score,
        cosine_score: p.cosine_score,
        matched_passages: p.matched_passages
      });
    }

    // Map student name lookup by submission_id
    const submissionStudentMap = new Map();
    for (const sub of submissions) {
      if (sub.submission_id) {
        submissionStudentMap.set(sub.submission_id, sub.student_name);
      }
    }

    let checkedCount = 0;
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let notCheckableCount = 0;
    let totalSubmissions = 0;

    const studentResults = [];

    for (const sub of submissions) {
      if (!sub.submission_id) {
        continue; // Student hasn't submitted yet
      }

      totalSubmissions++;

      const isCheckable = Boolean(
        sub.extracted_text && typeof sub.extracted_text === 'string' && sub.extracted_text.trim().length > 0
      );

      if (!isCheckable) {
        notCheckableCount++;
        studentResults.push({
          student_id: sub.student_id,
          student_name: sub.student_name,
          student_email: sub.student_email,
          avatar_url: sub.avatar_url,
          submission_id: sub.submission_id,
          file_name: sub.file_name,
          submitted_at: sub.submitted_at,
          is_late: sub.is_late,
          is_checkable: false,
          max_similarity: null,
          risk_level: 'Not checkable',
          matched_student_name: null,
          matched_submission_id: null,
          matched_passages: [],
          ai_likelihood: {
            score: null,
            label: 'Not checkable',
            is_short: true,
            disclaimer: 'AI detection is not reliable. Use this only as a hint and review the work yourself.'
          },
          integrity_status: sub.integrity_status || null,
          integrity_note: sub.integrity_note || null,
          integrity_reviewed_by_name: sub.integrity_reviewed_by_name || null,
          integrity_reviewed_at: sub.integrity_reviewed_at || null
        });
        continue;
      }

      // Checkable submission
      checkedCount++;
      const relatedPairs = submissionPairsMap.get(sub.submission_id) || [];
      relatedPairs.sort((a, b) => b.similarity_score - a.similarity_score);

      const topPair = relatedPairs[0] || null;
      const maxSimilarity = topPair ? topPair.similarity_score : 0;
      const riskLevel = topPair ? classifyRisk(maxSimilarity) : (pairsComparedCount > 0 ? 'Low' : 'Not analyzed');

      if (riskLevel === 'High') highRiskCount++;
      else if (riskLevel === 'Medium') mediumRiskCount++;
      else if (riskLevel === 'Low') lowRiskCount++;

      const matchedPeerName = topPair ? submissionStudentMap.get(topPair.peer_submission_id) || 'Unknown Student' : null;
      let parsedPassages = [];
      if (topPair && topPair.matched_passages) {
        try {
          parsedPassages = JSON.parse(topPair.matched_passages);
        } catch (e) {
          parsedPassages = [];
        }
      }

      const aiLikelihood = computeAiLikelihood(sub.extracted_text);

      studentResults.push({
        student_id: sub.student_id,
        student_name: sub.student_name,
        student_email: sub.student_email,
        avatar_url: sub.avatar_url,
        submission_id: sub.submission_id,
        file_name: sub.file_name,
        submitted_at: sub.submitted_at,
        is_late: sub.is_late,
        is_checkable: true,
        max_similarity: topPair ? maxSimilarity : null,
        risk_level: riskLevel,
        matched_student_name: matchedPeerName,
        matched_submission_id: topPair ? topPair.peer_submission_id : null,
        matched_passages: parsedPassages,
        ai_likelihood: aiLikelihood,
        integrity_status: sub.integrity_status || null,
        integrity_note: sub.integrity_note || null,
        integrity_reviewed_by_name: sub.integrity_reviewed_by_name || null,
        integrity_reviewed_at: sub.integrity_reviewed_at || null
      });
    }

    const summary = {
      total_submissions: totalSubmissions,
      checked_count: checkedCount,
      high_risk_count: highRiskCount,
      medium_risk_count: mediumRiskCount,
      low_risk_count: lowRiskCount,
      not_checkable_count: notCheckableCount,
      pairs_compared_count: pairsComparedCount,
      last_run_at: lastRunAt,
      is_outdated: isOutdated
    };

    // If Admin, return read-only counts with NO student names or student records
    if (isAdmin) {
      return res.status(200).json({
        success: true,
        is_admin: true,
        summary
      });
    }

    // Faculty: full student integrity details
    return res.status(200).json({
      success: true,
      summary,
      results: studentResults
    });
  } catch (err) {
    console.error('Error in getAssignmentIntegrity:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve assignment integrity data.' });
  }
}

/**
 * PATCH /api/assignments/submissions/:id/integrity-review
 * Faculty (own course): status 'cleared' | 'needs_discussion' | 'flagged' and note.
 */
function reviewSubmissionIntegrity(req, res) {
  try {
    const submissionId = Number(req.params.id);
    const { status, note } = req.body;

    const validStatuses = ['cleared', 'needs_discussion', 'flagged'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Ownership check: submission -> assignment -> course
    const submission = db.prepare(`
      SELECT s.id, s.assignment_id, a.course_id, c.faculty_id
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE s.id = ?
    `).get(submissionId);

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    if (req.user.role !== 'faculty' || submission.faculty_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: only the assigned course faculty can review submission integrity.'
      });
    }

    const reviewedTimestamp = getLocalTimestamp();
    const cleanNote = note && typeof note === 'string' ? note.trim() : null;

    db.prepare(`
      UPDATE submissions
      SET integrity_status = ?,
          integrity_note = ?,
          integrity_reviewed_by = ?,
          integrity_reviewed_at = ?
      WHERE id = ?
    `).run(status, cleanNote, req.user.id, reviewedTimestamp, submissionId);

    return res.status(200).json({
      success: true,
      message: 'Integrity review recorded successfully.',
      review: {
        submission_id: submissionId,
        integrity_status: status,
        integrity_note: cleanNote,
        integrity_reviewed_by: req.user.id,
        integrity_reviewed_by_name: req.user.name,
        integrity_reviewed_at: reviewedTimestamp
      }
    });
  } catch (err) {
    console.error('Error in reviewSubmissionIntegrity:', err);
    return res.status(500).json({ success: false, message: 'Failed to update integrity review.' });
  }
}

module.exports = {
  createAssignment,
  getFacultyAssignments,
  getAssignmentSubmissions,
  gradeSubmission,
  deleteAssignment,
  getStudentAssignments,
  submitAssignment,
  downloadAssignmentAttachment,
  downloadSubmissionFile,
  runAssignmentIntegrityCheck,
  getAssignmentIntegrity,
  reviewSubmissionIntegrity
};

