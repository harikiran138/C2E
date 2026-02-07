"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#111827] text-white h-[60px] md:h-[50px] relative overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex flex-col md:flex-row justify-between items-center h-full space-y-1 md:space-y-0 py-2 md:py-0">
          {/* Copyright */}
          <div className="flex items-center space-x-3">
              <span className="text-primary-gold font-black text-sm tracking-tighter">C2E</span>
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
                © {currentYear} Compliance To Excellence. All Rights Reserved.
              </p>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:flex space-x-6">
            {["About", "Services", "Login", "Privacy"].map((item) => (
              <Link
                key={item}
                href={item === "Login" ? "/login" : item === "Privacy" ? "#" : `/#${item.toLowerCase()}`}
                className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-primary-gold transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Social Icons */}
          <div className="flex items-center space-x-6">
            {[Linkedin, Twitter, Mail].map((Icon, i) => (
              <motion.a
                key={i}
                href="#"
                whileHover={{ scale: 1.1, color: '#c9a961' }}
                className="text-gray-500 transition-colors"
              >
                <Icon size={14} />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
