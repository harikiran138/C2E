"use client";

import Login from "@/components/institution/Login";
import { Suspense } from "react";

export default function InstituteLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading Security Context...</div>}>
      <Login />
    </Suspense>
  );
}
