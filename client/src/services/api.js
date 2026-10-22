const API_BASE = typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  ? `http://${window.location.hostname}:5000/api`
  : '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('edusphere_token');

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If payload is FormData, let browser set Content-Type with multipart boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const isLoginEndpoint = endpoint.includes('/auth/login');
    const errorMsg = data.message || `Request failed with status ${response.status}`;

    if (response.status === 401) {
      if (!isLoginEndpoint) {
        // Authenticated request failed with 401 -> token expired or invalid
        localStorage.removeItem('edusphere_token');
        localStorage.removeItem('edusphere_user');
        window.dispatchEvent(new CustomEvent('edusphere:session-expired'));
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login?expired=1';
        }
      }
    }

    throw new Error(errorMsg);
  }

  return data;
}

export async function downloadFile(endpoint, defaultFilename = 'download') {
  const token = localStorage.getItem('edusphere_token');
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Download failed with status ${response.status}`);
  }

  let filename = defaultFilename;
  const disposition = response.headers.get('content-disposition');
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const authApi = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => apiRequest('/auth/me'),
  getDemoAccounts: () => apiRequest('/auth/demo-accounts'),
  getDemoLogins: () => apiRequest('/auth/demo-accounts'),
};

export const dashboardApi = {
  getSummary: () => apiRequest('/dashboard/summary'),
};

export const complaintApi = {
  createComplaint: (payload) =>
    apiRequest('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMyComplaints: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    const queryString = query.toString();
    return apiRequest(`/complaints/mine${queryString ? `?${queryString}` : ''}`);
  },
  getComplaintByTicket: (ticketNo) =>
    apiRequest(`/complaints/${ticketNo}`),
  getAssignedComplaints: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.escalated) query.append('escalated', 'true');
    if (params.search) query.append('search', params.search);
    const queryString = query.toString();
    return apiRequest(`/complaints/assigned${queryString ? `?${queryString}` : ''}`);
  },
  getManagedComplaintDetail: (ticketNo) =>
    apiRequest(`/complaints/manage/${ticketNo}`),
  updateComplaintStatus: (ticketNo, payload) =>
    apiRequest(`/complaints/manage/${ticketNo}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  runEscalation: () =>
    apiRequest('/complaints/escalation/run', {
      method: 'POST',
    }),
};

