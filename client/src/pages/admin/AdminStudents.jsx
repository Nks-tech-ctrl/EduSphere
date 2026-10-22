import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { adminApi, departmentsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  GraduationCap,
  Search,
  UserPlus,
  Building2,
  Phone,
  Mail,
  Calendar,
  RefreshCw,
  X,
  AlertCircle,
  BookOpen,
  Smartphone,
  RotateCcw
} from 'lucide-react';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [semFilter, setSemFilter] = useState('all');
  const [departments, setDepartments] = useState([]);

  // Device Reset Modal State
  const [resetTargetStudent, setResetTargetStudent] = useState(null);
  const [isResettingDevice, setIsResettingDevice] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const toast = useToast();

  // New Student Form State
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    department_id: '1',
    phone: ''
  });

  useEffect(() => {
    departmentsApi.getAll().then((res) => {
      if (res.success && res.departments) {
        setDepartments(res.departments);
      }
    }).catch(console.error);
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers({
        role: 'student',
        search: searchTerm,
        department_id: deptFilter,
        semester: semFilter
      });
      if (res.success) {
        setStudents(res.users || []);
      } else {
        setError(res.message || 'Failed to fetch student directory.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error connecting to student registry service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [deptFilter, semFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError(null);

    try {
      const res = await adminApi.createStudent({
        name: studentForm.name,
        email: studentForm.email,
        department_id: Number(studentForm.department_id),
        phone: studentForm.phone
      });

      if (res.success) {
        toast.success(res.message || 'Student account created and enrolled.', 'Student Onboarded');
        setIsModalOpen(false);
        setStudentForm({ name: '', email: '', department_id: '1', phone: '' });
        fetchStudents();
      } else {
        setModalError(res.message || 'Failed to create student account.');
        toast.error(res.message || 'Failed to create student account.');
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Error creating student account.');
      toast.error(err.message || 'Error creating student account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleConfirmResetDevice = async () => {
    if (!resetTargetStudent) return;
    setIsResettingDevice(true);
    try {
      const res = await adminApi.resetStudentDevice(resetTargetStudent.id);
      if (res.success) {
        toast.success(res.message || `Device binding for ${resetTargetStudent.name} reset.`, 'Device Reset');
        setResetTargetStudent(null);
        fetchStudents();
      } else {
        toast.error(res.message || 'Failed to reset device binding.');
      }
    } catch (err) {
      toast.error(err.message || 'Error resetting device binding.');
    } finally {
      setIsResettingDevice(false);
    }
  };

  return (
    <AppLayout title="Student Directory">
      <div className="space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Student Registry
              </span>
              <span className="text-blue-200 text-xs">• Institution Directory</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Student Directory & Onboarding</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Inspect active student enrollments, filter by department and semester, and register new students with automated department curriculum enrollment.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Student
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative grow sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Dept:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Semester:</span>
              <select
                value={semFilter}
                onChange={(e) => setSemFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Semesters</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
                <option value="4">Semester 4</option>
                <option value="5">Semester 5</option>
                <option value="6">Semester 6</option>
                <option value="7">Semester 7</option>
                <option value="8">Semester 8</option>
              </select>
            </div>

            <button
              onClick={fetchStudents}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Registered Students</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Showing {students.length} students matching filters</p>
            </div>
            <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400">{students.length} Students</span>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/3" />
                  </div>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-20" />
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-3">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No students found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No students match your selected search or department/semester filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-400 tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Student</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Semester</th>
                    <th className="py-3.5 px-4">Device Binding</th>
                    <th className="py-3.5 px-4">Phone</th>
                    <th className="py-3.5 px-4 sm:px-6">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                            alt={student.name}
                            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{student.department_name || 'General'}</span>
                          {student.department_code && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50">
                              {student.department_code}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <BookOpen className="w-3 h-3" />
                          Sem {student.semester || 3}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {student.device_id ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Smartphone className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                              Bound
                            </span>
                            <button
                              type="button"
                              onClick={() => setResetTargetStudent(student)}
                              className="px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Reset bound device"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              Reset
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                            Unbound
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{student.phone || '—'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Active'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Student Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Register New Student</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Creates student account and auto-enrolls in courses</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Student Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aditi Sharma"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Institutional Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. aditi.sharma@edusphere.edu"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Must be unique across institutional registry.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={studentForm.department_id}
                      onChange={(e) => setStudentForm({ ...studentForm, department_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                    <span>Automated Course Enrollment & Initial Credentials</span>
                  </div>
                  <p className="text-[11px] text-blue-700/90 dark:text-slate-300 leading-relaxed">
                    Student will automatically be enrolled in all active courses for the selected department. Default password is <code className="font-mono bg-blue-100 dark:bg-slate-700 px-1 py-0.5 rounded text-blue-900 dark:text-blue-200">Student@123</code>.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 transition cursor-pointer"
                  >
                    {modalSubmitting ? 'Registering...' : 'Register Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Device Reset Confirm Modal */}
        <ConfirmModal
          isOpen={!!resetTargetStudent}
          onClose={() => setResetTargetStudent(null)}
          onConfirm={handleConfirmResetDevice}
          loading={isResettingDevice}
          title="Reset Hardware Device Binding?"
          message={`Are you sure you want to delete the hardware device binding for ${resetTargetStudent?.name}? Their next live attendance check-in will register as their primary device.`}
          confirmText="Yes, Reset Device"
          cancelText="Cancel"
          danger={true}
        />
      </div>
    </AppLayout>
  );
}
