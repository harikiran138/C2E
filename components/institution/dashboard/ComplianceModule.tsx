"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  X,
  Eye,
  Plus,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  Loader2
} from 'lucide-react';
import * as Icons from 'lucide-react';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// Internal UI Components to avoid missing dependencies
const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'secondary' | 'destructive' | 'outline' }) => {
  const variants = {
    default: "bg-indigo-600 text-white",
    secondary: "bg-slate-100 text-slate-900",
    destructive: "bg-red-600 text-white",
    outline: "border border-slate-200 text-slate-600"
  };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
};

const Button = ({ children, onClick, variant = 'default', className }: { children: React.ReactNode, onClick?: () => void, variant?: 'default' | 'outline' | 'ghost', className?: string }) => {
  const variants = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    outline: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-50"
  };
  return (
    <button onClick={onClick} className={cn("inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200", variants[variant], className)}>
      {children}
    </button>
  );
};

interface ComplianceItem {
  id: string;
  category: string;
  requirement: string;
  status: 'compliant' | 'warning' | 'critical' | 'pending';
  lastReview: string;
  nextReview: string;
  assignee: string;
  department: string;
  progress: number;
  documents: number;
}

interface ComplianceStats {
  totalRequirements: number;
  compliant: number;
  warnings: number;
  critical: number;
  complianceRate: number;
}

const DEMO_COMPLIANCE_DATA: ComplianceItem[] = [
  {
    id: "ACC-001",
    category: "NAAC",
    requirement: "Criteria 1: Curricular Aspects - Feedback System",
    status: "compliant",
    lastReview: "2024-01-15",
    nextReview: "2024-04-15",
    assignee: "Dr. Sarah Miller",
    department: "Academic Affairs",
    progress: 100,
    documents: 12
  },
  {
    id: "ACC-002",
    category: "NBA",
    requirement: "Tier-1 Accreditation - SAR Documentation",
    status: "warning",
    lastReview: "2024-01-10",
    nextReview: "2024-02-10",
    assignee: "Prof. Michael Chen",
    department: "Engineering",
    progress: 75,
    documents: 8
  },
  {
    id: "UGC-003",
    category: "Governance",
    requirement: "Statutory Body Meetings & Minutes",
    status: "critical",
    lastReview: "2023-12-20",
    nextReview: "2024-01-20",
    assignee: "Registrar Office",
    department: "Administration",
    progress: 45,
    documents: 5
  },
  {
    id: "AICTE-004",
    category: "Compliance",
    requirement: "Mandatory Disclosure - Extension of Approval",
    status: "compliant",
    lastReview: "2024-01-12",
    nextReview: "2024-04-12",
    assignee: "Admin Head",
    department: "Administration",
    progress: 100,
    documents: 15
  }
];

const calculateStats = (data: ComplianceItem[]): ComplianceStats => {
  const compliant = data.filter(item => item.status === 'compliant').length;
  const warnings = data.filter(item => item.status === 'warning').length;
  const critical = data.filter(item => item.status === 'critical').length;

  return {
    totalRequirements: data.length,
    compliant,
    warnings,
    critical,
    complianceRate: Math.round((compliant / data.length) * 100)
  };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'compliant':
      return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20';
    case 'warning':
      return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20';
    case 'critical':
      return 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20';
    case 'pending':
      return 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-100';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'compliant':
      return <CheckCircle2 className="w-5 h-5" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5" />;
    case 'critical':
      return <AlertTriangle className="w-5 h-5" />;
    case 'pending':
      return <Clock className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
};

