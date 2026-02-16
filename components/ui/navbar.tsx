"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { LucideIcon, LogIn, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const [activeTab, setActiveTab] = useState(items[0].name)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = items.filter(item => item.name !== "Login")
  const loginLink = items.find(item => item.name === "Login")

  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 sm:px-12 lg:px-20",
          isScrolled ? "py-4" : "py-6 pt-8",
          className
        )}
      >
        <div className={cn(
          "max-w-7xl mx-auto flex items-center justify-between transition-all duration-300",
          isScrolled ? "bg-white/90 backdrop-blur-xl border border-[#c9a961]/20 rounded-full px-6 py-2 shadow-xl shadow-black/5" : "bg-transparent py-2"
        )}>
          {/* Left Side: Logo & Menu */}
          <div className="flex items-center gap-8 lg:gap-12">
            {/* Logo */}
            <Link href="/" className="shrink-0 relative">
              <div className="relative w-12 md:w-16 h-12 md:h-16 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isScrolled ? "scrolled" : "initial"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Image 
                      src="/C2XPlus.jpeg" 
                      alt="C2X Logo" 
                      width={100} 
                      height={100} 
                      className={cn(
                        "w-full h-full object-contain transition-all duration-300 rounded-xl",
                        !isScrolled && "brightness-110 drop-shadow-[0_0_15px_rgba(201,169,97,0.4)]"
                      )}
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </Link>

            {/* Desktop Menu Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const isActive = activeTab === item.name
                return (
                  <Link
                    key={item.name}
                    href={item.url}
                    onClick={() => setActiveTab(item.name)}
                    className={cn(
                    "relative px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase transition-all duration-300",
                    isActive ? "text-[#c9a961]" : "text-[#c9a961]/70 hover:text-[#c9a961]"
                  )}
                  >
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-[#c9a961]/10 rounded-full -z-10 shadow-[0_0_15px_rgba(201,169,97,0.1)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Side: Login & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            {loginLink && (
              <Link
                href={loginLink.url}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black tracking-widest uppercase transition-all duration-500",
                  isScrolled 
                    ? "bg-[#c9a961] text-black shadow-lg shadow-[#c9a961]/20 hover:scale-105" 
                    : "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:border-[#c9a961]/50"
                )}
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "md:hidden p-2 rounded-full transition-colors",
                isScrolled ? "bg-[#c9a961]/10 text-[#c9a961]" : "bg-white/10 text-white"
              )}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 md:hidden pt-24 px-6 bg-white/95 backdrop-blur-2xl"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((item) => (
                <Link
                  key={item.name}
                  href={item.url}
                  onClick={() => {
                    setActiveTab(item.name)
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center justify-between py-4 border-b border-gray-100 group"
                >
                  <span className="text-2xl font-black text-[#c9a961] tracking-tighter transition-colors">
                    {item.name}
                  </span>
                  <item.icon className="text-[#c9a961] h-6 w-6" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
