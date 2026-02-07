"use client";

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { useRef, useState, useEffect } from "react";
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MagneticButton from './MagneticButton';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const bgRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [sparkles, setSparkles] = useState<{x: string, y: string, delay: number, dur: number}[]>([]);
  const [stars, setStars] = useState<{x: string, y: string, delay: number, dur: number}[]>([]);

  useEffect(() => {
    setMounted(true);
    // Generate sparkles only on client to avoid hydration mismatch
    const newSparkles = [...Array(15)].map(() => ({
      x: `${Math.random() * 100}%`,
      y: "100%",
      delay: Math.random() * 5,
      dur: 2 + Math.random() * 3
    }));
    const newStars = [...Array(10)].map(() => ({
      x: `${Math.random() * 100}%`,
      y: `${60 + Math.random() * 40}%`,
      delay: Math.random() * 4,
      dur: 3 + Math.random() * 2
    }));
    setSparkles(newSparkles);
    setStars(newStars);
  }, []);

  useEffect(() => {
    if (bgRef.current) {
      // Parallax + Zoom Effect
      gsap.to(bgRef.current, {
        yPercent: 20,
        scale: 1.25,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }
  }, []);

  const titleWords = "Compliance To Excellence".split(" ");

  const containerVars = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.4,
      },
    },
  };

  const wordVars = {
    hidden: { opacity: 0, y: 60, rotateX: -45 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      } as any,
    },
  };

  return (
    <section ref={containerRef} className="relative h-[90vh] min-h-[800px] flex items-center overflow-hidden bg-primary-dark pt-16 pb-40">
      {/* Background Image with Parallax */}
      <div ref={bgRef} className="absolute inset-0 z-0 scale-110">
        <Image
          src="/images/hero.png"
          alt="C2E Hero"
          fill
          priority
          className="object-cover object-[center_top] brightness-105 contrast-[0.9] opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-white/20 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col items-end md:pr-0 text-left space-y-8 md:space-y-6">
          <motion.div 
            variants={containerVars}
            initial="hidden"
            animate="visible"
            className="space-y-4 max-w-2xl -mt-12 flex flex-col items-start md:-mr-[50px]"
          >
            <h1 className="flex flex-col gap-y-1 text-left items-start">
              <span className="overflow-hidden inline-block py-0">
                <motion.span 
                  variants={wordVars}
                  className="inline-block text-[36px] md:text-[50px] text-black font-sans font-black leading-[1.05] uppercase tracking-tighter"
                >
                  Compliance
                </motion.span>
              </span>
              <span className="overflow-hidden inline-block py-0">
                <motion.span 
                  variants={wordVars}
                  className="inline-block text-[36px] md:text-[50px] text-black font-sans font-black leading-[1.05] uppercase tracking-tighter"
                >
                  To Excellence
                </motion.span>
              </span>
            </h1>
            <motion.p 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-base md:text-[20px] text-[#a6423d] font-bold tracking-tight text-left leading-tight"
            >
              Stand confident, stay competent, and distinguish yourself
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Curve Transition with Golden Sparkles */}
      <div className="absolute bottom-0 left-0 w-full z-30 pointer-events-none">
        {/* Deep Golden Glow */}
        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-[#c9a961]/50 via-[#c9a961]/10 to-transparent" />
        
        {/* Animated Sparkles along the curve */}
        <div className="absolute bottom-0 left-0 w-full h-[180px] overflow-hidden">
          {mounted && sparkles.map((s, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#c9a961] rounded-full"
              initial={{ 
                x: s.x, 
                y: "100%",
                opacity: 0,
                scale: 0 
              }}
              animate={{ 
                y: [null, `${40 + Math.random() * 40}%`, "100%"],
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
              }}
              transition={{ 
                duration: s.dur, 
                repeat: Infinity,
                delay: s.delay,
                ease: "easeInOut"
              }}
              style={{
                filter: 'blur(1px) drop-shadow(0 0 4px #c9a961)',
              }}
            />
          ))}
          {mounted && stars.map((s, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute text-[#c9a961]"
              initial={{ 
                x: s.x, 
                y: s.y,
                opacity: 0,
                scale: 0
              }}
              animate={{ 
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: s.dur, 
                repeat: Infinity,
                delay: s.delay,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0l3.09 8.91H24l-7.35 5.35 2.81 8.74L12 17.65l-7.46 5.35 2.81-8.74L0 8.91h8.91L12 0z" />
              </svg>
            </motion.div>
          ))}
        </div>

        <div className="relative overflow-hidden leading-[0]">
          <svg className="relative block w-[calc(100%+1.3px)] h-[120px] md:h-[180px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,20 Q600,120 1200,20 V120 H0 Z" fill="#faf9f6"></path>
          </svg>
        </div>
      </div>
    </section>
  );
}
