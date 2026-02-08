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
      // Fetch feedback status and responses for selected program
      // Mocking data for now as we might not have the table ready, 
      // but implementing the UI logic.
      setFeedbackEnabled(true); // Default mock
      
      // Mock responses
      setResponses([
        { id: '1', stakeholder_name: 'John Doe', category: 'Alumni', rating: 5, comment: 'Great vision for the program.', created_at: '2023-10-27' },
        { id: '2', stakeholder_name: 'Jane Smith', category: 'Employer', rating: 4, comment: 'Needs more focus on practical skills.', created_at: '2023-11-02' },
      ]);
    }
  }, [selectedProgramId]);

  const toggleFeedback = async () => {
    // Logic to toggle feedback in DB
    setFeedbackEnabled(!feedbackEnabled);
    // await supabase.from('programs').update({ feedback_enabled: !feedbackEnabled }).eq('id', selectedProgramId);
  };

  const copySurveyLink = () => {
    const link = `${window.location.origin}/survey/${selectedProgramId}`;
    navigator.clipboard.writeText(link);
    alert('Survey link copied to clipboard: ' + link);
  };

  if (loading) return <div className="p-10 text-center">Loading dashboard...</div>;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-sans min-h-screen">
      <header className="sticky top-0 z-50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button onClick={() => router.back()} className="flex size-10 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">arrow_back_ios_new</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight">Feedback Dashboard</h1>
          <div className="size-10"></div>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-24 p-4 space-y-6">
        {/* Program Selector */}
        <section>
          <label className="block">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block px-1">Selected Program</span>
            <select 
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-base focus:ring-2 focus:ring-[#137fec] focus:border-transparent transition-all outline-none"
            >
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </section>

        {/* Feedback Status Card */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Survey Status</h3>
              <p className="text-xs text-slate-500">{feedbackEnabled ? 'Accepting new responses' : 'Survey is closed'}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={feedbackEnabled} onChange={toggleFeedback} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#137fec]"></div>
            </label>
          </div>
          <button 
            onClick={copySurveyLink}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-[#137fec] font-semibold text-sm hover:bg-blue-100 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">link</span>
            Copy Survey Link
          </button>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Responses</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{responses.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
             <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Avg Rating</p>
             <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">4.5<span className="text-sm text-slate-400 font-normal">/5</span></p>
          </div>
        </section>

        {/* Recent Responses */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
             <h3 className="font-bold text-slate-900 dark:text-white">Recent Feedback</h3>
             <button className="text-[#137fec] text-xs font-bold">View All</button>
          </div>
          <div className="space-y-3">
            {responses.map(res => (
              <div key={res.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{res.stakeholder_name}</p>
                    <p className="text-xs text-slate-500">{res.category}</p>
                  </div>
                  <span className="flex items-center bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-xs font-bold">
                    {res.rating} <span className="material-symbols-outlined text-[10px] ml-0.5">star</span>
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">"{res.comment}"</p>
              </div>
            ))}
            {responses.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No responses yet.</div>
            )}
          </div>
        </section>
        
        {/* Next Step Action */}
        <section>
           <button 
             onClick={() => router.push('/institution/peos')}
             className="w-full bg-[#137fec] text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
             Proceed to PEO Formulation
             <span className="material-symbols-outlined">arrow_forward</span>
           </button>
        </section>

      </main>
    </div>
  );
}
