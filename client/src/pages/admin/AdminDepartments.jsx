import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  UserCheck,
  UserPlus,
  AlertCircle,
  GraduationCap,
  Users,
  BookOpen,
  X,
  Shield,
  Mail,
  KeyRound
} from 'lucide-react';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHodModalOpen, setIsHodModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedDept, setSelectedDept] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    create_hod: false,
    hod_name: '',
    hod_email: ''
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: ''
  });

  // HOD form state
  const [hodForm, setHodForm] = useState({
    name: '',
    email: ''
  });

  const toast = useToast();

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDepartments();
      if (res.success) {
        setDepartments(res.departments || []);
      } else {
        setError(res.message || 'Failed to fetch departments.');
      }
    } catch (err) {
      console.error('Fetch departments error:', err);
      setError(err.message || 'Error connecting to department service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = departments.filter((dept) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      dept.code.toLowerCase().includes(term) ||
      dept.name.toLowerCase().includes(term) ||
      (dept.hod_name && dept.hod_name.toLowerCase().includes(term))
    );
  });

  // Stats
  const totalDepts = departments.length;
  const deptsWithHod = departments.filter((d) => d.hod_id).length;
  const totalFaculty = departments.reduce((acc, d) => acc + (d.faculty_count || 0), 0);
  const totalStudents = departments.reduce((acc, d) => acc + (d.student_count || 0), 0);

  // Handle Add Department
  const handleOpenAdd = () => {
    setAddForm({
      code: '',
      name: '',
      create_hod: false,
      hod_name: '',
      hod_email: ''
    });
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    const code = addForm.code.trim().toUpperCase();
    if (!/^[A-Z]{2,6}$/.test(code)) {
      setModalError('Department code must be 2 to 6 uppercase letters (e.g. ME, AI, CIVIL).');
      return;
    }

    if (addForm.name.trim().length < 2) {
      setModalError('Department name must be at least 2 characters.');
      return;
    }

    if (addForm.create_hod) {
      if (!addForm.hod_name.trim() || addForm.hod_name.trim().length < 2) {
        setModalError('HOD full name is required (min 2 chars).');
        return;
      }
      if (!addForm.hod_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.hod_email.trim())) {
        setModalError('A valid HOD email address is required.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createDepartment({
        code,
        name: addForm.name.trim(),
        create_hod: addForm.create_hod,
        hod_name: addForm.hod_name.trim(),
        hod_email: addForm.hod_email.trim()
      });

      if (res.success) {
        toast.success(res.message || 'Department created successfully!');
        setIsAddModalOpen(false);
        fetchDepartments();
      } else {
        setModalError(res.message || 'Failed to create department.');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Department
  const handleOpenEdit = (dept) => {
    setSelectedDept(dept);
    setEditForm({ name: dept.name });
    setModalError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDept) return;
    setModalError(null);

    if (editForm.name.trim().length < 2) {
      setModalError('Department name must be at least 2 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.updateDepartment(selectedDept.id, {
        name: editForm.name.trim()
      });

      if (res.success) {
        toast.success(res.message || 'Department updated successfully.');
        setIsEditModalOpen(false);
        fetchDepartments();
      } else {
        setModalError(res.message || 'Failed to update department.');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to update department.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create HOD for existing Dept
  const handleOpenCreateHod = (dept) => {
    setSelectedDept(dept);
    setHodForm({ name: '', email: '' });
    setModalError(null);
    setIsHodModalOpen(true);
  };

  const handleHodSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDept) return;
    setModalError(null);

    if (!hodForm.name.trim() || hodForm.name.trim().length < 2) {
      setModalError('HOD full name is required (min 2 chars).');
      return;
    }
    if (!hodForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hodForm.email.trim())) {
      setModalError('A valid HOD email address is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createDepartmentHod(selectedDept.id, {
        name: hodForm.name.trim(),
        email: hodForm.email.trim()
      });

      if (res.success) {
        toast.success(res.message || `HOD account created with default password "Hod@123".`);
        setIsHodModalOpen(false);
        fetchDepartments();
      } else {
        setModalError(res.message || 'Failed to create HOD account.');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create HOD account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Department
  const handleOpenDelete = (dept) => {
    setSelectedDept(dept);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDept) return;
    setSubmitting(true);
    try {
      const res = await adminApi.deleteDepartment(selectedDept.id);
      if (res.success) {
        toast.success(res.message || 'Department deleted successfully.');
        setIsDeleteModalOpen(false);
        fetchDepartments();
      } else {
        toast.error(res.message || 'Cannot delete department.');
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message || 'Cannot delete department.');
      setIsDeleteModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Departments">
      <div className="space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Academic Units
              </span>
              <span className="text-blue-200 text-xs">• Institution Management</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Department Directory</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Configure academic departments, assign departmental heads (HODs), and oversee faculty and student allocations across disciplines.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-blue-50 transition shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Departments</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalDepts}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned HODs</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                  {deptsWithHod} / {totalDepts}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Faculty</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalFaculty}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Students</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalStudents}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Actions Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by department name, code, or HOD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <button
            onClick={fetchDepartments}
            disabled={loading}
            className="self-end sm:self-auto p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
            title="Refresh departments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Departments Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Department</th>
                  <th className="py-3.5 px-4 sm:px-6">Head of Department (HOD)</th>
                  <th className="py-3.5 px-4 text-center">Faculty</th>
                  <th className="py-3.5 px-4 text-center">Students</th>
                  <th className="py-3.5 px-4 text-center">Courses</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {loading ? (
                  // Skeleton Rows
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                          <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="w-40 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="w-16 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No departments found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchTerm ? 'Try adjusting your search criteria.' : 'Click "Add Department" to register your first academic department.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept) => (
                    <tr
                      key={dept.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                            {dept.code}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                              {dept.name}
                            </p>
                            <span className="text-[11px] text-slate-400">ID #{dept.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 sm:px-6">
                        {dept.hod_name ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                              {dept.hod_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                                {dept.hod_name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                <Mail className="w-3 h-3 shrink-0" />
                                {dept.hod_email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                              <AlertCircle className="w-3 h-3" />
                              Unassigned
                            </span>
                            <button
                              onClick={() => handleOpenCreateHod(dept)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer border border-blue-200 dark:border-blue-800/80"
                            >
                              <UserPlus className="w-3 h-3" />
                              Create HOD
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {dept.faculty_count || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {dept.student_count || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {dept.course_count || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(dept)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Edit department name"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(dept)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Delete department"
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

      {/* Add Department Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Department</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Register a new academic department</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. ME, CIVIL, AI"
                  value={addForm.code}
                  onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white uppercase placeholder-slate-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">2 to 6 uppercase letters.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mechanical Engineering"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* HOD Creation Option */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.create_hod}
                    onChange={(e) => setAddForm({ ...addForm, create_hod: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Create Head of Department (HOD) account immediately
                  </span>
                </label>

                {addForm.create_hod && (
                  <div className="mt-3.5 space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        HOD Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Ramesh Kumar"
                        value={addForm.hod_name}
                        onChange={(e) => setAddForm({ ...addForm, hod_name: e.target.value })}
                        required={addForm.create_hod}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        HOD Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. hod.me@edusphere.edu"
                        value={addForm.hod_email}
                        onChange={(e) => setAddForm({ ...addForm, hod_email: e.target.value })}
                        required={addForm.create_hod}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-medium border border-blue-200/50 dark:border-blue-900/40">
                      <KeyRound className="w-3.5 h-3.5 shrink-0" />
                      <span>Default password will be initialized to <strong>Hod@123</strong></span>
                    </div>
                  </div>
                )}
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
                  <span>Create Department</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {isEditModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Department</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update department title</p>
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
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department Code
                </label>
                <input
                  type="text"
                  value={selectedDept.code}
                  disabled
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">Department codes cannot be changed after creation.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white"
                />
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

      {/* Create HOD Modal */}
      {isHodModalOpen && selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Head of Department</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedDept.name} ({selectedDept.code})</p>
                </div>
              </div>
              <button
                onClick={() => setIsHodModalOpen(false)}
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

            <form onSubmit={handleHodSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  HOD Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Sharma"
                  value={hodForm.name}
                  onChange={(e) => setHodForm({ ...hodForm, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  HOD Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. hod.civil@edusphere.edu"
                  value={hodForm.email}
                  onChange={(e) => setHodForm({ ...hodForm, email: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200/50 dark:border-blue-900/40">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Default password will be initialized to <strong>Hod@123</strong>.</span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsHodModalOpen(false)}
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
                  <span>Create HOD Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedDept && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={`Delete ${selectedDept.name}?`}
          message={`Are you sure you want to delete the department "${selectedDept.name}" (${selectedDept.code})? This will fail if active users, courses, notices, or complaints reference this department.`}
          confirmText="Delete Department"
          cancelText="Cancel"
          danger={true}
          loading={submitting}
        />
      )}
    </AppLayout>
  );
}
