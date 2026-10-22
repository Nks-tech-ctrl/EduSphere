/**
 * Reusable helper to mask student identity for anonymous complaints.
 * Can be used by both Student endpoints and future Phase 3 HOD/Admin endpoints.
 *
 * @param {Object} complaint - The complaint record
 * @param {Array} timeline - Array of complaint_updates records
 * @param {number|string} currentUserId - The ID of the currently authenticated user
 * @returns {{ complaint: Object, timeline: Array }} Anonymized complaint and timeline
 */
function maskComplaintForUser(complaint, timeline = [], currentUserId) {
  if (!complaint) return { complaint, timeline };

  const isOwner = Number(complaint.submitted_by) === Number(currentUserId);
  const isAnonymous = Boolean(complaint.is_anonymous);

  // Deep copy to prevent mutating cached db objects
  const maskedComplaint = { ...complaint };
  const maskedTimeline = timeline.map((entry) => ({ ...entry }));

  if (isAnonymous && !isOwner) {
    // Mask student submitter details on the complaint
    maskedComplaint.submitted_by_name = 'Anonymous';
    maskedComplaint.submitter_name = 'Anonymous';
    maskedComplaint.submitter_email = null;
    maskedComplaint.submitter_phone = null;
    maskedComplaint.submitter_avatar = null;

    // Mask student details in timeline updates where the student was the author
    maskedTimeline.forEach((update) => {
      if (Number(update.updated_by) === Number(complaint.submitted_by)) {
        update.updater_name = 'Anonymous';
        update.updated_by_name = 'Anonymous';
        update.updater_email = null;
        update.updater_avatar = null;
        update.updater_role = 'student';
      }
    });
  }

  return {
    complaint: maskedComplaint,
    timeline: maskedTimeline,
  };
}

module.exports = {
  maskComplaintForUser,
};
