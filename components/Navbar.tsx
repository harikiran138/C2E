"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeSection, setActiveSection] = useState("Exploring");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const name = id === "hero" ? "Overview" : id.charAt(0).toUpperCase() + id.slice(1);
          setActiveSection(name);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = ["hero", "about", "services"];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/#about" },
    { name: "Services", href: "/#services" },
  ];

  const isCollapsed = scrolled && !isHovered;

  return (
    <nav 
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div 
        layout
        animate={{
          width: isCollapsed ? "200px" : "auto",
          paddingLeft: isCollapsed ? "0px" : "24px",
          paddingRight: isCollapsed ? "0px" : "24px",
        }}
        transition={{ 
          type: "spring", 
          stiffness: 150, 
          damping: 22,
          mass: 1.2,
          layout: { duration: 0.5, ease: "circOut" }
        }}
        className={`mx-auto flex items-center justify-center h-[56px] rounded-[2rem] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl transition-colors duration-500 ${
          scrolled ? "bg-black/40" : "bg-white/5"
        }`}
      >
        <div className="flex items-center">
          <AnimatePresence mode="wait">
            {isCollapsed ? (
              <motion.div
                key="menu-label"
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                className="flex items-center justify-center space-x-2 text-white"
              >
                <span className="text-[11px] font-black tracking-[0.3em] whitespace-nowrap">
                  {activeSection}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="nav-links"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex items-center"
              >
                {/* Links (Desktop) */}
                <div className="hidden md:flex items-center space-x-10">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="text-[12px] font-black tracking-[0.2em] transition-colors relative group text-white hover:text-primary-gold"
                    >
                      {link.name}
                    </Link>
                  ))}
                  
                  <Link href="/login">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-2 rounded-full font-black tracking-widest text-[10px] shadow-xl transition-all duration-500 bg-white text-primary-dark hover:bg-primary-gold hover:text-white border border-white/20 ml-8"
                    >
                      Login
                    </motion.button>
                  </Link>
                </div>

                <div className="md:hidden flex items-center px-4">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-white hover:text-primary-gold transition-colors"
                  >
                    <Menu size={24} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-[90vw] bg-primary-dark/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center space-y-8 shadow-2xl z-[60]"
          >
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-6 right-8 text-white/50 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            {navLinks.map((link, idx) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-2xl font-black text-white hover:text-primary-gold tracking-tighter"
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <button className="w-full py-4 bg-primary-gold text-white rounded-full font-black tracking-widest text-sm shadow-2xl">
                Institution Login
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
