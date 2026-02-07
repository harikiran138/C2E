"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Shield } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "glass-nav py-3" : "bg-transparent py-5"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex flex-col items-start -space-y-1">
              <span className={`text-3xl font-black tracking-tighter ${scrolled ? "text-primary" : "text-primary-dark"}`}>
                C2E
              </span>
              <div className="h-1.5 w-full bg-accent rounded-full opacity-80" />
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-12">
            <Link href="/" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors">Home</Link>
            <Link href="/about" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors">About</Link>
            <Link href="/services" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors">Services</Link>
          </div>

          <div className="hidden md:flex items-center">
            <Link 
              href="/login" 
              className="inline-flex items-center px-6 py-2.5 bg-white border border-gray-100 text-sm font-bold rounded-lg shadow-sm text-gray-900 transition-all duration-200 hover:shadow-md hover-lift focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Institution Login
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-primary hover:bg-primary/10 transition-colors"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden glass-nav absolute top-full left-0 w-full animate-in slide-in-from-top duration-300">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 shadow-xl">
            <Link href="/" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:bg-primary/10">Home</Link>
            <Link href="/about" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:bg-primary/10">About</Link>
            <Link href="/services" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:bg-primary/10">Services</Link>
            <Link href="/login" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-semibold text-primary">Institution Login</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
