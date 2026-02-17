import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "C2X | Compliance to Excellence",
  description: "A showcase of modern web development excellence. Institutional consultancy specializing in higher education compliance and OBE implementation.",
};

import { InstitutionProvider } from "@/context/InstitutionContext";

import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body 
        className={`${inter.variable} font-sans antialiased text-slate-800 bg-[#faf9f6]`}
        suppressHydrationWarning
      >
        <SmoothScrollProvider>
          <Suspense fallback={null}>
            <InstitutionProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </InstitutionProvider>
          </Suspense>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
