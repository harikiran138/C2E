import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'outline';
}

interface QuickActionBarProps {
  actions: QuickAction[];
  className?: string;
}

export default function QuickActionBar({ actions, className }: QuickActionBarProps) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={action.onClick}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200 group text-sm font-medium",
            "hover:-translate-y-0.5 hover:shadow-sm",
            action.variant === 'primary' 
              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-md shadow-primary/20" 
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          <action.icon className={cn(
            "size-4",
            action.variant === 'primary' ? "text-primary-foreground" : "text-slate-500 group-hover:text-primary"
          )} />
          <span>{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
