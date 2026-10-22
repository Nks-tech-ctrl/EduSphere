import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TimetableGrid from '../../components/timetable/TimetableGrid';
import PrintTimetable from '../../components/timetable/PrintTimetable';
import { timetableApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Calendar } from 'lucide-react';

export default function FacultyTimetable() {
  const { user } = useAuth();
  const toast = useToast();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const res = await timetableApi.getFacultyTimetable();
      if (res.success) {
        setSlots(res.slots || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load faculty timetable.');
    } finally {
      setLoading(false);
    }
  };

  const departmentName =
    user?.department_name ||
    (user?.department_code ? `Department of ${user.department_code}` : '');

  return (
    <AppLayout>
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
              canManage={false}
              title="My Teaching Schedule"
              subtitle="Weekly schedule of lectures, labs, and tutorials assigned to you"
            />
            <PrintTimetable
              slots={slots}
              title="My Timetable"
              departmentName={departmentName}
              isFaculty={true}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
