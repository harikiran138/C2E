import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-[#0f172a] text-white pt-24 pb-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c5a059] to-transparent opacity-30" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-16 relative z-10">
          {/* Logo & Info */}
          <div className="space-y-8 lg:col-span-1">
            <Link href="/" className="flex flex-col items-start -space-y-1">
              <span className="text-4xl font-black tracking-tighter text-white">
                C2E
              </span>
              <div className="h-1.5 w-16 bg-[#c5a059] rounded-full" />
            </Link>
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white tracking-tight">Compliance To Excellence</h4>
              <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-tighter">
                Empowering institutions to build OBE-driven ecosystems for sustainable innovation.
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-8">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#c5a059]">Quick Links</h4>
            <ul className="space-y-4">
              {['Home', 'About', 'Services', 'Institution Login'].map((item) => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase().replace(' ', '-')}`} className="text-xs font-bold uppercase tracking-tighter text-gray-400 hover:text-[#c5a059] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Mission */}
          <div className="space-y-8 lg:col-span-2">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#c5a059]">Our Mission</h4>
            <p className="text-xs text-gray-400 font-bold leading-loose uppercase tracking-tight max-w-sm">
              To build OBE-driven institutions that foster innovation and socially responsible graduates through comprehensive compliance frameworks.
            </p>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            © 2025 C2E: All Rights Reserved.
          </p>
          <div className="flex space-x-8">
             {/* Social or extra links could go here */}
          </div>
        </div>
      </div>
    </footer>
  );
}
