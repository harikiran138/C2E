"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export const SectionHeader = ({
  title,
  subtitle,
  centered = false,
  className,
}: SectionHeaderProps) => (
  <div className={cn("mb-12", centered && "text-center", className)}>
    <motion.div
      initial={{ opacity: 0, x: centered ? 0 : -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className={cn(
        "flex items-center space-x-3 mb-4",
        centered && "justify-center",
      )}
    >
      <div className="h-px w-12 bg-[#c9a961]" />
      <span className="text-[#c9a961] text-xs font-black tracking-[0.3em] uppercase">
        {title}
      </span>
      {centered && <div className="h-px w-12 bg-[#c9a961]" />}
    </motion.div>
    {subtitle && (
      <h3
        className={cn(
          "text-2xl md:text-4xl text-black font-bold leading-tight tracking-tight",
          centered && "max-w-2xl mx-auto",
        )}
      >
        {subtitle}
      </h3>
    )}
  </div>
);
