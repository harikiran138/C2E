import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="relative min-h-screen overflow-x-hidden pt-20 pb-12">
        {children}
      </main>
      <Footer />
    </>
  );
}
