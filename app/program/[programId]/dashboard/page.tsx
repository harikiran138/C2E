import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Program Dashboard - C2X Plus',
  description: 'Program dashboard view',
};

export default function ProgramDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="size-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="9" x2="9" y1="21" y2="9" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Program Dashboard</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Manage your program execution, curriculum, and outcomes from the sidebar.
          Select a module to continue.
        </p>
      </div>
    </div>
  );
}
