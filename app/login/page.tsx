"use client";

import SystemLogin from "@/components/institution/SystemLogin";
import { Suspense } from "react";

export default function SystemLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-foreground tracking-widest uppercase font-bold">Authenticating System Context...</div>}>
      {/* 
        v5.1: We use the premium SystemLogin UI for Super Admin System Access. 
      */}
      <SystemLogin />
    </Suspense>
  );
}
