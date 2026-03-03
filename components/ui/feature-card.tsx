"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  items: string[];
  index: number;
}

export const FeatureCard = ({
  icon: Icon,
  title,
  items,
  index,
}: FeatureCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.6 }}
    className="bg-primary-gold/[0.03] backdrop-blur-sm border border-primary-gold/10 p-8 rounded-[2rem] hover:border-[#c9a961]/50 transition-all duration-500 group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon className="h-24 w-24 text-[#c9a961] transform translate-x-8 -translate-y-8" />
    </div>

    <div className="flex items-center space-x-4 mb-6 relative z-10">
      <div className="p-3 bg-[#c9a961]/10 rounded-2xl group-hover:bg-[#c9a961]/20 transition-colors">
        <Icon className="h-6 w-6 text-[#c9a961]" />
      </div>
      <h4 className="text-black font-bold tracking-tight text-xl">{title}</h4>
    </div>

    <ul className="space-y-3 relative z-10">
      {items.map((item, idx) => (
        <li
          key={idx}
          className="flex items-start space-x-3 text-sm text-gray-600 group-hover:text-black transition-colors"
        >
          <div className="h-1.5 w-1.5 bg-[#c9a961] rounded-full mt-1.5 shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  </motion.div>
);
