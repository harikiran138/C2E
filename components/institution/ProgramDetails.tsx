'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

interface Program {
  id: string;
  name: string;
  program_chair?: string;
  nba_coordinator?: string;
  vision?: string;
  mission?: string;
}

interface Stakeholder {
  id?: string;
  name: string;
  category: string;
  organization: string;
  contact: string;
  email: string;
}

export default function ProgramDetails() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // New Stakeholder State
  const [newStakeholder, setNewStakeholder] = useState<Stakeholder>({
    name: '', category: 'Employer', organization: '', contact: '', email: ''
  });
  const [isAddingStakeholder, setIsAddingStakeholder] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/institution/login');
        return;
      }
      setUserId(user.id);
      fetchPrograms(user.id);
    };
    checkUser();
  }, []);

  const fetchPrograms = async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('institution_id', uid);
    
    if (data && data.length > 0) {
      setPrograms(data);
      setSelectedProgramId(data[0].id); // Default to first
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedProgramId && programs.length > 0) {
      const prog = programs.find(p => p.id === selectedProgramId) || null;
      setCurrentProgram(prog);
      fetchStakeholders(selectedProgramId);
    }
  }, [selectedProgramId, programs]);

  const fetchStakeholders = async (progId: string) => {
    const { data } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('program_id', progId);
    if (data) setStakeholders(data);
    else setStakeholders([]);
  };

  const handleProgramUpdate = async () => {
    if (!currentProgram || !selectedProgramId) return;
    try {
      const { error } = await supabase
        .from('programs')
        .update({
          program_chair: currentProgram.program_chair,
          nba_coordinator: currentProgram.nba_coordinator,
          vision: currentProgram.vision,
          mission: currentProgram.mission,
        })
        .eq('id', selectedProgramId);

      if (error) throw error;
      alert('Program details updated!');
      // Update local programs list
      setPrograms(prev => prev.map(p => p.id === selectedProgramId ? currentProgram : p));
    } catch (error: any) {
      console.error('Error updating program:', error);
      alert('Error updating program: ' + error.message);
    }
  };

  const handleAddStakeholder = async () => {
    if (!selectedProgramId) return;
    try {
      const { error } = await supabase
        .from('stakeholders')
        .insert({
          program_id: selectedProgramId,
          ...newStakeholder
        });

      if (error) throw error;
      
      setNewStakeholder({ name: '', category: 'Employer', organization: '', contact: '', email: '' });
      setIsAddingStakeholder(false);
      fetchStakeholders(selectedProgramId);
    } catch (error: any) {
      console.error('Error adding stakeholder:', error);
      alert('Error adding stakeholder: ' + error.message);
    }
  };

  if (loading && programs.length === 0) return <div className="p-10 text-center">Loading programs...</div>;
  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-sans min-h-screen">
      <header className="sticky top-0 z-50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">arrow_back_ios_new</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight">Program Details</h1>
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">more_horiz</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-24">
        {/* Program Selection */}
        <section className="p-4">
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
              {programs.length === 0 && <option>No programs found. Please add one in Details.</option>}
            </select>
          </label>
        </section>

        {/* Leadership Section */}
        {currentProgram && (
        <>
        {/* Leadership Section */}
        <section className="px-4 py-2 flex gap-4">
          <div className="flex-1">
            <label className="block">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block px-1">Program Chair</span>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#137fec]">account_circle</span>
                <input 
                  value={currentProgram.program_chair || ''}
                  onChange={(e) => setCurrentProgram({...currentProgram, program_chair: e.target.value})}
                  className="w-full h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#137fec] outline-none" 
                  placeholder="Enter name" 
                  type="text" 
                />
              </div>
            </label>
          </div>
          <div className="flex-1">
            <label className="block">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block px-1">NBA Coordinator</span>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#137fec]">verified_user</span>
                <input 
                  value={currentProgram.nba_coordinator || ''}
                  onChange={(e) => setCurrentProgram({...currentProgram, nba_coordinator: e.target.value})}
                  className="w-full h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#137fec] outline-none" 
                  placeholder="Enter name" 
                  type="text" 
                />
              </div>
            </label>
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="p-4 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block px-1">Vision of Program</span>
            <textarea 
              value={currentProgram.vision || ''}
              onChange={(e) => setCurrentProgram({...currentProgram, vision: e.target.value})}
              className="w-full min-h-[120px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-[#137fec] outline-none resize-none" 
              placeholder="Define the long-term vision..." 
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block px-1">Mission of Program</span>
            <textarea 
              value={currentProgram.mission || ''}
              onChange={(e) => setCurrentProgram({...currentProgram, mission: e.target.value})}
              className="w-full min-h-[120px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-[#137fec] outline-none resize-none" 
              placeholder="Define the mission..." 
            />
          </label>
          {/* Save Button */}
          <button onClick={handleProgramUpdate} className="w-full bg-[#137fec] text-white font-bold py-3 rounded-xl shadow-md">
            Save Program Details
          </button>
        </section>
        </>
        )}

        {/* Stakeholders Section */}
        <section className="mt-4">
          <div className="px-4 flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Stakeholders</h3>
            <button 
              onClick={() => setIsAddingStakeholder(!isAddingStakeholder)}
              className="bg-[#137fec] text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-sm">{isAddingStakeholder ? 'close' : 'add'}</span>
              {isAddingStakeholder ? 'Cancel' : 'Add Stakeholder'}
            </button>
          </div>
          
          {/* Add Stakeholder Form */}
          {isAddingStakeholder && (
            <div className="px-4 mb-4">
              <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                <input 
                  value={newStakeholder.name}
                  onChange={e => setNewStakeholder({...newStakeholder, name: e.target.value})}
                  placeholder="Stakeholder Name"
                  className="w-full p-2 rounded border"
                />
                <select 
                   value={newStakeholder.category}
                   onChange={e => setNewStakeholder({...newStakeholder, category: e.target.value})}
                   className="w-full p-2 rounded border"
                >
                  <option>Employer</option>
                  <option>Alumni</option>
                  <option>Parent</option>
                  <option>Student</option>
                  <option>Faculty</option>
                </select>
                <input 
                  value={newStakeholder.organization}
                  onChange={e => setNewStakeholder({...newStakeholder, organization: e.target.value})}
                  placeholder="Organization"
                  className="w-full p-2 rounded border"
                />
                <div className="flex gap-2">
                   <input 
                    value={newStakeholder.contact}
                    onChange={e => setNewStakeholder({...newStakeholder, contact: e.target.value})}
                    placeholder="Contact No"
                    className="w-full p-2 rounded border"
                   />
                   <input 
                    value={newStakeholder.email}
                    onChange={e => setNewStakeholder({...newStakeholder, email: e.target.value})}
                    placeholder="Email"
                    className="w-full p-2 rounded border"
                   />
                </div>
                <button onClick={handleAddStakeholder} className="w-full bg-green-600 text-white py-2 rounded font-bold">Add Stakeholder</button>
              </div>
            </div>
          )}

          {/* Stakeholders Table */}
          <div className="w-full overflow-x-auto border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Organization</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stakeholders.map((sh, idx) => (
                <tr key={sh.id || idx}>
                  <td className="px-4 py-3 text-sm font-medium">{sh.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {sh.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{sh.organization}</td>
                  <td className="px-4 py-3 text-sm">{sh.contact}</td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 text-center">
            <button className="text-[#137fec] text-sm font-semibold hover:underline">View All {stakeholders.length} Stakeholders</button>
          </div>
        </section>

        {/* Feedback Gateway Card */}
        <section className="p-4">
          <a className="group block relative overflow-hidden bg-[#137fec] rounded-2xl p-6 shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all" href="/institution/peos">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-8xl">insights</span>
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-white font-bold text-lg leading-tight">Enable & Seek Stakeholders Expectation</h4>
                <p className="text-white/80 text-xs">Access feedback analytics & expectations dashboard</p>
              </div>
              <div className="flex size-10 items-center justify-center bg-white/20 rounded-full text-white backdrop-blur-sm group-hover:translate-x-1 transition-transform">
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </div>
          </a>
        </section>
      </main>

      {/* Bottom Action Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
          <button className="flex flex-col items-center gap-1 text-[#137fec]">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] font-bold">Details</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined">groups</span>
            <span className="text-[10px] font-medium">Team</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined">assignment</span>
            <span className="text-[10px] font-medium">NBA Log</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
