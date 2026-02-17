import { motion, Variants } from 'framer-motion';
import Stats from '@/components/institution/dashboard/Stats';
import QuickActionBar from '@/components/institution/dashboard/QuickActionBar';
import { 
  BookOpen, 
  GraduationCap, 
  Layout, 
  FileText, 
  ClipboardCheck,
  Calendar,
  Target
} from 'lucide-react';

interface ProgramDashboardHomeProps {
  statsData: any;
  loading: boolean;
  programName?: string;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function ProgramDashboardHome({ statsData, loading, programName }: ProgramDashboardHomeProps) {
  
  const quickActions = [
    { label: 'Update Curriculum', icon: BookOpen, onClick: () => console.log('Curr'), variant: 'primary' as const },
    { label: 'Add Course', icon: Layout, onClick: () => console.log('Course') },
    { label: 'PEO/PSO Mapping', icon: Target, onClick: () => console.log('PEO') }, // Target imported below? No, need import
    { label: 'Assessment', icon: ClipboardCheck, onClick: () => console.log('Assess') },
    { label: 'Reports', icon: FileText, onClick: () => console.log('Reports') },
    { label: 'Schedule', icon: Calendar, onClick: () => console.log('Schedule') },
  ];

  if (loading) return null;

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* 1. Quick Actions */}
      <motion.div variants={item}>
        <QuickActionBar actions={quickActions} />
      </motion.div>

       {/* 2. Program Stats & Status */}
       <motion.div variants={item}>
          {/* Main Status Card */}
          <div className="space-y-6">
             <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Program Overview</h2>
                        <p className="text-slate-500">Academic Year 2023-2024</p>
                    </div>
                    <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">
                        ACTIVE
                    </div>
                </div>
                
                {/* Reusing Stats Component for now, but could be specific program stats */}
                <Stats data={statsData} />
             </div>

             {/* Modules / Processes Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <GraduationCap className="size-5 text-indigo-600" />
                        <h3 className="font-bold text-indigo-900">OBE Framework</h3>
                    </div>
                    <p className="text-sm text-indigo-700/80 mb-4">Framework definition and outcomes mapping status.</p>
                    <div className="w-full bg-white rounded-full h-2 mb-1 overflow-hidden">
                        <div className="bg-indigo-500 h-full w-[80%]" />
                    </div>
                    <div className="flex justify-between text-xs font-medium text-indigo-700">
                        <span>Progress</span>
                        <span>80%</span>
                    </div>
                 </div>

                 <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="size-5 text-teal-600" />
                        <h3 className="font-bold text-teal-900">Curriculum</h3>
                    </div>
                    <p className="text-sm text-teal-700/80 mb-4">Course definitions and syllabus structure.</p>
                     <div className="w-full bg-white rounded-full h-2 mb-1 overflow-hidden">
                        <div className="bg-teal-500 h-full w-[45%]" />
                    </div>
                    <div className="flex justify-between text-xs font-medium text-teal-700">
                        <span>Progress</span>
                        <span>45%</span>
                    </div>
                 </div>
             </div>
          </div>
       </motion.div>
    </motion.div>
  );
}


