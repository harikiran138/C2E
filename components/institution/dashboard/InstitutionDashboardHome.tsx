import { motion, Variants } from "framer-motion";
import ComplianceModule from "@/components/institution/dashboard/ComplianceModule";

interface InstitutionDashboardHomeProps {
  statsData: any;
  loading: boolean;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function InstitutionDashboardHome({
  loading,
  statsData,
}: InstitutionDashboardHomeProps) {
  if (loading) return null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-[1400px] mx-auto py-4 space-y-10 pb-20"
    >
      <motion.div variants={item}>
        <ComplianceModule statsData={statsData} />
      </motion.div>
    </motion.div>
  );
}
