"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Home, Briefcase, Phone, Menu, X, LogIn } from "lucide-react";

// Magnetic Button Component for premium feel
const MagneticButton: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = "", onClick }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = e;
    const { width, height, left, top } = e.currentTarget.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.3;
    const y = (clientY - (top + height / 2)) * 0.3;
    setPosition({ x, y });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      onClick={onClick}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.button>
  );
};

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("Home");
  const { scrollY } = useScroll();

  // Premium scroll transformations
  const navOpacity = useTransform(scrollY, [0, 100], [1, 1]);
  const navScale = useTransform(scrollY, [0, 100], [1, 0.95]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
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
          const name = id === "hero" ? "Home" : id.charAt(0).toUpperCase() + id.slice(1);
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
    { name: "Home", href: "/", icon: Home },
    { name: "About", href: "/#about", icon: Briefcase },
    { name: "Services", href: "/#services", icon: Phone },
  ];

  return (
    <>
      <motion.nav
        style={{ opacity: navOpacity, scale: navScale }}
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
          isScrolled ? "top-4" : "top-6"
        }`}
      >
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className={`relative backdrop-blur-xl bg-black/40 border border-[#c9a961]/30 rounded-full shadow-2xl transition-all duration-500 overflow-hidden ${
            isScrolled ? "px-6 py-2" : "px-8 py-3"
          }`}
          style={{
            boxShadow: "0 8px 32px rgba(201, 169, 97, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          
          {/* Golden glow effect */}
          <div className="absolute inset-0 rounded-full opacity-30 blur-xl bg-gradient-to-r from-[#c9a961]/20 via-transparent to-[#c9a961]/20 pointer-events-none" />

          <div className="relative flex items-center gap-2">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activeSection === link.name;
                
                return (
                  <Link key={link.name} href={link.href}>
                    <MagneticButton
                      className="relative group px-6 py-2 rounded-full transition-all duration-300"
                    >
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute inset-0 bg-gradient-to-br from-[#c9a961] to-[#a88a4d] rounded-full"
                            style={{
                              boxShadow: "0 0 20px rgba(201, 169, 97, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                            }}
                          />
                        )}
                      </AnimatePresence>
                      
                      <span className="relative flex items-center gap-2 text-[11px] font-black tracking-widest uppercase">
                        <Icon
                          className={`w-3.5 h-3.5 transition-all duration-300 ${
                            isActive ? "text-black" : "text-white/70 group-hover:text-[#c9a961]"
                          }`}
                        />
                        <span
                          className={`transition-all duration-300 ${
                            isActive ? "text-black" : "text-white/70 group-hover:text-white"
                          }`}
                        >
                          {link.name}
                        </span>
                      </span>
                    </MagneticButton>
                  </Link>
                );
              })}
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-6 bg-gradient-to-b from-transparent via-[#c9a961]/50 to-transparent mx-2" />

            {/* Login Button - Desktop */}
            <Link href="/institution/login">
              <MagneticButton className="hidden md:block relative group px-6 py-2 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#c9a961] to-[#a88a4d] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_15px_rgba(201,169,97,0.4)]" />
                <span className="relative text-[11px] font-black tracking-widest uppercase text-[#c9a961] group-hover:text-black transition-colors duration-300 flex items-center gap-2">
                  <LogIn className="w-3.5 h-3.5" />
                  Login
                </span>
              </MagneticButton>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-white/70 hover:text-[#c9a961] transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </motion.div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45]"
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 25 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm md:hidden"
            >
              <div
                className="backdrop-blur-2xl bg-black/80 border border-[#c9a961]/30 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#c9a961]/5 to-transparent pointer-events-none" />
                
                <div className="flex flex-col gap-4 relative z-10">
                  {navLinks.map((link, idx) => {
                    const Icon = link.icon;
                    const isActive = activeSection === link.name;
                    
                    return (
                      <Link key={link.name} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                            isActive
                              ? "bg-gradient-to-br from-[#c9a961] to-[#a88a4d] text-black shadow-[0_0_20px_rgba(201,169,97,0.3)]"
                              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-black text-sm tracking-widest uppercase">{link.name}</span>
                        </motion.div>
                      </Link>
                    );
                  })}
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-[#c9a961]/30 to-transparent my-4" />
                  
                  <Link href="/institution/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-gradient-to-br from-[#c9a961] to-[#a88a4d] text-black font-black text-sm tracking-widest uppercase shadow-xl"
                    >
                      <LogIn className="w-5 h-5" />
                      Login
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
