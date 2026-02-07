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
  const pathRef = useRef<SVGPathElement>(null);
  const pathOutlineRef = useRef<SVGPathElement>(null);
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
        yPercent: 15,
        scale: 1.1,
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

  useEffect(() => {
    if (pathRef.current && containerRef.current) {
      // Dynamic Curve Flattening on Scroll
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      tl.to(pathRef.current, {
        attr: { d: "M0,0 Q600,0 1200,0 V120 H0 Z" },
        ease: "none",
      }, 0);

      tl.to(pathOutlineRef.current, {
        attr: { d: "M0,0 Q600,0 1200,0" },
        ease: "none",
      }, 0);
    }
  }, [mounted]);

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
    <section ref={containerRef} className="relative h-[95vh] min-h-[850px] flex items-center overflow-hidden bg-primary-dark pt-16 pb-48">
      {/* Background Image with Parallax */}
      <div ref={bgRef} className="absolute inset-0 z-0 scale-100">
        <Image
          src="/images/hero1.png"
          alt="C2E Hero"
          fill
          priority
          className="object-cover object-[center_top]"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-full mx-0 px-6 sm:px-12 lg:px-20 w-full h-full flex flex-col justify-start pt-40">
        <div className="flex flex-col items-start text-left">
          <motion.div 
            variants={containerVars}
            initial="hidden"
            animate="visible"
            className="space-y-6 max-w-3xl flex flex-col items-start"
          >
            <h1 className="flex flex-col gap-y-2 text-left items-start">
              <span className="overflow-hidden inline-block py-0">
                <motion.span 
                  variants={wordVars}
                  className="inline-block text-[42px] md:text-[68px] text-white font-sans font-black leading-[0.95] uppercase tracking-tighter text-left"
                >
                  Compliance
                </motion.span>
              </span>
              <span className="overflow-hidden inline-block py-0">
                <motion.span 
                  variants={wordVars}
                  className="inline-block text-[42px] md:text-[68px] text-[#c9a961] font-sans font-black leading-[0.95] uppercase tracking-tighter text-left"
                >
                  To Excellence
                </motion.span>
              </span>
            </h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-[18px] md:text-[22px] text-[#a6423d] font-black tracking-tight text-left leading-tight max-w-2xl"
            >
              Building academic systems that stand up to scrutiny—and improve with time.
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

        <div className="relative h-[180px] md:h-[220px] w-full">
          <svg 
            className="absolute bottom-[-1px] left-0 w-full h-full z-20 pointer-events-none" 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none"
          >
            {/* Outline path - Golden */}
            <path 
              ref={pathOutlineRef}
              d="M0,0 Q600,120 1200,0" 
              fill="none"
              stroke="#c9a961"
              strokeWidth="4"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(201,169,97,0.5)]"
            ></path>
            {/* Fill path - Black */}
            <path 
              ref={pathRef}
              d="M0,0 Q600,120 1200,0 V120 H0 Z" 
              fill="#000000"
            ></path>
          </svg>
        </div>
      </div>
    </section>
  );
}
