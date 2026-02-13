'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

interface Program {
  id: string;
  name: string;
}

interface SurveyResponse {
  id: string;
  stakeholder_name: string;
  category: string;
  rating: number; // 1-5
  comment: string;
  created_at: string;
}

export default function FeedbackDashboard() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchPrograms = async () => {


      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/institution/login');
        return;
      }

      const { data } = await supabase
        .from('programs')
        .select('id, name')
        .eq('institution_id', user.id);
      
      if (data && data.length > 0) {
        setPrograms(data);
        setSelectedProgramId(data[0].id);
      }
      setLoading(false);
    };
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      setFeedbackEnabled(true);
      setResponses([
        { id: '1', stakeholder_name: 'John Doe', category: 'Alumni', rating: 5, comment: 'Great vision for the program.', created_at: '2023-10-27' },
        { id: '2', stakeholder_name: 'Jane Smith', category: 'Employer', rating: 4, comment: 'Needs more focus on practical skills.', created_at: '2023-11-02' },
      ]);
    }
  }, [selectedProgramId]);

  const toggleFeedback = async () => {
    setFeedbackEnabled(!feedbackEnabled);
  };

  const copySurveyLink = () => {
    const link = `${window.location.origin}/survey/${selectedProgramId}`;
    navigator.clipboard.writeText(link);
    alert('Survey link copied to clipboard: ' + link);
  };

  if (loading) return <div className="p-10 text-center">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
             <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Feedback Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400">Analyze stakeholder feedback and manage surveys.</p>
             </div>
             <button onClick={() => router.push('/institution/dashboard')} className="text-sm font-semibold text-[#137fec] hover:underline">
                Back to Dashboard
             </button>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Program Selector */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Program</label>
                <select 
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#137fec]"
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
            </div>

            {/* Survey Status */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                   <h3 className="font-bold text-slate-900 dark:text-white">Survey Status</h3>
                   <p className="text-xs text-slate-500 mt-1">{feedbackEnabled ? 'Active (Collecting Responses)' : 'Inactive (Closed)'}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={feedbackEnabled} onChange={toggleFeedback} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#137fec]"></div>
                     </label>
                     <button onClick={copySurveyLink} className="text-[#137fec] text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">link</span> Copy Link
                     </button>
                </div>
            </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-[#137fec]">
                    <span className="material-symbols-outlined">forum</span>
                </div>
                <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Responses</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{responses.length}</p>
                </div>
             </div>
             <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div className="size-12 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600">
                    <span className="material-symbols-outlined">star</span>
                </div>
                <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Average Rating</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">4.5<span className="text-sm text-slate-400 font-normal">/5</span></p>
                </div>
             </div>
        </div>

        {/* Responses List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Recent Feedback</h3>
            <div className="space-y-4">
                {responses.map(res => (
                    <div key={res.id} className="p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-3 items-center">
                                <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                                    {res.stakeholder_name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{res.stakeholder_name}</h4>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{res.category}</span>
                                </div>
                            </div>
                            <div className="flex items-center text-yellow-500">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`material-symbols-outlined text-[18px] ${i < res.rating ? 'fill-current' : 'text-slate-300'}`}>star</span>
                                ))}
                            </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 pl-[52px]">"{res.comment}"</p>
                        <p className="text-right text-xs text-slate-400 mt-2">{new Date(res.created_at).toLocaleDateString()}</p>
                    </div>
                ))}
                {responses.length === 0 && (
                    <div className="text-center py-12 text-slate-400">No feedback responses yet.</div>
                )}
            </div>
        </div>

        <div className="flex justify-end">
            <button 
                onClick={() => router.push('/institution/peos')}
                className="bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
                Next: PEO Formulation <span className="material-symbols-outlined">arrow_forward</span>
            </button>
        </div>

      </div>
    </div>
  );
}
