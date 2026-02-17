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
  UserCog,
  Info,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DESIGNATIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor'
];

interface OBEFrameworkMember {
  id: string;
  member_name: string;
  designation: string;
  program_id?: string;
  program?: string; // Legacy support
  programs?: {
    program_name: string;
  };
  email_official: string;
  email_personal: string;
  mobile_official: string;
  mobile_personal: string;
  linkedin_id: string;
}

export default function OBEFrameworkForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<OBEFrameworkMember[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    member_name: '',
    designation: '',
    program_id: '',
    email_official: '',
    email_personal: '',
    mobile_official: '',
    mobile_personal: '',
    linkedin_id: ''
  });

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/institution/obe-framework');
      if (response.ok) {
        const payload = await response.json();
        setMembers(payload.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
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
    fetchMembers();
    fetchPrograms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/institution/obe-framework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
      });
      if (response.ok) {
        alert(editingId ? 'Member updated successfully!' : 'Member added successfully!');
        setFormData({
            member_name: '',
            designation: '',
            program_id: '',
            email_official: '',
            email_personal: '',
            mobile_official: '',
            mobile_personal: '',
            linkedin_id: ''
        });
        setEditingId(null);
        fetchMembers();
      } else {
        const errorData = await response.json();
        alert(`Failed to save: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save member:', error);
      alert('An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member: OBEFrameworkMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      member_name: member.member_name || '',
      designation: member.designation || '',
      program_id: (member as any).program_id || '',
      email_official: member.email_official || '',
      email_personal: member.email_personal || '',
      mobile_official: member.mobile_official || '',
      mobile_personal: member.mobile_personal || '',
      linkedin_id: member.linkedin_id || ''
    });
    setEditingId(member.id);
    setExpandedId(member.id);
    
    // Scroll to form
    const formElement = document.getElementById('obe-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDelete = async (member: OBEFrameworkMember, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this framework member?')) return;
    
    try {
      const response = await fetch(`/api/institution/obe-framework?id=${member.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchMembers();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred while deleting.');
    }
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>OBE Framework & Protocols</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; }
            h1 { text-align: center; color: #000; margin-bottom: 5px; text-transform: uppercase; font-size: 18pt; }
            h2 { text-align: center; color: #333; margin-top: 0; font-size: 14pt; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11pt; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .header-info { margin-bottom: 30px; text-align: center; color: #000; font-size: 12pt; }
          </style>
        </head>
        <body>
          <h1>OBE Framework & Protocols</h1>
          <div class="header-info">Institutional Resource Planning Report</div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">S.No</th>
                <th style="width: 25%">Name of Member</th>
                <th style="width: 20%">Designation</th>
                <th style="width: 25%">Program</th>
                <th style="width: 25%">Contact Details</th>
              </tr>
            </thead>
            <tbody>
              ${members.map((m, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>
                    <strong>${m.member_name}</strong><br/>
                    <small>LinkedIn: ${m.linkedin_id || '-'}</small>
                  </td>
                  <td>${m.designation}</td>
                  <td>${m.programs?.program_name || m.program || '-'}</td>
                  <td>
                    ${m.email_official}<br/>
                    ${m.mobile_official}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const scrollToForm = () => {
    const formElement = document.getElementById('obe-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return (
    <div className="space-y-8 animate-element">
      {/* Main Form Section */}
      <div id="obe-form" className="group rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="size-5 text-indigo-600" />
              OBE Framework & Protocols
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Assign framework members and establish protocols</p>
          </div>
          <div className="flex items-center gap-2">
            {isLocked && (
                <button 
                type="button" 
                onClick={() => setIsLocked(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-sm transition-all uppercase tracking-wide"
                >
                <Edit2 className="size-3.5" /> Unlock to Edit
                </button>
            )}
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
            
            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Name of the Member</label>
              <input 
                required
                value={formData.member_name}
                onChange={(e) => setFormData({ ...formData, member_name: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                placeholder="Full name" 
              />
            </div>

            {/* Designation Field */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Designation</label>
                <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-medium">Academic or Administrative role</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
              </div>
              <div className="relative">
                <select 
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none cursor-pointer"
                >
                    <option value="">Select Designation</option>
                    {DESIGNATIONS.map((designation) => (
                    <option key={designation} value={designation}>
                        {designation}
                    </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Program Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Program of Study</label>
              <div className="relative">
                <select 
                    value={formData.program_id}
                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none cursor-pointer"
                >
                    <option value="">Select Program</option>
                    {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.program_name}
                    </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* LinkedIn Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">LinkedIn Profile</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Linkedin className="size-4" />
                </div>
                <input 
                    value={formData.linkedin_id}
                    onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
                    className="w-full h-11 pl-10 rounded-xl border border-slate-200 bg-slate-50/50 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                    placeholder="linkedin.com/in/username" 
                />
              </div>
            </div>

            {/* Email Fields */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email (Official)</label>
              <input 
                type="email" 
                value={formData.email_official}
                onChange={(e) => setFormData({ ...formData, email_official: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                placeholder="official@institution.edu" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email (Personal)</label>
              <input 
                type="email" 
                value={formData.email_personal}
                onChange={(e) => setFormData({ ...formData, email_personal: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                placeholder="personal@gmail.com" 
              />
            </div>

            {/* Mobile Fields */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Mobile (Official)</label>
              <input 
                value={formData.mobile_official}
                onChange={(e) => setFormData({ ...formData, mobile_official: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                placeholder="+91 00000 00000" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Mobile (Personal)</label>
              <input 
                value={formData.mobile_personal}
                onChange={(e) => setFormData({ ...formData, mobile_personal: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                placeholder="+91 00000 00000" 
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-100 mt-6">
            {(!isLocked || editingId) && (
              <button 
                type="submit" 
                disabled={submitting}
                className="group relative overflow-hidden rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center justify-center gap-2 relative z-10">
                  {submitting ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : editingId ? (
                    <> <SaveIcon className="size-5" /> Update Member </>
                  ) : (
                    <> <Plus className="size-5" /> Add Member </>
                  )}
                </div>
              </button>
            )}
            
            {!isLocked && members.length > 0 && (
              <button 
                type="button"
                onClick={() => setIsLocked(true)}
                className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                <Lock className="size-5 text-slate-400" /> Lock Framework
              </button>
            )}
            
             <button 
                type="button"
                onClick={handlePrintPDF}
                className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                <Printer className="size-5 text-slate-400" /> Print PDF
              </button>

            {isLocked && !editingId && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-500 cursor-not-allowed">
                <Lock className="size-4" /> Locked
              </div>
            )}
            
            {editingId && (
                 <button 
                    type="button"
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            member_name: '',
                            designation: '',
                            program_id: '',
                            email_official: '',
                            email_personal: '',
                            mobile_official: '',
                            mobile_personal: '',
                            linkedin_id: ''
                        });
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                >
                    Cancel Edit
                </button>
            )}
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="space-y-4 pt-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 px-1">
           <BookOpen className="size-4 text-indigo-500" /> Registered Members 
           <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-2">{members.length}</span>
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
            {loading ? (
                <div className="flex flex-col justify-center items-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
                    <Loader2 className="size-8 animate-spin text-indigo-200 mb-3" />
                    <p className="text-sm font-medium text-slate-400">Loading members...</p>
                </div>
            ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[1.5rem] border border-slate-200 border-dashed text-center">
                    <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                        <BookOpen className="size-8 text-slate-300" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">No Members Yet</h4>
                    <p className="text-sm text-slate-500 max-w-xs mt-1 mb-6">Start by adding members to the OBE framework.</p>
                    <button onClick={scrollToForm} className="text-indigo-600 font-bold text-sm hover:underline">
                        + Add First Member
                    </button>
                </div>
            ) : (
                members.map((member, index) => {
                    const isExpanded = expandedId === member.id;
                    const programName = (member as any).programs?.program_name || member.program || 'No Program';
                    return (
                        <motion.div 
                            layout
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "group rounded-2xl border bg-white transition-all duration-300 overflow-hidden",
                                isExpanded 
                                ? "border-indigo-200 shadow-xl shadow-indigo-100" 
                                : "border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200/50 hover:translate-y-[-2px]"
                            )}
                        >
                            <div 
                                onClick={() => toggleExpand(member.id)}
                                className="p-5 flex items-center gap-5 cursor-pointer select-none"
                            >
                                <div className={cn(
                                    "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300",
                                    isExpanded 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                                    : "bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                                )}>
                                    {index + 1}
                                </div>

                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                    <div className="md:col-span-4">
                                        <div className="font-bold text-slate-900 truncate text-lg">{member.member_name}</div>
                                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mt-0.5">{member.designation}</div>
                                    </div>
                                    
                                    <div className="md:col-span-4 hidden md:block">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg w-fit">
                                            <Building className="size-3.5 text-slate-400" />
                                            <span className="truncate max-w-[200px] font-medium">{programName}</span>
                                        </div>
                                    </div>

                                    <div className="md:col-span-4 hidden md:flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button 
                                            onClick={(e) => handleEdit(member, e)}
                                            className="size-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="size-4" />
                                        </button>
                                        {!isLocked && (
                                            <button 
                                                onClick={(e) => handleDelete(member, e)}
                                                className="size-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className={cn(
                                    "size-8 rounded-full flex items-center justify-center transition-all duration-300",
                                    isExpanded ? "bg-indigo-50 text-indigo-600 rotate-180" : "bg-transparent text-slate-400 group-hover:bg-slate-50"
                                )}>
                                     <ChevronDown className="size-5" />
                                </div>
                            </div>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                    >
                                        <div className="px-5 pb-6 pt-0 border-t border-slate-100/80 bg-slate-50/30">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                                                <InfoCard icon={Mail} label="Official Email" value={member.email_official} />
                                                <InfoCard icon={Phone} label="Official Mobile" value={member.mobile_official} />
                                                <InfoCard icon={Linkedin} label="LinkedIn" value={member.linkedin_id} isLink />
                                                
                                                <InfoCard icon={Mail} label="Personal Email" value={member.email_personal} secondary />
                                                <InfoCard icon={Phone} label="Personal Mobile" value={member.mobile_personal} secondary />
                                                <InfoCard icon={Building} label="Program" value={programName} secondary />
                                                
                                                <div className="md:col-span-2 lg:col-span-1 flex items-end justify-end gap-2 h-full min-h-[60px]">
                                                    <button 
                                                        onClick={(e) => handleEdit(member, e)}
                                                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                                                    >
                                                        Edit Details
                                                    </button>
                                                    {!isLocked && (
                                                        <button 
                                                            onClick={(e) => handleDelete(member, e)}
                                                            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-100 transition-all shadow-sm"
                                                        >
                                                            <Trash2 className="size-4" />
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

function InfoCard({ icon: Icon, label, value, isLink, secondary }: any) {
    if (!value) return null;
    return (
        <div className={cn(
            "p-3.5 rounded-xl border transition-all",
            secondary ? "bg-slate-50 border-slate-100/50" : "bg-white border-slate-100 shadow-sm"
        )}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Icon className="size-3" /> {label}
            </div>
            <div className={cn(
                "text-sm font-medium truncate",
                secondary ? "text-slate-500" : "text-slate-800"
            )}>
                {isLink ? (
                    <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        {value}
                    </a>
                ) : value}
            </div>
        </div>
    );
}
