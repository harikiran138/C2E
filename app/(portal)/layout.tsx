"use client";

import { InstitutionProvider } from "@/context/InstitutionContext";
import { Suspense } from "react";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useInstitution } from "@/context/InstitutionContext";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function PortalContent({ children }: { children: React.ReactNode }) {
  const { loading } = useInstitution();
  const pathname = usePathname();
  
  const showLoading = 
    loading && 
    !pathname.includes("/login") && 
    !pathname.includes("/signup");

  return (
    <>
      {showLoading && <LoadingScreen />}
      <main 
        className={cn(
          "relative min-h-screen overflow-x-hidden",
          (!pathname.includes("/login") && !pathname.includes("/signup")) && "pt-12 pb-24"
        )}
      >
        {children}
      </main>
    </>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <InstitutionProvider>
        <PortalContent>{children}</PortalContent>
      </InstitutionProvider>
    </Suspense>
  );
}
