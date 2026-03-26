import * as React from "react";
import { motion, Variants } from "framer-motion";

export const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 overflow-hidden">
    {children}
  </div>
);

export const SectionTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="mb-12">
    <h2 className="text-3xl font-bold tracking-tight text-foreground">
      {title}
    </h2>
    <p className="text-muted-foreground text-sm mt-1 font-medium">{subtitle}</p>
  </div>
);

// Animation variants
export const fadeIn: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: "easeIn" } },
};
