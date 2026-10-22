import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (title) {
      document.title = `${title} | Edusphere`;
    } else {
      document.title = 'Edusphere | College Management System';
    }
  }, [title]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-150 print:bg-white print:text-black print:min-h-0 print:block">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:block">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 print:overflow-visible print:p-0 print:m-0 print:block">
          <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:m-0 print:p-0 print:space-y-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
