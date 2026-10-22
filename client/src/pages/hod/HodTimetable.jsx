import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TimetableGrid from '../../components/timetable/TimetableGrid';
import PrintTimetable from '../../components/timetable/PrintTimetable';
import SlotModal from '../../components/timetable/SlotModal';
import AutoGenerateModal from '../../components/timetable/AutoGenerateModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import { timetableApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Calendar } from 'lucide-react';

export default function HodTimetable() {
  const { user } = useAuth();
  const toast = useToast();
  const [slots, setSlots] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departmentName, setDepartmentName] = useState('');
  const [loading, setLoading] = useState(true);

  // Auto-Generate Modal State
  const [isAutoGenerateOpen, setIsAutoGenerateOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [conflictError, setConflictError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [slotToDelete, setSlotToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const res = await timetableApi.getDepartmentTimetable();
      if (res.success) {
        setSlots(res.slots || []);
        setCourses(res.courses || []);
        if (res.department?.name) {
          setDepartmentName(res.department.name);
        } else if (res.slots && res.slots.length > 0 && res.slots[0].department_name) {
          setDepartmentName(res.slots[0].department_name);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load department timetable.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = (prefill = null) => {
    setEditingSlot(prefill || null);
    setConflictError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slot) => {
    setEditingSlot(slot);
    setConflictError(null);
    setIsModalOpen(true);
  };

  const handleSaveSlot = async (slotData) => {
    setConflictError(null);
    setIsSubmitting(true);
    try {
      if (editingSlot && editingSlot.id) {
        await timetableApi.updateSlot(editingSlot.id, slotData);
        toast.success('Timetable slot updated successfully.');
      } else {
        await timetableApi.createSlot(slotData);
        toast.success('Timetable slot added successfully.');
      }
      setIsModalOpen(false);
      setEditingSlot(null);
      await fetchTimetable();
    } catch (err) {
      setConflictError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!slotToDelete) return;
    setIsDeleting(true);
    try {
      await timetableApi.deleteSlot(slotToDelete.id);
      toast.success('Slot removed from timetable.');
      setSlotToDelete(null);
      await fetchTimetable();
    } catch (err) {
      toast.error(err.message || 'Failed to delete slot.');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedDeptName = departmentName || user?.department_name || (user?.department_code ? `Department of ${user.department_code}` : 'Department Timetable');

  return (
    <AppLayout title="Department Timetable">
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:p-0 print:space-y-0">
        {loading ? (
          <div className="space-y-4">
            <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
            <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            <TimetableGrid
              slots={slots}
              canManage={true}
              onAddSlot={handleOpenAdd}
              onAutoGenerate={() => setIsAutoGenerateOpen(true)}
              onEditSlot={handleOpenEdit}
              onDeleteSlot={(slot) => setSlotToDelete(slot)}
              title="Department Timetable"
              subtitle={displayedDeptName}
            />
            <PrintTimetable
              slots={slots}
              title="Department Timetable"
              departmentName={displayedDeptName}
            />
          </>
        )}

        {/* Automatic Timetable Generation Modal (Phase 12B) */}
        <AutoGenerateModal
          isOpen={isAutoGenerateOpen}
          onClose={() => setIsAutoGenerateOpen(false)}
          courses={courses}
          onTimetableApplied={fetchTimetable}
        />

        {/* Slot Add/Edit Modal */}
        <SlotModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSlot(null);
            setConflictError(null);
          }}
          onSave={handleSaveSlot}
          initialData={editingSlot}
          courses={courses}
          conflictError={conflictError}
          isSubmitting={isSubmitting}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!slotToDelete}
          onClose={() => setSlotToDelete(null)}
          onConfirm={handleDeleteSlot}
          title="Remove Timetable Slot?"
          message={
            slotToDelete
              ? `Are you sure you want to remove ${slotToDelete.course_code} (${slotToDelete.start_time} - ${slotToDelete.end_time}, Room ${slotToDelete.room}) from the schedule?`
              : 'Are you sure you want to remove this slot?'
          }
          confirmText="Remove Slot"
          danger={true}
          loading={isDeleting}
        />
      </div>
    </AppLayout>
  );
}