export const adminApi = {
  resetDemoData: () =>
    apiRequest('/admin/reset-demo', {
      method: 'POST',
    }),
  getUsers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role && params.role !== 'all') query.append('role', params.role);
    if (params.department_id && params.department_id !== 'all') query.append('department_id', params.department_id);
    if (params.semester && params.semester !== 'all') query.append('semester', params.semester);
    const qs = query.toString();
    return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  createStudent: (payload) =>
    apiRequest('/admin/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createFaculty: (payload) =>
    apiRequest('/admin/faculty', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resetStudentDevice: (studentId) =>
    apiRequest(`/admin/students/${studentId}/reset-device`, {
      method: 'POST',
    }),

  // Departments Management (Phase 12A)
  getDepartments: () => apiRequest('/admin/departments'),
  createDepartment: (payload) =>
    apiRequest('/admin/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createDepartmentHod: (departmentId, payload) =>
    apiRequest(`/admin/departments/${departmentId}/hod`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateDepartment: (departmentId, payload) =>
    apiRequest(`/admin/departments/${departmentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteDepartment: (departmentId) =>
    apiRequest(`/admin/departments/${departmentId}`, {
      method: 'DELETE',
    }),

  // Courses Management (Phase 12A)
  getCourses: (params = {}) => {
    const query = new URLSearchParams();
    if (params.department_id && params.department_id !== 'all') query.append('department_id', params.department_id);
    if (params.semester && params.semester !== 'all') query.append('semester', params.semester);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return apiRequest(`/admin/courses${qs ? `?${qs}` : ''}`);
  },
  createCourse: (payload) =>
    apiRequest('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCourse: (courseId, payload) =>
    apiRequest(`/admin/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCourse: (courseId) =>
    apiRequest(`/admin/courses/${courseId}`, {
      method: 'DELETE',
    }),

  // Rooms Management (Phase 12A)
  getRooms: () => apiRequest('/admin/rooms'),
  createRoom: (payload) =>
    apiRequest('/admin/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateRoom: (roomId, payload) =>
    apiRequest(`/admin/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteRoom: (roomId) =>
    apiRequest(`/admin/rooms/${roomId}`, {
      method: 'DELETE',
    }),
};

export const departmentsApi = {
  getAll: () => apiRequest('/departments'),
};

export const analyticsApi = {
  getComplaintAnalytics: () => apiRequest('/analytics/complaints'),
  getAttendanceAnalytics: () => apiRequest('/analytics/attendance'),
};

export const attendanceApi = {
  getCourses: () => apiRequest('/attendance/courses'),
  getSheet: (courseId, date) => {
    const query = new URLSearchParams({ course_id: courseId });
    if (date) query.append('date', date);
    return apiRequest(`/attendance/sheet?${query.toString()}`);
  },
  mark: (payload) =>
    apiRequest('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMine: () => apiRequest('/attendance/mine'),
  getDepartment: () => apiRequest('/attendance/department'),
};

export const marksApi = {
  getSheet: (courseId, examType) => {
    const query = new URLSearchParams({ course_id: courseId, exam_type: examType });
    return apiRequest(`/marks/sheet?${query.toString()}`);
  },
  save: (payload) =>
    apiRequest('/marks/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMine: () => apiRequest('/marks/mine'),
  getDepartment: () => apiRequest('/marks/department'),
};

export const noticesApi = {
  getAll: () => apiRequest('/notices'),
  create: (payload) =>
    apiRequest('/notices', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  delete: (id) =>
    apiRequest(`/notices/${id}`, {
      method: 'DELETE',
    }),
};

export const assignmentsApi = {
  // Faculty
  getFacultyAssignments: () => apiRequest('/assignments/faculty'),
  createAssignment: (formData) =>
    apiRequest('/assignments', {
      method: 'POST',
      body: formData,
    }),
  getAssignmentSubmissions: (id) => apiRequest(`/assignments/${id}/submissions`),
  gradeSubmission: (id, payload) =>
    apiRequest(`/assignments/submissions/${id}/grade`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAssignment: (id) =>
    apiRequest(`/assignments/${id}`, {
      method: 'DELETE',
    }),

  // Student
  getMyAssignments: () => apiRequest('/assignments/mine'),
  submitAssignment: (id, formData) =>
    apiRequest(`/assignments/${id}/submit`, {
      method: 'POST',
      body: formData,
    }),

  // Phase 8: Integrity & AI-likelihood
  runIntegrityCheck: (assignmentId) =>
    apiRequest(`/assignments/${assignmentId}/integrity/run`, {
      method: 'POST',
    }),
  getIntegrityResults: (assignmentId) =>
    apiRequest(`/assignments/${assignmentId}/integrity`),
  reviewIntegrity: (submissionId, payload) =>
    apiRequest(`/assignments/submissions/${submissionId}/integrity-review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Downloads
  downloadAttachment: (id, filename) =>
    downloadFile(`/assignments/${id}/attachment`, filename),
  downloadSubmission: (id, filename) =>
    downloadFile(`/assignments/submissions/${id}/file`, filename),
};

export const resourcesApi = {
  // Faculty
  create: (formData) =>
    apiRequest('/resources', {
      method: 'POST',
      body: formData,
    }),
  getFacultyResources: () =>
    apiRequest('/resources/faculty'),
  deleteResource: (id) =>
    apiRequest(`/resources/${id}`, {
      method: 'DELETE',
    }),

  // Student
  getMine: (params = {}) => {
    const qry = new URLSearchParams();
    if (params.search) qry.append('search', params.search);
    if (params.course_id) qry.append('course_id', params.course_id);
    if (params.category) qry.append('category', params.category);
    if (params.limit) qry.append('limit', params.limit);
    const qs = qry.toString();
    return apiRequest(`/resources/mine${qs ? `?${qs}` : ''}`);
  },

  // Authenticated file download (token blob)
  downloadResource: (id, filename) =>
    downloadFile(`/resources/${id}/download`, filename),

  // HOD & Admin Overview
  getOverview: () =>
    apiRequest('/resources/overview'),
};

export const timetableApi = {
  // Department timetable (HOD own dept, Admin all / filtered)
  getDepartmentTimetable: (deptId) => {
    const qs = deptId ? `?department_id=${deptId}` : '';
    return apiRequest(`/timetable/department${qs}`);
  },

  // Student schedule (enrolled courses)
  getStudentTimetable: () =>
    apiRequest('/timetable/mine'),

  // Faculty schedule (taught courses)
  getFacultyTimetable: () =>
    apiRequest('/timetable/faculty'),

  // Today's schedule + next class (students & faculty)
  getTodaySchedule: () =>
    apiRequest('/timetable/today'),

  // Slot Management (HOD & Admin)
  createSlot: (payload) =>
    apiRequest('/timetable', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSlot: (id, payload) =>
    apiRequest(`/timetable/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSlot: (id) =>
    apiRequest(`/timetable/${id}`, {
      method: 'DELETE',
    }),

  // Automatic Timetable Generation (Phase 12B)
  previewGenerateTimetable: (payload) =>
    apiRequest('/timetable/generate/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  applyGenerateTimetable: (payload) =>
    apiRequest('/timetable/generate/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const liveAttendanceApi = {
  // Faculty endpoints
  startSession: (payload) =>
    apiRequest('/attendance/live/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCode: (sessionId) =>
    apiRequest(`/attendance/live/${sessionId}/code`),

  getDetails: (sessionId) =>
    apiRequest(`/attendance/live/${sessionId}`),

  reviewCheckin: (sessionId, payload) =>
    apiRequest(`/attendance/live/${sessionId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  closeSession: (sessionId) =>
    apiRequest(`/attendance/live/${sessionId}/close`, {
      method: 'POST',
    }),

  getHistory: () =>
    apiRequest('/attendance/live/history'),

  getNetworkInfo: () =>
    apiRequest('/attendance/live/network-info'),

  // Student endpoints
  getStudentOpenSessions: () =>
    apiRequest('/attendance/live/open'),

  studentCheckin: (payload) =>
    apiRequest('/attendance/live/checkin', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};



