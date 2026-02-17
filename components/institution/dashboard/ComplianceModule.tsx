"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  TrendingUp,
  Calendar,
  Users,
  Building2,
  ChevronRight,
  X,
  Download,
  Eye
} from 'lucide-react';

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

export default function ComplianceModule() {
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const stats = calculateStats(DEMO_COMPLIANCE_DATA);

  const filteredData = DEMO_COMPLIANCE_DATA.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white/40 backdrop-blur-xl p-8 shadow-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />
        
        <div className="relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Compliance & Accreditation</h2>
                <p className="text-sm font-medium text-slate-500">Institutional Regulatory Tracking Status</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
                 <Button variant="outline" className="gap-2 shadow-sm">
                    <Download className="w-4 h-4" />
                    Export Audit
                </Button>
                <Button className="gap-2 shadow-lg shadow-indigo-200">
                    <TrendingUp className="w-4 h-4" />
                    New Assessment
                </Button>
            </div>
          </div>

        </div>
      </motion.div>

      {/* Content Area */}
      <div className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredData.map((item, index) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedItem(item)}
                    className="group relative bg-white border border-slate-200/60 rounded-3xl p-6 cursor-pointer hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all duration-300"
                >
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", getStatusColor(item.status))}>
                                {getStatusIcon(item.status)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.id}</span>
                                    <div className="h-1 w-1 bg-slate-300 rounded-full" />
                                    <span className="text-xs font-bold text-indigo-600">{item.category}</span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">{item.requirement}</h3>
                            </div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                            <span className="text-slate-400">Implementation Progress</span>
                            <span className="text-slate-900">{item.progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.progress}%` }}
                                transition={{ duration: 1, ease: "circOut" }}
                                className={cn(
                                    "h-full rounded-full",
                                    item.status === 'compliant' ? 'bg-emerald-500' :
                                    item.status === 'warning' ? 'bg-amber-500' :
                                    item.status === 'critical' ? 'bg-rose-500' : 'bg-indigo-500'
                                )}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                <Users className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Owner</p>
                                <p className="text-xs font-bold text-slate-900 truncate">{item.assignee}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Due Date</p>
                                <p className="text-xs font-bold text-slate-900 truncate">{item.nextReview}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
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
    </div>
  );
}
