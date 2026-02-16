'use client';

import { useState, useEffect } from 'react';
import { 
  Edit2, 
  Lock, 
  Printer, 
  Trash2, 
  Plus, 
  UserPlus, 
  Save as SaveIcon, 
  Loader2,
  ChevronDown,
  Mail,
  Phone,
  Building,
  Calendar,
  Linkedin,
  Award,
  BookOpen,
  UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const DESIGNATIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor'
];

interface ProgramCoordinator {
  id: string;
  name: string;
  designation: string;
  program_id: string;
  program_name?: string;
  email_official: string;
  email_personal: string;
  mobile_official: string;
  mobile_personal: string;
  linkedin_id: string;
}

interface Program {
    id: string;
    program_name: string;
}

export default function ProgramCoordinatorForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [coordinators, setCoordinators] = useState<ProgramCoordinator[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    program_id: '',
    email_official: '',
    email_personal: '',
    mobile_official: '',
    mobile_personal: '',
    linkedin_id: ''
  });

  const fetchCoordinators = async () => {
    try {
      const response = await fetch('/api/institution/program-coordinator');
      if (response.ok) {
        const payload = await response.json();
        setCoordinators(payload.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch coordinators:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
      try {
          const response = await fetch('/api/institution/details');
          if (response.ok) {
              const payload = await response.json();
              if (Array.isArray(payload.programs)) {
                  setPrograms(payload.programs);
              }
          }
      } catch (error) {
          console.error("Failed to fetch programs", error);
      }
  }

  useEffect(() => {
    fetchCoordinators();
    fetchPrograms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/institution/program-coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
      });
      if (response.ok) {
        alert(editingId ? 'Coordinator updated successfully!' : 'Coordinator added successfully!');
        setFormData({
            name: '',
            designation: '',
            program_id: '',
            email_official: '',
            email_personal: '',
            mobile_official: '',
            mobile_personal: '',
            linkedin_id: ''
        });
        setEditingId(null);
        fetchCoordinators();
      } else {
        const errorData = await response.json();
        alert(`Failed to save: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save coordinator:', error);
      alert('An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (coordinator: ProgramCoordinator, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      name: coordinator.name || '',
      designation: coordinator.designation || '',
      program_id: coordinator.program_id || '',
      email_official: coordinator.email_official || '',
      email_personal: coordinator.email_personal || '',
      mobile_official: coordinator.mobile_official || '',
      mobile_personal: coordinator.mobile_personal || '',
      linkedin_id: coordinator.linkedin_id || ''
    });
    setEditingId(coordinator.id);
    setExpandedId(coordinator.id);
    
    const innerContainer = document.querySelector('.custom-scrollbar');
    if (innerContainer) {
      innerContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = (coordinator: ProgramCoordinator, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Delete requested for:', coordinator.id);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Add Program Coordinator</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Assign coordinators to programs</p>
        </div>
        {isLocked && (
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => setIsLocked(false)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Edit2 className="size-4" /> Edit Coordinators
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-sm p-6 lg:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Name</label>
              <input 
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="Full name" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Designation</label>
              <select 
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">Select Designation</option>
                {DESIGNATIONS.map((designation) => (
                  <option key={designation} value={designation}>
                    {designation}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Program of Study</label>
               <select 
                value={formData.program_id}
                onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">Select Program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.program_name}
                  </option>
                ))}
              </select>
            </div>

             <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">LinkedIn ID</label>
              <input 
                value={formData.linkedin_id}
                onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="https://linkedin.com/in/username" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Email (Official)</label>
              <input 
                type="email" 
                value={formData.email_official}
                onChange={(e) => setFormData({ ...formData, email_official: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="official@institution.edu" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Email (Personal)</label>
              <input 
                type="email" 
                value={formData.email_personal}
                onChange={(e) => setFormData({ ...formData, email_personal: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="personal@gmail.com" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Mobile (Official)</label>
              <input 
                value={formData.mobile_official}
                onChange={(e) => setFormData({ ...formData, mobile_official: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="+91 00000 00000" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Mobile (Personal)</label>
              <input 
                value={formData.mobile_personal}
                onChange={(e) => setFormData({ ...formData, mobile_personal: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="+91 00000 00000" 
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            {(!isLocked || editingId) && (
              <button 
                type="submit" 
                disabled={submitting}
                className="group relative flex-1 overflow-hidden rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center justify-center gap-2">
                  {submitting ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : editingId ? (
                    <> <SaveIcon className="size-5" /> Save Changes </>
                  ) : (
                    <> <Plus className="size-5" /> Save & Add </>
                  )}
                </div>
              </button>
            )}
            
            {!isLocked && coordinators.length > 0 && (
              <button 
                type="button"
                onClick={() => setIsLocked(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 shrink-0"
              >
                <Lock className="size-5" /> Lock Coordinators
              </button>
            )}

            {isLocked && !editingId && (
              <div className="flex-1 flex items-center justify-center py-3.5 px-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-bold text-sm gap-2">
                <Lock className="size-4" /> Coordinators Locked
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900">
           <UserCog className="size-4 text-primary" /> Registered Coordinators ({coordinators.length})
        </h4>
        
        <div className="space-y-3">
            {loading ? (
                <div className="flex justify-center items-center py-12 bg-white rounded-2xl border border-slate-200">
                    <Loader2 className="size-6 animate-spin text-slate-300" />
                </div>
            ) : coordinators.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
                    No coordinators registered yet.
                </div>
            ) : (
                coordinators.map((coordinator, index) => {
                    const isExpanded = expandedId === coordinator.id;
                    return (
                        <motion.div 
                            layout
                            key={coordinator.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "rounded-xl border transition-all duration-200 overflow-hidden bg-white hover:border-primary/30",
                                isExpanded ? "border-primary/40 ring-4 ring-primary/5 shadow-md" : "border-slate-200 shadow-sm"
                            )}
                        >
                            <div 
                                onClick={() => toggleExpand(coordinator.id)}
                                className="p-4 flex items-center gap-4 cursor-pointer select-none"
                            >
                                <div className={cn(
                                    "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                                    isExpanded ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                                )}>
                                    {index + 1}
                                </div>

                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="font-bold text-slate-900 truncate">{coordinator.name}</div>
                                    <div className="text-sm text-slate-500 flex items-center gap-2 truncate">
                                        <Phone className="size-3.5" />
                                        {coordinator.mobile_official || 'N/A'}
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 uppercase tracking-tight truncate max-w-[150px]">
                                            {coordinator.designation}
                                        </span>
                                        <ChevronDown className={cn(
                                            "size-5 text-slate-400 transition-transform duration-300 shrink-0",
                                            isExpanded ? "rotate-180 text-primary" : ""
                                        )} />
                                    </div>
                                </div>
                            </div>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="px-4 pb-4 pt-0 border-t border-slate-100/80 bg-slate-50/50">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <BookOpen className="size-3" /> Program
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700">{coordinator.program_name || 'N/A'}</div>
                                                </div>
                                                
                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <Mail className="size-3" /> Official Email
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700">{coordinator.email_official || 'N/A'}</div>
                                                </div>

                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <Mail className="size-3" /> Personal Email
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700">{coordinator.email_personal || 'N/A'}</div>
                                                </div>

                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <Phone className="size-3" /> Personal Mobile
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700">{coordinator.mobile_personal || 'N/A'}</div>
                                                </div>

                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <Linkedin className="size-3" /> LinkedIn
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700 break-all">{coordinator.linkedin_id || 'N/A'}</div>
                                                </div>

                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={(e) => handleEdit(coordinator, e)}
                                                        className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
                                                    >
                                                        Edit Member
                                                    </button>
                                                    {!isLocked && (
                                                        <button 
                                                            onClick={(e) => handleDelete(coordinator, e)}
                                                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })
            )}
        </div>
      </div>
    </div>
  );
}
