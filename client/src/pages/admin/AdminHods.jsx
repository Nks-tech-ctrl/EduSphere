import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { adminApi } from '../../services/api';
import {
  Shield,
  Search,
  Building2,
  Phone,
  Mail,
  Calendar,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function AdminHods() {
  const [hodList, setHodList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHods = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers({
        role: 'hod',
        search: searchTerm
      });
      if (res.success) {
        setHodList(res.users || []);
      } else {
        setError(res.message || 'Failed to fetch HOD directory.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error connecting to HOD registry service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHods();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHods();
  };

  return (
    <AppLayout title="Heads of Department">
      <div className="space-y-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-md uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Department Leadership
              </span>
              <span className="text-blue-200 text-xs">• Institution Directory</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Heads of Department (HODs)</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Inspect designated departmental heads overseeing academic programs, curriculum faculty allocations, and primary grievance resolution.
            </p>
          </div>
        </div>

        {/* Search and Refresh Bar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative grow sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search HOD by name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </form>

          <button
            onClick={fetchHods}
            className="self-end sm:self-auto p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* HODs Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Heads</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Showing {hodList.length} designated heads of department</p>
            </div>
            <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400">{hodList.length} HODs</span>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/3" />
                  </div>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-24" />
                </div>
              ))}
            </div>
          ) : hodList.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No HODs found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No departmental heads match your query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold uppercase text-slate-400 dark:text-slate-400 tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Phone</th>
                    <th className="py-3.5 px-4 sm:px-6">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {hodList.map((hod) => (
                    <tr key={hod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={hod.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${hod.name}`}
                            alt={hod.name}
                            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                          />
                          <div className="font-bold text-slate-900 dark:text-white">
                            {hod.name}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{hod.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{hod.department_name || 'Department Leadership'}</span>
                          {hod.department_code && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50">
                              {hod.department_code}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{hod.phone || '—'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{hod.created_at ? new Date(hod.created_at).toLocaleDateString() : 'Active'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
