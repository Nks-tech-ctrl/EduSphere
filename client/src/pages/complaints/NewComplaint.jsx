import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { complaintApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  AlertCircle,
  Building,
  GraduationCap,
  Shield,
  ShieldCheck,
  Send,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  HelpCircle,
  Home,
  Coffee,
  Cpu,
  Book,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'academic',
    label: 'Academic & Curriculum',
    desc: 'Lecture scheduling, course syllabus, exam clashes',
    icon: GraduationCap,
    targetRole: 'HOD',
  },
  {
    id: 'faculty',
    label: 'Faculty & Instruction',
    desc: 'Teaching methods, assignment rubrics, evaluations',
    icon: HelpCircle,
    targetRole: 'HOD',
  },
  {
    id: 'infrastructure',
    label: 'Campus Infrastructure',
    desc: 'Lab computers, projectors, AC, electrical, Wi-Fi',
    icon: Cpu,
    targetRole: 'Admin',
  },
  {
    id: 'hostel',
    label: 'Hostel Maintenance',
    desc: 'Room fixtures, water pressure, cleanliness',
    icon: Home,
    targetRole: 'Admin',
  },
  {
    id: 'canteen',
    label: 'Canteen & Dining',
    desc: 'Food hygiene, quality standards, price transparency',
    icon: Coffee,
    targetRole: 'Admin',
  },
  {
    id: 'library',
    label: 'Library & Learning Resources',
    desc: 'Book inventory, reading halls, digital access',
    icon: Book,
    targetRole: 'Admin',
  },
  {
    id: 'other',
    label: 'Other Campus Facilities',
    desc: 'Transport shuttle, security, administrative desk',
    icon: Building,
    targetRole: 'Admin',
  },
];

export default function NewComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [category, setCategory] = useState('academic');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);
  const [copied, setCopied] = useState(false);

  const activeCategory = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const isHodRoute = ['academic', 'faculty'].includes(category);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Please provide at least 10 characters in the description.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await complaintApi.createComplaint({
        category,
        title: title.trim(),
        description: description.trim(),
        is_anonymous: isAnonymous,
      });

      if (res.success && res.ticket_no) {
        setCreatedTicket(res.ticket_no);
        toast.success(`Complaint registered: ${res.ticket_no}`, 'Grievance Logged');
      } else {
        setError(res.message || 'Failed to submit complaint.');
        toast.error(res.message || 'Failed to submit complaint.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting your complaint.');
      toast.error(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyTicket = () => {
    if (createdTicket) {
      navigator.clipboard.writeText(createdTicket);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppLayout title="Lodge a New Grievance">
      {/* Top Header / Breadcrumbs */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Link
            to="/student/complaints"
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">New Complaint Registration</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit your concern for automated role-based routing and transparent resolution.
            </p>
          </div>
        </div>

        <Link
          to="/student/complaints"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
        >
          View My History →
        </Link>
      </div>

      {/* Success Modal Confirmation (PRESERVED) */}
      {createdTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Complaint Registered!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your grievance has been safely logged in the system and automatically routed for review.
            </p>

            {/* Ticket Pill Display */}
            <div className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Assigned Ticket Number
                </span>
                <div className="text-lg font-black text-blue-700 dark:text-blue-400 tracking-wide">{createdTicket}</div>
              </div>
              <button
                type="button"
                onClick={copyTicket}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300 mb-6 bg-blue-50/60 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100/80 dark:border-blue-800/60 text-left">
              <span className="font-bold text-blue-900 dark:text-blue-300">Routing Status: </span>
              {isHodRoute ? (
                <span>Assigned to Head of Department ({user?.department_code || user?.department_name || 'Department'})</span>
              ) : (
                <span>Assigned to Central Campus Administration</span>
              )}
              {isAnonymous && <span className="block text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">• Student Identity Masked (Anonymous)</span>}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate(`/student/complaints/${createdTicket}`)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
              >
                <span>Track Progress on Timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => navigate('/student/complaints')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition"
              >
                Back to My Complaints
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Category Selector */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
              1. Select Concern Category <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose the area that best describes your issue. Edusphere will automatically route it to the responsible authority.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white dark:bg-slate-850 border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">{cat.desc}</p>
                    <span
                      className={`inline-block mt-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        cat.targetRole === 'HOD'
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Routes to: {cat.targetRole === 'HOD' ? `HOD (${user?.department_code || 'Department'})` : 'Central Admin'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Routing Alert Callout */}
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
              isHodRoute
                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200'
                : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className={`w-4 h-4 flex-shrink-0 ${isHodRoute ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400'}`} />
              <span>
                <strong>Smart Routing Active: </strong>
                {isHodRoute ? (
                  <>
                    This ticket will be assigned directly to your <strong>Head of Department ({user?.department_name || user?.department_code || 'Department'})</strong>.
                  </>
                ) : (
                  <>
                    This facility issue will be assigned directly to <strong>Central Campus Administration</strong>.
                  </>
                )}
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 shadow-xs border border-current flex-shrink-0">
              {activeCategory.targetRole}
            </span>
          </div>
        </div>

        {/* 2. Details & Description */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
            2. Complaint Details <span className="text-rose-500">*</span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subject / Title</label>
              <span className={`text-[11px] ${title.length > 120 ? 'text-rose-500 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                {title.length} / 120
              </span>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule clash between CSE-201 and CSE-203 Lab"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Detailed Description</label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Min 10 characters</span>
            </div>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide specific details, including classroom numbers, dates, times, and impact on coursework..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
            ></textarea>
          </div>
        </div>

        {/* 3. Anonymous Toggle Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isAnonymous ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {isAnonymous ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">File as Anonymous Grievance</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  When enabled, your name, email, and phone will be masked as <strong className="text-slate-700 dark:text-slate-300">"Anonymous"</strong> on all administrative dashboards, reviews, and timeline logs. You will still be able to track and view updates through your student portal.
                </p>

                {isAnonymous && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Identity Masking Active for this submission</span>
                  </div>
                )}
              </div>
            </div>

            {/* Switch Toggle */}
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Form Submission Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/student/complaints')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-60"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting Grievance...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Grievance</span>
              </>
            )}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
