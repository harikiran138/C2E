'use client';

import { usePathname } from 'next/navigation';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Check if we are in the institution section, but NOT on the login page if you want login to have global nav? 
  // Actually, user probably wants institution login to look standout or maybe global nav is fine there?
  // The user said "dashboard re degin why ther is a meanu bar".
  // Usually login pages have minimal nav.
  // The previous Login redesign has its own split layout. The global navbar might overlap or look weird.
  // Let's exclude ALL /institution routes from global nav.
  
  const isInstitutionSection = pathname?.startsWith('/institution');

  return (
    <>
      {!isInstitutionSection && <Navbar />}
      <main className="min-h-screen overflow-x-hidden">
        {children}
      </main>
      {!isInstitutionSection && <Footer />}
    </>
  );
}
