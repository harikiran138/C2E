"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useInstitution } from "@/context/InstitutionContext";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isInstitutionSection = pathname?.startsWith("/institution");
  const isProgramSection = pathname?.startsWith("/program");
  const isStakeholderSection = pathname?.startsWith("/stakeholder");
  const isSystemLogin = pathname === "/login";
  const isPortalSection = isInstitutionSection || isProgramSection || isStakeholderSection || isSystemLogin;
  const { loading } = useInstitution();

  const showLoading =
    isInstitutionSection &&
    loading &&
    !pathname.includes("/login") &&
    !pathname.includes("/signup");

  return (
    <>
      {showLoading && <LoadingScreen />}
      {!isPortalSection && <Navbar />}
      <main className="min-h-screen overflow-x-hidden">{children}</main>
      {!isPortalSection && <Footer />}
    </>
  );
}
