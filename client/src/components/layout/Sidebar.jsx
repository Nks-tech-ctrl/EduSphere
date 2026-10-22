import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import {
  GraduationCap,
  LayoutDashboard,
  Building2,
  BookOpen,
  Users,
  UserCheck,
  Award,
  Bell,
  Settings,
  LogOut,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  PlusCircle,
  MessageSquare,
  BarChart3,
  X,
  FileText,
  Shield,
  Briefcase,
  Radio,
  DoorClosed
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  const getNavLinks = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
          { name: 'Departments', path: '/admin/departments', icon: Building2 },
          { name: 'Courses', path: '/admin/courses', icon: BookOpen },
          { name: 'Rooms', path: '/admin/rooms', icon: DoorClosed },
          { name: 'All Complaints', path: '/admin/complaints', icon: AlertCircle },
          { name: 'Notices', path: '/admin/notices', icon: Bell },
          { name: 'Students', path: '/admin/students', icon: GraduationCap },
          { name: 'Faculty', path: '/admin/faculty', icon: Briefcase },
          { name: 'HODs', path: '/admin/hods', icon: Shield },
        ];
      case 'hod':
        return [
          { name: 'Dashboard', path: '/hod/dashboard', icon: LayoutDashboard },
          { name: 'Timetable', path: '/hod/timetable', icon: Calendar },
          { name: 'Department Analytics', path: '/hod/analytics', icon: BarChart3 },
          { name: 'Department Complaints', path: '/hod/complaints', icon: AlertCircle },
          { name: 'Department Academics', path: '/hod/academics', icon: BookOpen },
          { name: 'Post Notice', path: '/hod/notices', icon: Bell },
        ];
      case 'faculty':
        return [
          { name: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
          { name: 'Live Attendance', path: '/faculty/live-attendance', icon: Radio },
          { name: 'Mark Attendance', path: '/faculty/attendance', icon: UserCheck },
          { name: 'Timetable', path: '/faculty/timetable', icon: Calendar },
          { name: 'Assignments', path: '/faculty/assignments', icon: FileText },
          { name: 'Study Resources', path: '/faculty/resources', icon: BookOpen },
          { name: 'Enter Marks', path: '/faculty/marks', icon: Award },
          { name: 'Notices', path: '/faculty/notices', icon: Bell },
        ];
      case 'student':
        return [
          { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
          { name: 'Mark Attendance', path: '/student/attendance', icon: UserCheck },
          { name: 'Timetable', path: '/student/timetable', icon: Calendar },
          { name: 'Assignments', path: '/student/assignments', icon: FileText },
          { name: 'Study Resources', path: '/student/resources', icon: BookOpen },
          { name: 'Marks', path: '/student/marks', icon: Award },
          { name: 'Notices', path: '/student/notices', icon: Bell },
          { name: 'My Complaints', path: '/student/complaints', icon: AlertCircle },
          { name: 'New Complaint', path: '/student/complaints/new', icon: PlusCircle },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  const roleBadgeColors = {
    admin: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    hod: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    faculty: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    student: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="print:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`print:hidden fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Logo and Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800">
          <Logo size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Persona Quick Card */}
        <div className="p-3.5 mx-3 my-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
              alt={user?.name}
              className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-xs object-cover bg-white dark:bg-slate-800"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">{user?.name}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    roleBadgeColors[user?.role] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {user?.role}
                </span>
                {user?.department_code && (
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    • {user?.department_code}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Main Menu
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
            Platform Status
          </div>

          <div className="mx-2 p-3 rounded-xl bg-blue-50/70 dark:bg-slate-800/70 border border-blue-100 dark:border-slate-700/80 text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Campus Tech Fest 2026</span>
            </div>
            <p className="text-[11px] text-blue-700/90 dark:text-slate-300 leading-relaxed font-medium">
              Neutral institutional governance, attendance & transparent grievance redressal.
            </p>
          </div>
        </div>

        {/* Footer Logout */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
