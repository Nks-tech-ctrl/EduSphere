import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  DoorClosed,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  AlertCircle,
  Users,
  Calendar,
  Layers,
  X,
  Building,
  Monitor
} from 'lucide-react';

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Add Room Form
  const [addForm, setAddForm] = useState({
    name: '',
    room_type: 'lecture',
    capacity: 60
  });

  // Edit Room Form
  const [editForm, setEditForm] = useState({
    name: '',
    room_type: 'lecture',
    capacity: 60
  });

  const toast = useToast();

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getRooms();
      if (res.success) {
        setRooms(res.rooms || []);
      } else {
        setError(res.message || 'Failed to load rooms.');
      }
    } catch (err) {
      console.error('Fetch rooms error:', err);
      setError(err.message || 'Error fetching room inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter((room) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      room.name.toLowerCase().includes(term) ||
      room.room_type.toLowerCase().includes(term)
    );
  });

  // Stats calculation
  const totalRooms = rooms.length;
  const lectureHalls = rooms.filter((r) => r.room_type === 'lecture').length;
  const laboratories = rooms.filter((r) => r.room_type === 'lab').length;
  const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);

  // Open Add Modal
  const handleOpenAdd = () => {
    setAddForm({
      name: '',
      room_type: 'lecture',
      capacity: 60
    });
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!addForm.name.trim()) {
      setModalError('Room name is required (e.g. LH-103, CS-Lab-2).');
      return;
    }

    const cap = parseInt(addForm.capacity, 10);
    if (isNaN(cap) || cap < 1) {
      setModalError('Capacity must be a positive integer.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.createRoom({
        name: addForm.name.trim(),
        room_type: addForm.room_type,
        capacity: cap
      });

      if (res.success) {
        toast.success(res.message || 'Room created successfully!');
        setIsAddModalOpen(false);
        fetchRooms();
      } else {
        setModalError(res.message || 'Failed to create room.');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create room.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (room) => {
    setSelectedRoom(room);
    setEditForm({
      name: room.name,
      room_type: room.room_type,
      capacity: room.capacity
    });
    setModalError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoom) return;
    setModalError(null);

    if (!editForm.name.trim()) {
      setModalError('Room name is required.');
      return;
    }

    const cap = parseInt(editForm.capacity, 10);
    if (isNaN(cap) || cap < 1) {
      setModalError('Capacity must be a positive integer.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.updateRoom(selectedRoom.id, {
        name: editForm.name.trim(),
        room_type: editForm.room_type,
        capacity: cap
      });

      if (res.success) {
        toast.success(res.message || 'Room updated successfully.');
        setIsEditModalOpen(false);
        fetchRooms();
      } else {
        setModalError(res.message || 'Failed to update room.');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to update room.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (room) => {
    setSelectedRoom(room);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRoom) return;
    setSubmitting(true);
    try {
      const res = await adminApi.deleteRoom(selectedRoom.id);
      if (res.success) {
        toast.success(res.message || 'Room deleted successfully.');
        setIsDeleteModalOpen(false);
        fetchRooms();
      } else {
        toast.error(res.message || 'Cannot delete room.');
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message || 'Cannot delete room.');
      setIsDeleteModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Rooms">
      <div className="space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider flex items-center gap-1.5">
                <DoorClosed className="w-3.5 h-3.5" />
                Physical Infrastructure
              </span>
              <span className="text-blue-200 text-xs">• Facility Management</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Rooms & Facilities</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Maintain lecture halls, seminar rooms, and computer laboratories. Renaming automatically syncs existing timetable records without breaking schedules.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-blue-50 transition shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Rooms</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalRooms}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <DoorClosed className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lecture Halls</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{lectureHalls}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Building className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Laboratories</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{laboratories}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Monitor className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Seating Capacity</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalCapacity}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Refresh Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by room name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <button
            onClick={fetchRooms}
            disabled={loading}
            className="self-end sm:self-auto p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
            title="Refresh rooms"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Rooms Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Room / Facility</th>
                  <th className="py-3.5 px-4">Room Type</th>
                  <th className="py-3.5 px-4 text-center">Capacity</th>
                  <th className="py-3.5 px-4 text-center">Timetable Slots</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6">
                        <div className="w-24 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-20 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-12 h-5 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="w-8 h-5 bg-slate-200 dark:bg-slate-800 rounded-md mx-auto" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="w-14 h-6 bg-slate-200 dark:bg-slate-800 rounded-md ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      <DoorClosed className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No rooms found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchTerm ? 'Try adjusting your search criteria.' : 'Click "Add Room" to register the first lecture hall or laboratory.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr
                      key={room.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {room.room_type === 'lab' ? <Monitor className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm font-mono">
                              {room.name}
                            </p>
                            <span className="text-[11px] text-slate-400">ID #{room.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {room.room_type === 'lab' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                            <Monitor className="w-3 h-3" />
                            Laboratory
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                            <Building className="w-3 h-3" />
                            Lecture Hall
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <Users className="w-3 h-3 text-slate-400" />
                          {room.capacity}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {room.slot_count || 0}
                        </span>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(room)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Edit room"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(room)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Delete room"
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

      {/* Add Room Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <DoorClosed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Facility Room</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Register lecture hall or laboratory</p>
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
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Room Name / Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. LH-103, CS-Lab-2"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Room Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addForm.room_type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setAddForm({
                      ...addForm,
                      room_type: newType,
                      capacity: newType === 'lab' ? 30 : 60
                    });
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                >
                  <option value="lecture">Lecture Hall</option>
                  <option value="lab">Computer / Practical Laboratory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Capacity (Seats / Workstations) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={addForm.capacity}
                  onChange={(e) => setAddForm({ ...addForm, capacity: Number(e.target.value) })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                />
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
                  <span>Create Room</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {isEditModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Room</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedRoom.name}</p>
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
                  Room Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Renaming will automatically update all existing timetable slots in this room.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Room Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editForm.room_type}
                  onChange={(e) => setEditForm({ ...editForm, room_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
                >
                  <option value="lecture">Lecture Hall</option>
                  <option value="lab">Computer / Practical Laboratory</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Changing type is refused if scheduled timetable slots would become invalid.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Capacity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={editForm.capacity}
                  onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:border-blue-600"
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

      {/* Delete Room Modal */}
      {selectedRoom && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={`Delete ${selectedRoom.name}?`}
          message={`Are you sure you want to delete room "${selectedRoom.name}"? If timetable slots are currently scheduled in this room, deletion will be refused.`}
          confirmText="Delete Room"
          cancelText="Cancel"
          danger={true}
          loading={submitting}
        />
      )}
    </AppLayout>
  );
}
