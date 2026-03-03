"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[#faf9f6] opacity-50" />

      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 size-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 size-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse delay-700" />

      <div className="relative flex flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative size-24 md:size-32"
        >
          <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl animate-pulse" />
          <Image
            src="/C2XPlus.jpeg"
            alt="C2X Plus"
            fill
            className="object-contain rounded-3xl shadow-2xl relative z-10"
            priority
          />
        </motion.div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground animate-pulse">
              Synchronizing Workspace...
            </span>
          </div>

          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs font-medium text-muted-foreground/60 italic"
        >
          Preparing your institutional compliance dashboard
        </motion.p>
      </div>
    </div>
  );
}
