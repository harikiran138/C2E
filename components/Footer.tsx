"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black/95 backdrop-blur-md text-white h-[120px] md:h-[100px] relative overflow-hidden border-t border-white/10 mt-auto flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
        >
          {/* Copyright */}
          <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-4">
            <span className="text-white font-black text-xl tracking-tighter brightness-150">
              C2X
            </span>
            <p className="text-[10px] md:text-[12px] font-bold tracking-[0.2em] text-gray-400 whitespace-nowrap">
              © {currentYear} Compliance to Excellence. All Rights Reserved.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-6 md:space-x-12">
            {["About", "Services", "Login"].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.5 }}
                viewport={{ once: true }}
              >
                <Link
                  href={item === "Login" ? "/login" : `/#${item.toLowerCase()}`}
                  className="text-[11px] md:text-[12px] font-black tracking-[0.2em] text-gray-400 hover:text-primary-gold transition-all duration-300 relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-primary-gold transition-all duration-300 group-hover:w-full" />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Social Icons */}
          <div className="flex items-center space-x-8">
            {[Linkedin, Twitter, Mail].map((Icon, i) => (
              <motion.a
                key={i}
                href="#"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.2, color: "#c9a961", y: -2 }}
                transition={{ delay: i * 0.1 + 0.8 }}
                viewport={{ once: true }}
                className="text-gray-400 transition-colors"
                aria-label="Social Link"
              >
                <Icon size={18} strokeWidth={2} />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
