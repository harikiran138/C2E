import { motion, Variants } from 'framer-motion';
import ComplianceModule from '@/components/institution/dashboard/ComplianceModule';

interface InstitutionDashboardHomeProps {
  statsData: any;
  loading: boolean;
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

export default function InstitutionDashboardHome({ loading, statsData }: InstitutionDashboardHomeProps) {
  
  if (loading) return null;

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-[1400px] mx-auto px-4 sm:px-8 py-10 space-y-12 pb-20"
    >
      <motion.div variants={item} className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-8">
          <ComplianceModule statsData={statsData} />
      </motion.div>
    </motion.div>
  );
}
