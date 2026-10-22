import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, ArrowRight, X, Shield, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';

const STATIC_DEMO_ACCOUNTS = [
  {
    role: 'admin',
    roleLabel: 'System Administrator (Central Admin)',
    name: 'System Administrator',
    email: 'admin@edusphere.edu',
    password: 'Admin@123',
    dept: 'Central Admin',
    highlights: 'Institution-wide analytics, departments oversight, faculty/student registry, SLA escalation engine',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
  },
  {
    role: 'hod',
    roleLabel: 'Dr. Rajesh Gupta (HOD CSE)',
    name: 'Dr. Rajesh Gupta',
    email: 'hod.cse@edusphere.edu',
    password: 'Hod@123',
    dept: 'Computer Science (CSE)',
    highlights: 'Department grievance queue, academics summary, post notices, automatic timetable generation',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
  },
  {
    role: 'hod',
    roleLabel: 'Dr. Sunita Rao (HOD ECE)',
    name: 'Dr. Sunita Rao',
    email: 'hod.ece@edusphere.edu',
    password: 'Hod@123',
    dept: 'Electronics & Comm. (ECE)',
    highlights: 'ECE department governance, curriculum modules, automatic timetable generation',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
  },
  {
    role: 'faculty',
    roleLabel: 'Prof. Vikram Sharma (Faculty CSE)',
    name: 'Prof. Vikram Sharma',
    email: 'faculty.sharma@edusphere.edu',
    password: 'Faculty@123',
    dept: 'Computer Science (CSE)',
    highlights: 'Assigned courses (CSE-201, CSE-203), attendance register (today blank for live demo) & marks entry',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
  },
  {
    role: 'faculty',
    roleLabel: 'Prof. Amit Verma (Faculty ECE)',
    name: 'Prof. Amit Verma',
    email: 'faculty.verma@edusphere.edu',
    password: 'Faculty@123',
    dept: 'Electronics & Comm. (ECE)',
    highlights: 'Allocated subjects (ECE-201, ECE-202), attendance register, assignments & timetable view',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
  },
  {
    role: 'student',
    roleLabel: 'Aarav Mehta (Student CSE)',
    name: 'Aarav Mehta',
    email: 'student1@edusphere.edu',
    password: 'Student@123',
    dept: 'Computer Science (CSE)',
    highlights: 'Enrolled coursework, attendance % circular gauge (92%), internal marks & anonymous grievance filing',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  },
  {
    role: 'student',
    roleLabel: 'Ananya Iyer (Student ECE)',
    name: 'Ananya Iyer',
    email: 'student11@edusphere.edu',
    password: 'Student@123',
    dept: 'Electronics & Comm. (ECE)',
    highlights: 'ECE coursework, semester attendance, assignments submission & weekly timetable view',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  }
];

const EXHIBITION_STEPS = [
  {
    step: 1,
    role: 'student',
    title: 'Submit Grievance with Transparent Routing',
    persona: 'Student (Aarav Mehta, CSE)',
    desc: 'Log in as student1@edusphere.edu. Open "New Complaint". Notice the category selector displays dynamic routing info (Academic → HOD, Infrastructure → Admin). Submit anonymously to see identity masking.',
    icon: AlertCircle,
    accent: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60'
  },
  {
    step: 2,
    role: 'hod',
    title: 'Department Grievance Queue & SLA Inspection',
    persona: 'HOD CSE (Dr. Rajesh Gupta)',
    desc: 'Log in as hod.cse@edusphere.edu. View department complaints. Notice CMP-0003 (4 days old) is assigned to HOD and is currently un-escalated before SLA check.',
    icon: Shield,
    accent: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60'
  },
  {
    step: 3,
    role: 'admin',
    title: 'Run On-Demand 3-Day SLA Escalation Check',
    persona: 'Central Admin',
    desc: 'Log in as admin@edusphere.edu. Go to "All Complaints" and click "Run Escalation Check". Exactly 2 overdue complaints (CMP-0001 and CMP-0003) auto-escalate to Admin with complete timeline audit entries.',
    icon: Sparkles,
    accent: 'text-purple-500 bg-purple-50 dark:bg-purple-950/60'
  },
  {
    step: 4,
    role: 'faculty',
    title: 'Live Attendance & Final Marks Entry',
    persona: 'Faculty (Prof. Vikram Sharma, CSE)',
    desc: 'Log in as faculty.sharma@edusphere.edu. Open "Attendance" — today\'s date has zero marks and is ready for live marking. Open "Marks" and pick "Final Exam" — scores are blank and ready for evaluation.',
    icon: UserCheck,
    accent: 'text-blue-500 bg-blue-50 dark:bg-blue-950/60'
  },
  {
    step: 5,
    role: 'admin',
    title: 'Repeat Exhibition Anytime with 1-Click Reset',
    persona: 'Central Admin',
    desc: 'On the Admin Dashboard, click "Reset Demo Data". The SQLite database instantly reseeds relative dates, un-escalated tickets, and pristine sheets for the next visitor.',
    icon: RefreshCw,
    accent: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
  }
];

export default function DemoGuideModal({ isOpen, onClose, onSelectDemo }) {
  const [activeTab, setActiveTab] = useState('flow'); // 'flow' | 'accounts'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left shadow-2xl transition-all w-full max-w-2xl p-5 sm:p-7 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Exhibition Demo Guide
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Interactive Showcase Tour & Evaluator Credentials
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close demo guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-4 pb-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('flow')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'flow'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              5-Step Exhibition Flow
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'accounts'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Demo Accounts Reference ({STATIC_DEMO_ACCOUNTS.length})
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
            {activeTab === 'flow' && (
              <div className="space-y-3">
                {EXHIBITION_STEPS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.step}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-left flex items-start gap-3.5"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${s.accent}`}>
                        {s.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {s.title}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            Persona: {s.persona}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'accounts' && (
              <div className="space-y-3">
                {STATIC_DEMO_ACCOUNTS.map((acc) => (
                  <div
                    key={`${acc.role}-${acc.email}`}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${acc.badge}`}>
                          {acc.dept}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {acc.roleLabel}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono">
                        {acc.email} • Password: <span className="font-semibold text-blue-600 dark:text-blue-400">{acc.password}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {acc.highlights}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (typeof onSelectDemo === 'function') {
                          onSelectDemo(acc, true);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition flex-shrink-0"
                    >
                      <span>1-Click Login</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
            <span>Edusphere College Tech Fest 2026 Showcase</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
