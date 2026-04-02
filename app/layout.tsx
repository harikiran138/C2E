import type { Metadata } from "next";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import { env } from "@/lib/env"; // This triggers environment validation on server start

export const metadata: Metadata = {
  title: "C2X | Compliance to Excellence",
  description:
    "A showcase of modern web development excellence. Institutional consultancy specializing in higher education compliance and OBE implementation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Accessing env to ensure it's evaluated
  const _ = env;

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head />
      <body
        className="font-sans antialiased text-slate-800 bg-[#faf9f6]"
        suppressHydrationWarning
      >
        <SmoothScrollProvider>
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
