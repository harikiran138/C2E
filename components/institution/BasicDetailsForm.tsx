'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

interface Program {
  id?: string;
  name: string;
  degree: string;
  years: number;
  level: string;
}

export default function BasicDetailsForm() {
  const [status, setStatus] = useState('Autonomous');
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // New program state
  const [newProgram, setNewProgram] = useState<Program>({ name: '', degree: 'B.Tech', years: 4, level: 'UG' });
  const [isAddingProgram, setIsAddingProgram] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  React.useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/institution/login');
        return;
      }
      setUserId(user.id);
      fetchDetails(user.id);
    };
    checkUser();
  }, []);

  const fetchDetails = async (uid: string) => {
    try {
      setLoading(true);
      // Fetch Institution Details
      const { data: instData, error: instError } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (instData) {
        setStatus(instData.status || 'Autonomous');
        setVision(instData.vision || '');
        setMission(instData.mission || '');
      }

      // Fetch Programs
      const { data: progData, error: progError } = await supabase
        .from('programs')
        .select('*')
        .eq('institution_id', uid);
      
      if (progData) {
        setPrograms(progData);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('institutions')
        .upsert({
          id: userId,
          status,
          vision,
          mission,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      alert('Details saved successfully!');
    } catch (error: any) {
      console.error('Error saving details:', error);
      alert('Error saving details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProgram = async () => {
    if (!userId) return;
    if (!newProgram.name) {
      alert('Program name is required');
      return;
    }
    try {
      const { error } = await supabase
        .from('programs')
        .insert({
          institution_id: userId,
          name: newProgram.name,
          degree: newProgram.degree,
          years: newProgram.years,
          level: newProgram.level
        });
      
      if (error) throw error;
      
      // Reset and refetch
      setNewProgram({ name: '', degree: 'B.Tech', years: 4, level: 'UG' });
      setIsAddingProgram(false);
      fetchDetails(userId);
    } catch (error: any) {
      console.error('Error adding program:', error);
      alert('Error adding program: ' + error.message);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPrograms(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      console.error('Error deleting program:', error);
      alert('Error deleting program: ' + error.message);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-sans min-h-screen flex flex-col items-center p-4">
      <div className="relative flex h-full w-full flex-col overflow-hidden max-w-[480px] bg-white dark:bg-slate-900 shadow-xl rounded-2xl min-h-[800px]">
        {/* Header */}
        <header className="flex items-center bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="text-[#137fec] flex size-10 shrink-0 items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined">chevron_left</span>
          </div>
          <h1 className="text-[#0d141b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
            Basic Institution Details
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto pb-24">
          {/* Autonomous Status Dropdown */}
          <div className="p-4">
            <p className="text-[#0d141b] dark:text-slate-200 text-sm font-semibold leading-normal mb-3">Autonomous Status</p>
            <div className="relative">
               <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm text-[#0d141b] dark:text-white focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] outline-none appearance-none"
               >
                 <option value="Autonomous">Autonomous</option>
                 <option value="Non-autonomous">Non-autonomous</option>
               </select>
               <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">expand_more</span>
            </div>
          </div>

          {/* Text Areas */}
          <div className="px-4 space-y-5">
            <label className="flex flex-col w-full">
              <p className="text-[#0d141b] dark:text-slate-200 text-sm font-semibold leading-normal pb-2">Vision Statement</p>
              <textarea 
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                className="form-input flex w-full resize-none overflow-hidden rounded-xl text-[#0d141b] dark:text-white focus:outline-0 focus:ring-2 focus:ring-blue-500/20 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-[#137fec] min-h-[120px] placeholder:text-slate-400 p-4 text-sm font-normal leading-relaxed" 
                placeholder="Enter the institution's vision statement..."
              />
            </label>
            <label className="flex flex-col w-full">
              <p className="text-[#0d141b] dark:text-slate-200 text-sm font-semibold leading-normal pb-2">Mission Statement</p>
              <textarea 
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                className="form-input flex w-full resize-none overflow-hidden rounded-xl text-[#0d141b] dark:text-white focus:outline-0 focus:ring-2 focus:ring-blue-500/20 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-[#137fec] min-h-[120px] placeholder:text-slate-400 p-4 text-sm font-normal leading-relaxed" 
                placeholder="Enter the institution's mission statement..."
              />
            </label>
          </div>

          <div className="h-4"></div>

          {/* Programs Section Header */}
          <div className="px-4 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-2">
            <h2 className="text-[#0d141b] dark:text-white text-lg font-bold">Programs Offered</h2>
            <button 
              onClick={() => setIsAddingProgram(!isAddingProgram)}
              className="bg-blue-500/10 text-[#137fec] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-[#137fec] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm">{isAddingProgram ? 'close' : 'add'}</span>
              {isAddingProgram ? 'Cancel' : 'Add Program'}
            </button>
          </div>

          {/* Programs Table/List */}
          <div className="px-4">
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Degree</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Years</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Level</th>
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Add Program Row */}
                  {isAddingProgram && (
                    <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                      <td className="px-3 py-4">
                        <input 
                          value={newProgram.name}
                          onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                          placeholder="Program Name"
                          className="w-full bg-white dark:bg-slate-800 border-none rounded-md px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-4">
                        <select 
                          value={newProgram.degree}
                          onChange={(e) => setNewProgram({...newProgram, degree: e.target.value})}
                          className="w-full bg-white dark:bg-slate-800 border-none rounded-md px-1 py-1 text-xs"
                        >
                          <option>B.Tech</option>
                          <option>B.E</option>
                          <option>M.Tech</option>
                          <option>M.E</option>
                          <option>MBA</option>
                        </select>
                      </td>
                      <td className="px-3 py-4">
                         <select 
                          value={newProgram.years}
                          onChange={(e) => setNewProgram({...newProgram, years: parseInt(e.target.value)})}
                          className="w-full bg-white dark:bg-slate-800 border-none rounded-md px-1 py-1 text-xs"
                        >
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </td>
                      <td className="px-3 py-4">
                        <select 
                          value={newProgram.level}
                          onChange={(e) => setNewProgram({...newProgram, level: e.target.value})}
                          className="bg-white dark:bg-slate-800 border-none rounded-md px-1 py-1 text-xs"
                        >
                          <option>UG</option>
                          <option>PG</option>
                          <option>Integrated</option>
                        </select>
                      </td>
                      <td className="px-3 py-4">
                         <button onClick={handleAddProgram} className="text-[#137fec] hover:bg-blue-100 p-1 rounded-full">
                          <span className="material-symbols-outlined text-base">check</span>
                        </button>
                      </td>
                    </tr>
                  )}

                  {programs.map((prog, idx) => (
                    <tr key={prog.id || idx}>
                      <td className="px-3 py-4 text-sm font-medium text-[#0d141b] dark:text-slate-200">{prog.name}</td>
                      <td className="px-3 py-4 text-sm text-slate-600 dark:text-slate-400">{prog.degree}</td>
                      <td className="px-3 py-4 text-sm text-slate-600 dark:text-slate-400">{prog.years}</td>
                      <td className="px-3 py-4 text-sm">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${prog.level === 'UG' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                          {prog.level}
                        </span>
                      </td>
                       <td className="px-3 py-4 text-sm">
                        <button 
                          onClick={() => {
                             if(prog.id && confirm('Are you sure you want to delete this program?')) {
                               handleDeleteProgram(prog.id);
                             }
                          }}
                          className="text-red-500 hover:bg-red-50 p-1 rounded-full"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Sticky Bottom Save Action */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={handleSaveDetails}
            disabled={loading}
            className="w-full bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
