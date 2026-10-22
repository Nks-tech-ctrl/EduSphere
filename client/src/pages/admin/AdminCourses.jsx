import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { adminApi, departmentsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  AlertCircle,
  GraduationCap,
  Users,
  Building2,
  Clock,
  Layers,
  X,
  CheckCircle2,
  Filter
} from 'lucide-react';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedSemFilter, setSelectedSemFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Add Course Form
  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    department_id: '',
    semester: 3,
    credits: 4,
    course_type: 'theory',
    weekly_lectures: 4,
    lab_hours_per_week: 0,
    faculty_id: '',
    enroll_existing_students: false
  });

  // Edit Course Form
  const [editForm, setEditForm] = useState({
    name: '',
    semester: 3,
    credits: 4,
    course_type: 'theory',
    weekly_lectures: 4,
    lab_hours_per_week: 0,
    faculty_id: ''
  });

  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [coursesRes, deptsRes, facRes] = await Promise.all([
        adminApi.getCourses({
          department_id: selectedDeptFilter,
          semester: selectedSemFilter,
          search: searchTerm
        }),
        departmentsApi.getAll(),
        adminApi.getUsers({ role: 'faculty' })
      ]);

      if (coursesRes.success) {
        setCourses(coursesRes.courses || []);
      } else {
        setError(coursesRes.message || 'Failed to load courses.');
      }

      if (deptsRes.success) {
        setDepartments(deptsRes.departments || []);
      }

      if (facRes.success) {
        setFacultyList(facRes.users || []);
      }
    } catch (err) {
      console.error('Fetch courses error:', err);
      setError(err.message || 'Error fetching course records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDeptFilter, selectedSemFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Stats calculation
  const totalCourses = courses.length;
  const theoryOnly = courses.filter((c) => c.course_type === 'theory').length;
  const labCourses = courses.filter((c) => c.course_type === 'lab' || c.course_type === 'both').length;
  const totalEnrollments = courses.reduce((acc, c) => acc + (c.enrolled_count || 0), 0);

  // Helpers for selected department student count in Add Modal
  const selectedDeptObj = departments.find(
    (d) => String(d.id) === String(addForm.department_id)
  );
  const eligibleStudentsCount = selectedDeptObj ? (selectedDeptObj.student_count || 0) : 0;

  // Filtered faculty for Add Modal based on chosen department
  const eligibleFacultyForAdd = facultyList.filter(
    (f) => String(f.department_id) === String(addForm.department_id)
  );

  // Filtered faculty for Edit Modal based on course's department
  const eligibleFacultyForEdit = selectedCourse
    ? facultyList.filter((f) => String(f.department_id) === String(selectedCourse.department_id))
    : [];

  // Open Add Modal
  const handleOpenAdd = () => {
    const defaultDeptId = departments[0]?.id || '';
    setAddForm({
      code: '',
      name: '',
      department_id: defaultDeptId,
      semester: 3,
      credits: 4,
      course_type: 'theory',
      weekly_lectures: 4,
      lab_hours_per_week: 0,
      faculty_id: '',
      enroll_existing_students: false // Requirement 8: Defaults to OFF
    });
    setModalError(null);
    setIsAddModalOpen(true);
  };

  // Submit Add Course
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!addForm.code.trim()) {
      setModalError('Course code is required (e.g. CSE-301).');
      return;
    }
    if (addForm.name.trim().length < 2) {
      setModalError('Course name must be at least 2 characters.');
      return;
    }
    if (!addForm.department_id) {
      setModalError('Please select a department.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createCourse({
        code: addForm.code.trim().toUpperCase(),
        name: addForm.name.trim(),
        department_id: Number(addForm.department_id),
        semester: Number(addForm.semester),
        credits: Number(addForm.credits),
        course_type: addForm.course_type,
        weekly_lectures: Number(addForm.weekly_lectures),
        lab_hours_per_week: Number(addForm.lab_hours_per_week),
        faculty_id: addForm.faculty_id ? Number(addForm.faculty_id) : null,
        enroll_existing_students: addForm.enroll_existing_students
      });

      if (res.success) {
        toast.success(res.message || 'Course created successfully!');
        setIsAddModalOpen(false);
        fetchData();
      } else {
        setModalError(res.message || 'Failed to create course.');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create course.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (course) => {
    setSelectedCourse(course);
    setEditForm({
      name: course.name,
      semester: course.semester,
      credits: course.credits,
      course_type: course.course_type || 'theory',
      weekly_lectures: course.weekly_lectures ?? 3,
      lab_hours_per_week: course.lab_hours_per_week ?? 0,
      faculty_id: course.faculty_id ? String(course.faculty_id) : ''
    });
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit Course
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setModalError(null);

    if (editForm.name.trim().length < 2) {
      setModalError('Course name must be at least 2 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.updateCourse(selectedCourse.id, {
        name: editForm.name.trim(),
        semester: Number(editForm.semester),
        credits: Number(editForm.credits),
        course_type: editForm.course_type,
        weekly_lectures: Number(editForm.weekly_lectures),
        lab_hours_per_week: Number(editForm.lab_hours_per_week),
        faculty_id: editForm.faculty_id ? Number(editForm.faculty_id) : null
      });

      if (res.success) {
        toast.success(res.message || 'Course updated successfully.');
        setIsEditModalOpen(false);
        fetchData();
      } else {
        setModalError(res.message || 'Failed to update course.');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to update course.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (course) => {
    setSelectedCourse(course);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Course
  const handleDeleteConfirm = async () => {
    if (!selectedCourse) return;
    setSubmitting(true);
    try {
      const res = await adminApi.deleteCourse(selectedCourse.id);
      if (res.success) {
        toast.success(res.message || 'Course deleted successfully.');
        setIsDeleteModalOpen(false);
        fetchData();
      } else {
        toast.error(res.message || 'Cannot delete course.');
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message || 'Cannot delete course.');
      setIsDeleteModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getCourseTypeBadge = (type) => {
    switch (type) {
      case 'lab':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
            Lab Only
          </span>
        );
      case 'both':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
            Theory + Lab
          </span>
        );
      case 'theory':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            Theory
          </span>
        );
    }
  };

  return (
    <AppLayout title="Courses">
      <div className="space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Curriculum Catalog
              </span>
              <span className="text-blue-200 text-xs">• Academic Management</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Courses Directory</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Create curriculum subjects, allocate faculty instructors, configure weekly lecture and laboratory hours, and manage student enrollments.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-blue-50 transition shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Courses</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalCourses}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Theory Courses</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{theoryOnly}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lab-Integrated</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{labCourses}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Enrollments</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalEnrollments}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, course name, faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Dynamic Department Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-600 cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={selectedSemFilter}
                onChange={(e) => setSelectedSemFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-hidden focus:border-blue-600 cursor-pointer"
              >
                <option value="all">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
              title="Refresh courses"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Courses Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Course</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Sem / Credits</th>
                  <th className="py-3.5 px-4 text-center">Type</th>
                  <th className="py-3.5 px-4 text-center">Workload</th>
                  <th className="py-3.5 px-4">Faculty Instructor</th>
                  <th className="py-3.5 px-4 text-center">Enrolled</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6">
                        <div className="w-36 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-12 h-4 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-28 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="w-14 h-6 bg-slate-200 dark:bg-slate-800 rounded-md ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No courses found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchTerm || selectedDeptFilter !== 'all' || selectedSemFilter !== 'all'
                          ? 'Try adjusting your filters.'
                          : 'Click "Add Course" to register the first curriculum course.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  courses.map((course) => (
                    <tr
                      key={course.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                            {course.code}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                              {course.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {course.department_code || course.department_name}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          Sem {course.semester}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {course.credits} Credits
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {getCourseTypeBadge(course.course_type)}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {course.weekly_lectures ?? 3} lect/wk
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {course.lab_hours_per_week ?? 0} lab hrs/wk
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {course.faculty_name ? (
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100 text-xs">
                              {course.faculty_name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {course.faculty_email}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {course.enrolled_count || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(course)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Edit course details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(course)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Delete course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Course Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Curriculum Course</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Register a new academic syllabus subject</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Course Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE-301"
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white uppercase placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Course Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Operating Systems"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.department_id}
                    onChange={(e) => setAddForm({ ...addForm, department_id: e.target.value, faculty_id: '' })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Semester <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.semester}
                    onChange={(e) => setAddForm({ ...addForm, semester: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Credits <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={addForm.credits}
                    onChange={(e) => setAddForm({ ...addForm, credits: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Course Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.course_type}
                    onChange={(e) => setAddForm({ ...addForm, course_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  >
                    <option value="theory">Theory Only</option>
                    <option value="lab">Lab Only</option>
                    <option value="both">Theory + Lab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Weekly Lectures
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={addForm.weekly_lectures}
                    onChange={(e) => setAddForm({ ...addForm, weekly_lectures: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lab Hours / Week
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={addForm.lab_hours_per_week}
                    onChange={(e) => setAddForm({ ...addForm, lab_hours_per_week: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Faculty Instructor
                </label>
                <select
                  value={addForm.faculty_id}
                  onChange={(e) => setAddForm({ ...addForm, faculty_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                >
                  <option value="">Leave Unassigned</option>
                  {eligibleFacultyForAdd.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.email})
                    </option>
                  ))}
                </select>
                {addForm.department_id && eligibleFacultyForAdd.length === 0 && (
                  <p className="text-[11px] text-amber-500 mt-1">
                    No faculty found in the selected department. Add faculty in Faculty Management first.
                  </p>
                )}
              </div>

              {/* Requirement 8: Enroll current students defaults to OFF, shows count */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.enroll_existing_students}
                    onChange={(e) => setAddForm({ ...addForm, enroll_existing_students: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Enroll current students of this department
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {addForm.department_id ? (
                        <>
                          Enrolling will automatically register all{' '}
                          <strong className="text-blue-600 dark:text-blue-400 font-bold">
                            {eligibleStudentsCount} active student(s)
                          </strong>{' '}
                          currently in {selectedDeptObj?.name || 'this department'}.
                        </>
                      ) : (
                        'Select a department to preview eligible student count.'
                      )}
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Create Course</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {isEditModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Course</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedCourse.code}: {selectedCourse.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    value={selectedCourse.code}
                    disabled
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Department: {selectedCourse.department_code}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Course Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Semester <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editForm.semester}
                    onChange={(e) => setEditForm({ ...editForm, semester: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Credits <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={editForm.credits}
                    onChange={(e) => setEditForm({ ...editForm, credits: Number(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Course Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editForm.course_type}
                    onChange={(e) => setEditForm({ ...editForm, course_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  >
                    <option value="theory">Theory Only</option>
                    <option value="lab">Lab Only</option>
                    <option value="both">Theory + Lab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Weekly Lectures
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editForm.weekly_lectures}
                    onChange={(e) => setEditForm({ ...editForm, weekly_lectures: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lab Hours / Week
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editForm.lab_hours_per_week}
                    onChange={(e) => setEditForm({ ...editForm, lab_hours_per_week: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Faculty Instructor
                </label>
                <select
                  value={editForm.faculty_id}
                  onChange={(e) => setEditForm({ ...editForm, faculty_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                >
                  <option value="">Leave Unassigned</option>
                  {eligibleFacultyForEdit.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only faculty belonging to {selectedCourse.department_code} are listed. If this course has timetable slots, conflict engine will check the new faculty member's schedule before saving.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Course Confirm Modal */}
      {selectedCourse && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={`Delete ${selectedCourse.code}?`}
          message={`Are you sure you want to delete "${selectedCourse.code}: ${selectedCourse.name}"? If this course has existing attendance, live sessions, marks, assignments, resources, or timetable slots, the deletion will be refused.`}
          confirmText="Delete Course"
          cancelText="Cancel"
          danger={true}
          loading={submitting}
        />
      )}
    </AppLayout>
  );
}
