'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ProcessStep } from '@/lib/institution/process';
import ProgramAdvisoryCommitteeForm from '@/components/institution/process/ProgramAdvisoryCommitteeForm';
import BoardOfStudiesForm from '@/components/institution/process/BoardOfStudiesForm';
import RepresentativeStakeholdersForm from '@/components/institution/process/RepresentativeStakeholdersForm';
import VisionMissionGenerator from '@/components/institution/process/VisionMissionGenerator';
import PeoGenerator from '@/components/institution/process/PeoGenerator';
import ConsistencyMatrix from '@/components/institution/process/ConsistencyMatrix';
import ProgramOutcomesForm from '@/components/institution/process/ProgramOutcomesForm';
import PsoGenerator from '@/components/institution/process/PsoGenerator';

interface ProcessStepPanelProps {
  step: ProcessStep;
}

interface ProgramOption {
  id: string;
  program_name: string;
  program_code: string;
}

const ACADEMIC_COUNCIL_CATEGORIES = [
  'The Principal (Chairman)',
  'Head of the Department',
  'Senior Teachers',
  'Governing Body Nominee',
  'University Nominee',
  'UGC Nominee',
  'Member Secretary',
];

function SharedForm({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="text-sm text-slate-600">{step.description}</p>
    
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Title</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Enter title" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Reference ID</label>
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Enter reference" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Notes</label>
          <textarea className="min-h-[130px] w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" placeholder="Enter details" />
        </div>
        <div className="md:col-span-2">
          <button type="button" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

import { Edit2, Lock, Printer, Trash2, Plus, UserPlus, Save as SaveIcon, Loader2 } from 'lucide-react';

function AcademicCouncilForm() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    try {
      const response = await fetch('/api/institution/academic-council');
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

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/institution/academic-council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
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
      }
    } catch (error) {
      console.error('Failed to save member:', error);
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
      tenure_start_date: member.tenure_start_date || '',
      tenure_end_date: member.tenure_end_date || '',
      linkedin_id: member.linkedin_id || ''
    });
    setEditingId(member.id);
    
    // Find the inner scroll container and scroll it to the top
    const innerContainer = document.querySelector('.custom-scrollbar');
    if (innerContainer) {
      innerContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Academic Council Members</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; }
            .header-info { margin-bottom: 30px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <h1>Academic Council Constitution</h1>
          <div class="header-info">Institutional Resource Planning Report</div>
          <table>
            <thead>
              <tr>
                <th>SNo.</th>
                <th>Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Category</th>
                <th>Organization</th>
              </tr>
            </thead>
            <tbody>
              ${members.map((m, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${m.member_name}</td>
                  <td>${m.email}</td>
                  <td>${m.mobile_number}</td>
                  <td>${m.category}</td>
                  <td>${m.organization}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Constitute Academic Council</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Add and Manage</p>
        </div>
        {isLocked && (
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => setIsLocked(false)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Edit2 className="size-4" /> Edit Council
            </button>
            <button 
              type="button" 
              onClick={handlePrintPDF}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Printer className="size-4" /> Print PDF
            </button>
          </div>
        )}
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
                placeholder="E.g. PROF-123" 
              />
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
                placeholder="email@institution.edu" 
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
                placeholder="E.g. Civil Engineering" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">Select category</option>
                {ACADEMIC_COUNCIL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
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

            <div className="md:col-span-1 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">LinkedIn ID</label>
              <input 
                value={formData.linkedin_id}
                onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
                placeholder="https://linkedin.com/in/username" 
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
            
            {!isLocked && members.length > 0 && (
              <button 
                type="button"
                onClick={() => setIsLocked(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 shrink-0"
              >
                <Lock className="size-5" /> Lock AC
              </button>
            )}

            {isLocked && !editingId && (
              <div className="flex-1 flex items-center justify-center py-3.5 px-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-bold text-sm gap-2">
                <Lock className="size-4" /> Academic Council Locked
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900">
           <UserPlus className="size-4 text-primary" /> Registered Members ({members.length})
        </h4>
        
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900">No</th>
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900">Name</th>
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900">Contact</th>
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900">Category</th>
                <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-900 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-slate-300" />
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500 font-medium">
                    No members registered yet.
                  </td>
                </tr>
              ) : (
                members.map((member, index) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 font-medium">{index + 1}</td>
                    <td className="px-6 py-4 text-slate-900 font-bold">{member.member_name}</td>
                    <td className="px-6 py-4 text-slate-600">{member.organization}</td>
                    <td className="px-6 py-4 text-slate-600">{member.email}</td>
                    <td className="px-6 py-4 text-slate-600">{member.mobile_number}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 uppercase tracking-tight whitespace-nowrap">
                        {member.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{member.member_id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(member)}
                          className="p-2 text-slate-400 hover:text-primary transition-colors hover:bg-primary/5 rounded-lg"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        {!isLocked && (
                          <button className="p-2 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-lg">
                            <Trash2 className="size-4" />
                          </button>
                        )}
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






function SelectProgramPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState(searchParams.get('programId') || '');

  useEffect(() => {
    const queryProgram = searchParams.get('programId') || '';
    setSelectedProgramId(queryProgram);
  }, [searchParams]);

  useEffect(() => {
    const loadPrograms = async () => {
      const response = await fetch('/api/institution/details');
      if (!response.ok) return;

      const payload = await response.json();
      if (Array.isArray(payload?.programs)) {
        setPrograms(
          payload.programs
            .map((program: ProgramOption) => ({
              id: program.id,
              program_name: program.program_name,
              program_code: program.program_code,
            }))
            .sort((a: ProgramOption, b: ProgramOption) => a.program_name.localeCompare(b.program_name))
        );
      }
    };

    loadPrograms();
  }, []);

  const onProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    const next = new URLSearchParams(searchParams.toString());
    if (programId) {
      next.set('programId', programId);
    } else {
      next.delete('programId');
    }
    router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ''}`);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">Select Program of Study</h3>
      <p className="text-sm text-slate-600">Name of the Program (Drop down Menu) - floated from institutional details.</p>

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Name of the Program</label>
        <select
          value={selectedProgramId}
          onChange={(e) => onProgramChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Select program</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.program_name} ({program.program_code})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ConsistencyMatrixPanel() {
  const rows = ['Mission 1', 'Mission 2', 'Mission 3'];
  const cols = ['PEO 1', 'PEO 2', 'PEO 3', 'PEO 4'];

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">Generate Consistency Matrix of Mission & PEOs</h3>
      <p className="text-sm text-slate-600">Generate and fill consistency values to validate Mission to PEO mapping.</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Mission \ PEO</th>
              {cols.map((col) => (
                <th key={col} className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700">{row}</td>
                {cols.map((col) => (
                  <td key={`${row}-${col}`} className="border-b border-slate-100 px-4 py-3">
                    <select className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
                      <option>0</option>
                      <option>1</option>
                      <option>2</option>
                      <option>3</option>
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DevelopCurriculumPanel() {
  const headers = ['Semester', 'Course Code', 'Course Title', 'Credits', 'Category'];

  return (
    <div className="space-y-5">
      <h3 className="text-xl font-semibold">Develop Curriculum</h3>
      <p className="text-sm text-slate-600">Table opens on the right side. You can fill prescribed format directly or use Excel-assisted input.</p>
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Upload Excel (Optional)</label>
        <input type="file" accept=".xlsx,.xls,.csv" className="block w-full text-sm" />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left font-semibold text-slate-700">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, index) => (
              <tr key={index}>
                {headers.map((header) => (
                  <td key={header} className="border-b border-slate-100 px-3 py-2">
                    <input className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs" placeholder={header} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionPanel({ step }: { step: ProcessStep }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-xl font-semibold">{step.title}</h3>
      <p className="text-sm text-slate-600">{step.description}</p>
      <div className="rounded-xl border border-slate-300 bg-white p-4">
        <p className="text-sm text-slate-700">Record status and communication reference numbers for this process step.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Mark In Progress</button>
          <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Mark Completed</button>
        </div>
      </div>
    </div>
  );
}

export default function ProcessStepPanel({ step }: ProcessStepPanelProps) {
  if (step.key === 'council') {
    return <AcademicCouncilForm />;
  }

  if (step.key === 'process-2') {
    return <SelectProgramPanel />;
  }

  if (step.key === 'process-3') {
    return <ProgramAdvisoryCommitteeForm />;
  }

  if (step.key === 'process-4') {
    return <BoardOfStudiesForm />;
  }

  if (step.key === 'process-5') {
    return <RepresentativeStakeholdersForm />;
  }

  if (step.key === 'process-6') {
    return <VisionMissionGenerator />;
  }

  if (step.key === 'process-7') {
    return <PeoGenerator />;
  }

  if (step.key === 'process-8') {
    return <ConsistencyMatrix />;
  }

  if (step.key === 'process-9') {
    return <ProgramOutcomesForm />;
  }

  if (step.key === 'process-10') {
    return <PsoGenerator />;
  }

  if (step.key === 'process-14') {
    return <DevelopCurriculumPanel />;
  }

  if (step.kind === 'action' || step.kind === 'info') {
    return <ActionPanel step={step} />;
  }

  return <SharedForm step={step} />;
}
