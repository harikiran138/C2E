'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const PAC_CATEGORIES = [
  'Senior Industry Expert (Chairman)',
  'Industry Members',
  'Professional Body Members',
  'Alumni',
  'Academia',
  'Seniors Internal Faculty',
  'Head of the Department',
  'Student Representative'
];

interface PACMember {
  id: string;
  program_id: string;
  member_name: string;
  member_id: string;
  organization: string;
  email: string;
  mobile_number: string;
  specialisation: string;
  category: string;
  tenure_start_date: string;
  tenure_end_date: string;
  linkedin_id: string;
}

export default function ProgramAdvisoryCommitteeForm() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<PACMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // We'll treat "Lock" as a local UI state for now, 
  // though typically it might be persisted if the backend supported it.
  const [isLocked, setIsLocked] = useState(false);

  const [formData, setFormData] = useState({
    member_name: '',
    member_id: '',
    organization: '',
    email: '',
    mobile_number: '',
    specialisation: '',
    category: '',
    tenure_start_date: '',
    tenure_end_date: '',
    linkedin_id: ''
  });

  const fetchMembers = async () => {
    if (!programId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/institution/pac?programId=${programId}`);
      if (response.ok) {
        const payload = await response.json();
        setMembers(payload.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch PAC members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [programId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/institution/pac', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...formData, id: editingId, program_id: programId } : { ...formData, program_id: programId }),
      });

      if (response.ok) {
        alert(editingId ? 'Member updated successfully!' : 'Member added successfully!');
        setFormData({
            member_name: '',
            member_id: '',
            organization: '',
            email: '',
            mobile_number: '',
            specialisation: '',
            category: '',
            tenure_start_date: '',
            tenure_end_date: '',
            linkedin_id: ''
        });
        setEditingId(null);
        fetchMembers();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to save member'}`);
      }
    } catch (error) {
      console.error('Failed to save PAC member:', error);
      alert('Failed to save member. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member: PACMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      member_name: member.member_name || '',
      member_id: member.member_id || '',
      organization: member.organization || '',
      email: member.email || '',
      mobile_number: member.mobile_number || '',
      specialisation: member.specialisation || '',
      category: member.category || '',
      tenure_start_date: member.tenure_start_date ? member.tenure_start_date.split('T')[0] : '',
      tenure_end_date: member.tenure_end_date ? member.tenure_end_date.split('T')[0] : '',
      linkedin_id: member.linkedin_id || ''
    });
    setEditingId(member.id);
    setExpandedId(member.id);
    
    // Find the inner scroll container and scroll it to the top
    const innerContainer = document.querySelector('.custom-scrollbar');
    if (innerContainer) {
      innerContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (member: PACMember, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this member?')) return;
    
    try {
        const response = await fetch(`/api/institution/pac?id=${member.id}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            fetchMembers();
        } else {
            alert('Failed to delete member');
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // TODO: Ideally fetch institution/program details for header
    const content = `
      <html>
        <head>
          <title>Program Advisory Committee</title>
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
          <h1>Constitution of Program Advisory Committee (PAC)</h1>
          <div class="header-info">Department Report</div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">S.No</th>
                <th style="width: 20%">Name of Member</th>
                <th style="width: 20%">Category</th>
                <th style="width: 25%">Organization & Designation</th>
                <th style="width: 15%">Contact</th>
                <th style="width: 15%">Tenure</th>
              </tr>
            </thead>
            <tbody>
              ${members.map((m, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>
                    <strong>${m.member_name}</strong><br/>
                    <small>ID: ${m.member_id || '-'}</small><br/>
                    <small>${m.specialisation || ''}</small>
                  </td>
                  <td>${m.category}</td>
                  <td>${m.organization}</td>
                  <td>
                    ${m.email}<br/>
                    ${m.mobile_number}
                  </td>
                  <td>
                    ${m.tenure_start_date ? new Date(m.tenure_start_date).toLocaleDateString() : '-'} to<br/>
                    ${m.tenure_end_date ? new Date(m.tenure_end_date).toLocaleDateString() : '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 50px; display: flex; justify-content: space-between;">
             <div>
                <p><strong>Prepared By</strong></p>
                <br/><br/>
                <p>Program Coordinator</p>
             </div>
             <div>
                <p><strong>Approved By</strong></p>
                <br/><br/>
                <p>Head of Department</p>
             </div>
          </div>
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

  if (!programId) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            <div className="rounded-full bg-slate-100 p-4 mb-4">
                <Lock className="size-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Program Not Selected</h3>
            <p className="text-slate-500 max-w-sm mt-2">Please select a program from the top menu to constitute the Program Advisory Committee.</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Constitute PAC</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Program Advisory Committee</p>
        </div>
        <div className="flex gap-2">
            {isLocked && (
                <button 
                type="button" 
                onClick={() => setIsLocked(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                <Edit2 className="size-4" /> Edit Committee
                </button>
            )}
            <button 
              type="button" 
              onClick={handlePrintPDF}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Printer className="size-4" /> Print PDF
            </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-sm p-6 lg:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Name of the Member</label>
              <input 
                required
                value={formData.member_name}
                onChange={(e) => setFormData({ ...formData, member_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="Full name" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Member ID</label>
              <input 
                value={formData.member_id}
                onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="Unique ID" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Category</label>
              <select 
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">Select Category</option>
                {PAC_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Organisation</label>
              <input 
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="Current Organisation" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Email ID</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="email@example.com" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Mobile Number</label>
              <input 
                value={formData.mobile_number}
                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="+91 00000 00000" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Specialisation</label>
              <input 
                value={formData.specialisation}
                onChange={(e) => setFormData({ ...formData, specialisation: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="Area of expertise" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">LinkedIn ID</label>
               <input 
                 value={formData.linkedin_id}
                 onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
                 className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                 placeholder="Profile URL" 
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Tenure Start</label>
                <input 
                  type="date" 
                  value={formData.tenure_start_date}
                  onChange={(e) => setFormData({ ...formData, tenure_start_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Tenure End</label>
                <input 
                  type="date" 
                  value={formData.tenure_end_date}
                  onChange={(e) => setFormData({ ...formData, tenure_end_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                />
              </div>
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
                    <> <Plus className="size-5" /> Save & Add Member </>
                  )}
                </div>
              </button>
            )}
            
            {!isLocked && members.length > 0 && (
              <button 
                type="button"
                onClick={() => setIsLocked(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 shrink-0"
              >
                <Lock className="size-5" /> Lock Committee
              </button>
            )}

            {isLocked && !editingId && (
              <div className="flex-1 flex items-center justify-center py-3.5 px-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-bold text-sm gap-2">
                <Lock className="size-4" /> Committee Locked
              </div>
            )}
            
            {editingId && (
                <button 
                type="button" 
                onClick={() => {
                    setEditingId(null);
                    setFormData({
                        member_name: '',
                        member_id: '',
                        organization: '',
                        email: '',
                        mobile_number: '',
                        specialisation: '',
                        category: '',
                        tenure_start_date: '',
                        tenure_end_date: '',
                        linkedin_id: ''
                    });
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                Cancel
                </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900">
           <UserPlus className="size-4 text-primary" /> PAC Members ({members.length})
        </h4>
        
        <div className="space-y-3">
            {loading ? (
                <div className="flex justify-center items-center py-12 bg-white rounded-2xl border border-slate-200">
                    <Loader2 className="size-6 animate-spin text-slate-300" />
                </div>
            ) : members.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">
                    No members registered yet.
                </div>
            ) : (
                members.map((member, index) => {
                    const isExpanded = expandedId === member.id;
                    return (
                        <motion.div 
                            layout
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "rounded-xl border transition-all duration-200 overflow-hidden bg-white hover:border-primary/30",
                                isExpanded ? "border-primary/40 ring-4 ring-primary/5 shadow-md" : "border-slate-200 shadow-sm"
                            )}
                        >
                            <div 
                                onClick={() => toggleExpand(member.id)}
                                className="p-4 flex items-center gap-4 cursor-pointer select-none"
                            >
                                <div className={cn(
                                    "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                                    isExpanded ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                                )}>
                                    {index + 1}
                                </div>

                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="font-bold text-slate-900 truncate">{member.member_name}</div>
                                    <div className="text-sm text-slate-500 flex items-center gap-2 truncate">
                                        <Phone className="size-3.5" />
                                        {member.mobile_number || 'N/A'}
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 uppercase tracking-tight truncate max-w-[150px]">
                                            {member.category}
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
                                                        <Building className="size-3" /> Organization
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700">{member.organization || 'N/A'}</div>
                                                </div>
                                                
                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <Mail className="size-3" /> Email Address
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700">{member.email || 'N/A'}</div>
                                                </div>

                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <Award className="size-3" /> Specialisation
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700">{member.specialisation || 'N/A'}</div>
                                                </div>

                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <Calendar className="size-3" /> Tenure
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700">
                                                        {member.tenure_start_date ? new Date(member.tenure_start_date).toLocaleDateString() : 'N/A'} 
                                                        {' - '} 
                                                        {member.tenure_end_date ? new Date(member.tenure_end_date).toLocaleDateString() : 'N/A'}
                                                    </div>
                                                </div>

                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                                        <Linkedin className="size-3" /> LinkedIn
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700 break-all">{member.linkedin_id || 'N/A'}</div>
                                                </div>

                                                <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={(e) => handleEdit(member, e)}
                                                        className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
                                                    >
                                                        Edit Member
                                                    </button>
                                                    {!isLocked && (
                                                        <button 
                                                            onClick={(e) => handleDelete(member, e)}
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
