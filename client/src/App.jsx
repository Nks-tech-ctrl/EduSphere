import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import NotFound from './pages/NotFound';

import Login from './pages/Login';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import HodDashboard from './pages/dashboards/HodDashboard';
import FacultyDashboard from './pages/dashboards/FacultyDashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';

import MyComplaints from './pages/complaints/MyComplaints';
import NewComplaint from './pages/complaints/NewComplaint';
import ComplaintDetail from './pages/complaints/ComplaintDetail';
import ManageComplaints from './pages/complaints/ManageComplaints';
import ManageComplaintDetail from './pages/complaints/ManageComplaintDetail';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';

// Phase 5 Pages
import StudentAttendance from './pages/student/StudentAttendance';
import StudentMarks from './pages/student/StudentMarks';
import StudentNotices from './pages/student/StudentNotices';

import FacultyAttendance from './pages/faculty/FacultyAttendance';
import FacultyMarks from './pages/faculty/FacultyMarks';
import FacultyNotices from './pages/faculty/FacultyNotices';

import HodAcademics from './pages/hod/HodAcademics';
import HodNotices from './pages/hod/HodNotices';

import AdminUsers from './pages/admin/AdminUsers';
import AdminNotices from './pages/admin/AdminNotices';
import AdminStudents from './pages/admin/AdminStudents';
import AdminFaculty from './pages/admin/AdminFaculty';
import AdminHods from './pages/admin/AdminHods';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminCourses from './pages/admin/AdminCourses';
import AdminRooms from './pages/admin/AdminRooms';

import FacultyAssignments from './pages/faculty/FacultyAssignments';
import StudentAssignments from './pages/student/StudentAssignments';
import FacultyResources from './pages/faculty/FacultyResources';
import StudentResources from './pages/student/StudentResources';

// Phase 10 Timetable Pages
import HodTimetable from './pages/hod/HodTimetable';
import FacultyTimetable from './pages/faculty/FacultyTimetable';
import StudentTimetable from './pages/student/StudentTimetable';

// Phase 11 Live Attendance Pages
import FacultyLiveAttendance from './pages/faculty/FacultyLiveAttendance';
import StudentAttendQR from './pages/student/StudentAttendQR';

function RootRedirect() {
  const { isAuthenticated, user, getRoleDashboardPath, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleDashboardPath(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />

              {/* ==================================================== */}
              {/* Admin Routes                                         */}
              {/* ==================================================== */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/complaints"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageComplaints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/complaints/:ticket_no"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageComplaintDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/notices"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminNotices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminStudents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/faculty"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminFaculty />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/hods"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminHods />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/departments"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDepartments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/rooms"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminRooms />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={<Navigate to="/admin/students" replace />}
              />

              {/* ==================================================== */}
              {/* HOD Routes                                           */}
              {/* ==================================================== */}
              <Route
                path="/hod/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <HodDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/timetable"
                element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <HodTimetable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/analytics"
                element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/complaints"
                element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <ManageComplaints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/complaints/:ticket_no"
                element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <ManageComplaintDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/academics"
                element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <HodAcademics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/notices"
                element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <HodNotices />
                  </ProtectedRoute>
                }
              />

              {/* ==================================================== */}
              {/* Faculty Routes                                       */}
              {/* ==================================================== */}
              <Route
                path="/faculty/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/timetable"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyTimetable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/assignments"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyAssignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/resources"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyResources />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/live-attendance"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyLiveAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/attendance"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/marks"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyMarks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/notices"
                element={
                  <ProtectedRoute allowedRoles={['faculty']}>
                    <FacultyNotices />
                  </ProtectedRoute>
                }
              />

              {/* ==================================================== */}
              {/* Student Routes                                       */}
              {/* ==================================================== */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/timetable"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentTimetable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/assignments"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentAssignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/resources"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentResources />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/attendance"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/marks"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentMarks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/notices"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentNotices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/complaints"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <MyComplaints />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/complaints/new"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <NewComplaint />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/complaints/:ticket_no"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <ComplaintDetail />
                  </ProtectedRoute>
                }
              />

              {/* Live Attendance QR Scan Deep-Links */}
              <Route path="/student/attend" element={<StudentAttendQR />} />
              <Route path="/attend" element={<StudentAttendQR />} />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
