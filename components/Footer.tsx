"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#111827] text-white pt-32 pb-12 relative overflow-hidden">
      {/* Background Micro-particles */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute bg-primary-gold rounded-full blur-[1px] animate-pulse"
            style={{
              width: Math.random() * 4 + 'px',
              height: Math.random() * 4 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 3 + 2 + 's'
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-20 xl:gap-32 mb-20">
          {/* Company Identity */}
          <div className="space-y-8">
            <Link href="/" className="inline-block">
              <span className="text-5xl font-black tracking-tighter text-white">
                C2E
              </span>
              <div className="h-2 w-full bg-primary-gold rounded-full" />
            </Link>
            <div className="space-y-4">
              <h4 className="text-2xl font-black text-white/90">Compliance To Excellence</h4>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                Empowering institutions to build OBE-driven ecosystems for sustainable innovation and academic leadership.
              </p>
            </div>
            <div className="flex space-x-6">
              {[Linkedin, Twitter, Github, Mail].map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ y: -5, color: '#c9a961' }}
                  className="text-gray-400 transition-colors"
                >
                  <Icon size={24} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-10">
            <h4 className="text-sm font-black uppercase tracking-[0.3em] text-primary-gold border-l-4 border-primary-gold pl-4">
              Quick Navigation
            </h4>
            <nav className="flex flex-col space-y-6">
              {["Home", "About", "Services", "Institution Login"].map((item) => (
                <Link
                  key={item}
                  href={item === "Home" ? "/" : `/#${item.toLowerCase()}`}
                  className="text-lg font-bold text-gray-300 hover:text-white transition-colors group flex items-center"
                >
                  <span className="h-px w-0 bg-primary-gold transition-all duration-300 group-hover:w-6 mr-0 group-hover:mr-4" />
                  {item}
                </Link>
              ))}
            </nav>
          </div>

          {/* Mission & Contact */}
          <div className="space-y-10">
            <h4 className="text-sm font-black uppercase tracking-[0.3em] text-primary-gold border-l-4 border-primary-gold pl-4">
              Our Vision
            </h4>
            <div className="space-y-6">
                <p className="text-xl font-serif italic text-gray-400 leading-relaxed">
                    "To build OBE-driven institutions that foster disruptive innovation and socially responsible graduates."
                </p>
                <div className="pt-8 space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-600">Contact Us</p>
                    <p className="text-lg font-bold text-white">contact@c2e-excellence.com</p>
                </div>
            </div>
          </div>
        </div>

        {/* Legal & Copyright */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <p className="text-xs font-black uppercase tracking-widest text-gray-500">
            © {currentYear} C2E: Compliance To Excellence. All Rights Reserved.
          </p>
          <div className="flex space-x-8">
            {["Privacy Policy", "Terms of Service", "Cookies"].map((legal) => (
              <Link key={legal} href="#" className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-primary-gold transition-colors">
                {legal}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