export default function ComplianceModule({ statsData }: { statsData: any }) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    program_name: '',
    degree: 'B.Tech',
    academic_year: '2024-25',
    program_code: '',
    level: 'Undergraduate',
    duration: 4,
    intake: 60
  });

  const [filter, setFilter] = useState<string>('all');
  const stats = calculateStats(DEMO_COMPLIANCE_DATA);

  const filteredData = DEMO_COMPLIANCE_DATA.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const institutionalStats = [
    {
      id: "PRG-001",
      label: "Total Programs",
      value: statsData?.totalPrograms || 0,
      sub: "Active academic programs",
      icon: Icons.LayoutGrid,
      color: "blue",
      action: {
        label: "Add Program",
        icon: Icons.Plus,
        onClick: () => router.push('/institution/programs')
      }
    },
    {
      id: "AC-001",
      label: "Academic Council",
      value: statsData?.academicCouncilMembers || 0,
      sub: "Institutional Governance",
      icon: Icons.GraduationCap,
      color: "teal"
    },
    {
      id: "OBE-001",
      label: "OBE Frameworks",
      value: statsData?.obeFrameworkCount || 0,
      sub: "Active frameworks",
      icon: Icons.BookOpen,
      color: "purple"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-600 shadow-blue-200 border-blue-50 text-blue-600",
      purple: "bg-purple-600 shadow-purple-200 border-purple-50 text-purple-600",
      indigo: "bg-indigo-600 shadow-indigo-200 border-indigo-50 text-indigo-600",
      teal: "bg-teal-600 shadow-teal-200 border-teal-50 text-teal-600"
    };
    return colors[color];
  };

  const getBgClasses = (color: string) => {
    const bgs: Record<string, string> = {
      blue: "bg-blue-50/50 border-blue-100/50",
      purple: "bg-purple-50/50 border-purple-100/50",
      indigo: "bg-indigo-50/50 border-indigo-100/50",
      teal: "bg-teal-50/50 border-teal-100/50"
    };
    return bgs[color];
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/institution/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsAddModalOpen(false);
        // Refresh page or update state optimistically
        router.refresh();
        setFormData({
          program_name: '',
          degree: 'B.Tech',
          academic_year: '2024-25',
          program_code: '',
          level: 'Undergraduate',
          duration: 4,
          intake: 60
        });
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to create program');
      }
    } catch (error) {
      console.error('Error creating program:', error);
      alert('Internal Server Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-12">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {institutionalStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "group relative overflow-hidden bg-white border border-slate-200/60 rounded-3xl p-6 hover:shadow-xl transition-all duration-300",
                getBgClasses(stat.color)
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                  stat.color === 'blue' ? 'bg-blue-600' :
                    stat.color === 'purple' ? 'bg-purple-600' :
                      stat.color === 'indigo' ? 'bg-indigo-600' : 'bg-teal-600'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.id}</p>
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", getColorClasses(stat.color).split(' ').pop())}>
                    Live
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                  </div>
                </div>

                {stat.action && (
                  <button
                    onClick={stat.action.onClick}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                    {stat.action.label}
                  </button>
                )}
              </div>

              <p className="text-[10px] font-semibold text-slate-400 mt-2 italic">{stat.sub}</p>

              {/* Decorative element */}
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-150 transition-transform duration-700">
                <Icon className="w-20 h-20" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Programs List Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Institutional Programs
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest">
                {statsData?.programs?.length || 0}
              </span>
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage academic governance across all departments</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Program
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {statsData?.programs && statsData.programs.length > 0 ? (
            statsData.programs.map((prog: any, index: number) => (
              <motion.div
                key={prog.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="group bg-white/50 border border-slate-200/60 rounded-3xl p-5 hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{prog.program_code}</span>
                      <div className="h-1 w-1 bg-slate-200 rounded-full" />
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{prog.degree}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{prog.program_name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {prog.level} • {prog.academic_year}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Created</p>
                    <p className="text-[11px] font-bold text-slate-700">{new Date(prog.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/institution/programs?id=${prog.id}`)}
                    className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 hover:shadow-lg transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
              <LayoutGrid className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No programs found</p>
              <button
                onClick={() => router.push('/institution/programs')}
                className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
              >
                Add your first program
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-slate-200 rounded-[2.5rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors group"
              >
                <X className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </button>

              <div className="flex items-start gap-5 mb-8">
                <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2", getStatusColor(selectedItem.status))}>
                  {getStatusIcon(selectedItem.status)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="uppercase tracking-widest">{selectedItem.id}</Badge>
                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 shadow-none uppercase tracking-widest text-[10px] font-black">{selectedItem.category}</Badge>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedItem.requirement}</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Lead</p>
                  <p className="text-sm font-black text-slate-900">{selectedItem.assignee}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{selectedItem.department}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Review Cycle</p>
                  <p className="text-sm font-black text-slate-900">{selectedItem.lastReview}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Last Assessment</p>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-widest">
                  <span className="text-slate-400">Technical Readiness</span>
                  <span className="text-indigo-600">{selectedItem.progress}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      selectedItem.status === 'compliant' ? 'bg-emerald-500' :
                        selectedItem.status === 'warning' ? 'bg-amber-500' :
                          selectedItem.status === 'critical' ? 'bg-rose-500' : 'bg-indigo-500'
                    )}
                    style={{ width: `${selectedItem.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="flex-1 gap-2 h-14 rounded-2xl">
                  <Eye className="w-5 h-5" />
                  Review Documentation ({selectedItem.documents})
                </Button>
                <Button variant="outline" className="flex-1 gap-2 h-14 rounded-2xl border-2">
                  <TrendingUp className="w-5 h-5" />
                  Update Progress
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Program Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[110] p-4"
            onClick={() => setIsAddModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl relative"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add New Program</h2>
                  <p className="text-xs text-slate-500">Initialize a new academic program</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors group"
                >
                  <X className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
                </button>
              </div>

              <form onSubmit={handleCreateProgram} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Program Name</label>
                  <input
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="e.g. Computer Science and Engineering"
                    value={formData.program_name}
                    onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Program Code</label>
                    <input
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                      placeholder="e.g. CSE"
                      value={formData.program_code}
                      onChange={(e) => setFormData({ ...formData, program_code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Degree Type</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                      value={formData.degree}
                      onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    >
                      <option>B.Tech</option>
                      <option>M.Tech</option>
                      <option>B.Sc</option>
                      <option>M.Sc</option>
                      <option>PhD</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic Year</label>
                  <input
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                    placeholder="e.g. 2024-25"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Program
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
