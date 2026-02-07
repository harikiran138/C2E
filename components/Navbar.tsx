"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/#about" },
    { name: "Services", href: "/#services" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled ? "glass-nav py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="relative group flex flex-col items-center">
            <span className={`text-2xl font-black tracking-tighter transition-colors text-primary-dark`}>
              C2E
            </span>
            <div className="w-full h-1.5 bg-primary-gold rounded-full -mt-1 scale-x-110" style={{ borderRadius: '0 0 100% 100%' }} />
          </Link>

          {/* Center Links (Desktop) */}
          <div className="hidden md:flex flex-1 justify-center items-center space-x-12">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`text-xs font-black uppercase tracking-[0.2em] transition-colors relative group text-primary-dark hover:text-primary-gold`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Login Button (Desktop) */}
          <div className="hidden md:block">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs shadow-xl transition-all duration-500 ${
                  scrolled
                    ? "bg-primary-dark text-white hover:bg-primary-gold"
                    : "bg-white text-primary-dark hover:bg-primary-gold hover:text-white"
                }`}
              >
                Institution Login
              </motion.button>
            </Link>
          </div>

          {/* Hamburger (Mobile) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={scrolled ? "text-primary-dark" : "text-white"}
            >
              {mobileMenuOpen ? <X size={32} /> : <Menu size={32} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100vh" }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed inset-0 bg-primary-dark z-[60] flex flex-col items-center justify-center space-y-12 px-8"
          >
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-10 right-10 text-white"
            >
              <X size={48} />
            </button>
            {navLinks.map((link, idx) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-4xl font-black text-white hover:text-primary-gold uppercase tracking-tighter"
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="px-12 py-5 bg-primary-gold text-white rounded-full font-black uppercase tracking-widest text-lg shadow-2xl">
                  Institution Login
                </button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
