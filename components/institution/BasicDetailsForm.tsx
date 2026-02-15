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


  useEffect(() => {
    // We can rely on the API to check auth via cookie. 
    // If API returns 401, we redirect.
    fetchDetails();
  }, []);

  const fetchDetails = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/institution/details');
      if (res.status === 401) {
        router.push('/institution/login');
        return;
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch details');

      if (data.institution) {
        setUserId(data.institution.id);
        setStatus(data.institution.status || 'Autonomous');
        setVision(data.institution.vision || '');
        setMission(data.institution.mission || '');
      }
      
      if (data.programs) {
        setPrograms(data.programs);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    try {
      setLoading(true);
      
      const res = await fetch('/api/institution/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, vision, mission })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Details saved successfully!');
    } catch (error: any) {
      console.error('Error saving details:', error);
      alert('Error saving details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProgram = async () => {
    if (!newProgram.name) {
      alert('Program name is required');
      return;
    }

    try {
      const res = await fetch('/api/institution/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProgram)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Reset and refetch
      setNewProgram({ name: '', degree: 'B.Tech', years: 4, level: 'UG' });
      setIsAddingProgram(false);
      fetchDetails();
    } catch (error: any) {
      console.error('Error adding program:', error);
      alert('Error adding program: ' + error.message);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    try {
      const res = await fetch(`/api/institution/programs?id=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setPrograms(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      console.error('Error deleting program:', error);
      alert('Error deleting program: ' + error.message);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
             <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Basic Institution Details</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage institution profile and academic programs.</p>
             </div>
             <button onClick={() => router.push('/institution/dashboard')} className="text-sm font-semibold text-[#137fec] hover:underline">
                Back to Dashboard
             </button>
        </div>

        {/* Institution Info Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#137fec]">domain</span>
                General Information
            </h2>

            <div>
                <label className="block text-sm font-semibold text-slate-500 mb-2">Autonomous Status</label>
                <div className="relative">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#137fec] appearance-none"
                    >
                        <option value="Autonomous">Autonomous</option>
                        <option value="Non-autonomous">Non-autonomous</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">expand_more</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-semibold text-slate-500 mb-2">Vision Statement</label>
                    <textarea 
                        value={vision}
                        onChange={(e) => setVision(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 min-h-[120px] outline-none focus:ring-2 focus:ring-[#137fec] resize-none"
                        placeholder="Enter institution vision..."
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-500 mb-2">Mission Statement</label>
                    <textarea 
                        value={mission}
                        onChange={(e) => setMission(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 min-h-[120px] outline-none focus:ring-2 focus:ring-[#137fec] resize-none"
                        placeholder="Enter institution mission..."
                    />
                 </div>
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleSaveDetails}
                    disabled={loading}
                    className="bg-[#137fec] hover:bg-[#137fec]/90 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>

        {/* Programs Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#137fec]">school</span>
                    Programs Offered
                </h2>
                <button 
                  onClick={() => setIsAddingProgram(!isAddingProgram)}
                  className="bg-[#137fec] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-[#137fec]/90 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">{isAddingProgram ? 'close' : 'add'}</span>
                  {isAddingProgram ? 'Cancel' : 'Add Program'}
                </button>
             </div>

             {isAddingProgram && (
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                     <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Program Name</label>
                        <input 
                          value={newProgram.name}
                          onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                          placeholder="e.g. Computer Science"
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-[#137fec]"
                        />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Degree</label>
                        <select 
                          value={newProgram.degree}
                          onChange={(e) => setNewProgram({...newProgram, degree: e.target.value})}
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-[#137fec]"
                        >
                          <option>B.Tech</option>
                          <option>B.E</option>
                          <option>M.Tech</option>
                          <option>M.E</option>
                          <option>MBA</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Level</label>
                        <select 
                          value={newProgram.level}
                          onChange={(e) => setNewProgram({...newProgram, level: e.target.value})}
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-[#137fec]"
                        >
                          <option>UG</option>
                          <option>PG</option>
                          <option>Integrated</option>
                        </select>
                     </div>
                     <button onClick={handleAddProgram} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg transition-colors">
                        Add
                     </button>
                </div>
             )}

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                            <th className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Degree</th>
                            <th className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                            <th className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Level</th>
                            <th className="py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {programs.map((prog) => (
                            <tr key={prog.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-4 font-semibold text-slate-700 dark:text-slate-200">{prog.name}</td>
                                <td className="py-4 text-slate-600 dark:text-slate-400">{prog.degree}</td>
                                <td className="py-4 text-slate-600 dark:text-slate-400">{prog.years} Years</td>
                                <td className="py-4">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${prog.level === 'UG' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                                        {prog.level}
                                    </span>
                                </td>
                                <td className="py-4 text-right">
                                    <button 
                                        onClick={() => prog.id && confirm('Delete this program?') && handleDeleteProgram(prog.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {programs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 italic">No programs added yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        </div>

      </div>
    </div>
  );
}
