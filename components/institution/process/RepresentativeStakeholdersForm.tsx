'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Edit2, Lock, Printer, Trash2, Plus, UserPlus, Save as SaveIcon, Loader2 } from 'lucide-react';

const STAKEHOLDER_CATEGORIES = [
  'Academia',
  'Industry',
  'Corporate',
  'Potential Employer',
  'Professional Body',
  'Research organisation',
  'Alumni',
  'Senior Students',
  'Parents',
  'Management'
];

export default function RepresentativeStakeholdersForm() {
  const searchParams = useSearchParams();
  const programId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    member_name: '',
    member_id: '',
    organization: '',
    email: '',
    mobile_number: '',
    specialisation: '',
    category: '',
    linkedin_id: ''
  });

  const fetchMembers = async () => {
    if (!programId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/institution/stakeholders?programId=${programId}`);
      if (response.ok) {
        const payload = await response.json();
        setMembers(payload.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch stakeholders:', error);
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
      const response = await fetch('/api/institution/stakeholders', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...formData, id: editingId, program_id: programId } : { ...formData, program_id: programId }),
      });

      if (response.ok) {
        alert(editingId ? 'Stakeholder updated successfully!' : 'Stakeholder added successfully!');
        setFormData({
            member_name: '',
            member_id: '',
            organization: '',
            email: '',
            mobile_number: '',
            specialisation: '',
            category: '',
            linkedin_id: ''
        });
        setEditingId(null);
        fetchMembers();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to save stakeholder'}`);
      }
    } catch (error) {
      console.error('Failed to save stakeholder:', error);
      alert('Failed to save stakeholder. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member: any) => {
    setFormData({
      member_name: member.member_name || '',
      member_id: member.member_id || '',
      organization: member.organization || '',
      email: member.email || '',
      mobile_number: member.mobile_number || '',
      specialisation: member.specialisation || '',
      category: member.category || '',
      linkedin_id: member.linkedin_id || ''
    });
    setEditingId(member.id);
    
    // Find the inner scroll container and scroll it to the top
    const innerContainer = document.querySelector('.custom-scrollbar');
    if (innerContainer) {
      innerContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stakeholder?')) return;
    
    try {
        const response = await fetch(`/api/institution/stakeholders?id=${id}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            fetchMembers();
        } else {
            alert('Failed to delete stakeholder');
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Representative Stakeholders</title>
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
          <h1>Representative Stakeholders</h1>
          <div class="header-info">Department Report</div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">S.No</th>
                <th style="width: 20%">Name of Member</th>
                <th style="width: 20%">Category</th>
                <th style="width: 25%">Organization & Designation</th>
                <th style="width: 15%">Contact</th>
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
                <p>Principal</p>
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

  if (!programId) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            <div className="rounded-full bg-slate-100 p-4 mb-4">
                <Lock className="size-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Program Not Selected</h3>
            <p className="text-slate-500 max-w-sm mt-2">Please select a program from the top menu to add Representative Stakeholders.</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Representative Stakeholders</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Add and manage representative stakeholders</p>
        </div>
        <div className="flex gap-2">
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
                {STAKEHOLDER_CATEGORIES.map((category) => (
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
          </div>

          <div className="flex gap-4 pt-4">
              <button 
                type="submit" 
                disabled={submitting}
                className="group relative flex-1 overflow-hidden rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50"
              >
                <div className="flex items-center justify-center gap-2">
                  {submitting ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : editingId ? (
                    <> <SaveIcon className="size-5" /> Update Stakeholder </>
                  ) : (
                    <> <Plus className="size-5" /> Save & Add Stakeholder </>
                  )}
                </div>
              </button>
              
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
           <UserPlus className="size-4 text-primary" /> Stakeholders ({members.length})
        </h4>
        
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900">No</th>
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900">Name</th>
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900">Category</th>
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900">Contact</th>
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-slate-300" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-medium">
                    No stakeholders added yet.
                  </td>
                </tr>
              ) : (
                members.map((member, index) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 font-medium">{index + 1}</td>
                    <td className="px-6 py-4 text-slate-900 font-bold">
                        {member.member_name}
                        <div className="text-xs font-normal text-slate-500 mt-0.5">{member.organization}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                        {member.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                        <div className="flex flex-col text-xs">
                            <span>{member.email}</span>
                            <span>{member.mobile_number}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(member)}
                          className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(member.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg"
                            title="Delete"
                        >
                            <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
