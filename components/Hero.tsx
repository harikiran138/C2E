"use client";

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MagneticButton from './MagneticButton';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const bgRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <section ref={containerRef} className="relative h-screen min-h-[850px] flex items-center overflow-hidden bg-primary-dark pt-20">
      {/* Background Image with Parallax */}
      <div ref={bgRef} className="absolute inset-0 z-0 scale-110">
        <Image
          src="/images/giraffe-hero.jpg"
          alt="C2E Hero"
          fill
          priority
          className="object-cover object-center brightness-[0.75] contrast-[1.1]"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-primary-dark/60 via-transparent to-transparent" />
      </div>

      {/* Floating Particles Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-20 particle-bg">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary-gold rounded-full animate-pulse" />
        <div className="absolute top-3/4 left-1/3 w-1 h-1 bg-white rounded-full animate-ping" />
        <div className="absolute top-1/2 left-2/3 w-1.5 h-1.5 bg-primary-gold rounded-full animate-bounce" />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col items-end text-right space-y-6 md:space-y-8">
          <motion.div 
            variants={containerVars}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h1 className="flex flex-wrap justify-end gap-x-4 gap-y-2">
              {titleWords.map((word, i) => (
                <span key={i} className="overflow-hidden inline-block py-2">
                  <motion.span 
                    variants={wordVars}
                    className="inline-block text-fluid-h1 text-white border-b-8 border-primary-gold/40"
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-lg md:text-2xl text-white/90 font-medium max-w-xl ml-auto"
            >
              Stand confident, stay competent, and distinguish yourself
            </motion.p>
          </motion.div>
          
          <MagneticButton className="z-30">
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, type: "spring" }}
              className="inline-flex items-center px-10 py-4 bg-primary-gold text-white font-black rounded-xl shadow-[0_20px_50px_rgba(201,169,97,0.3)] hover:bg-white hover:text-primary-gold transition-colors duration-500 text-lg space-x-3 group"
            >
              <span className="uppercase tracking-widest">Learn More</span>
              <ChevronDown className="h-6 w-6 group-hover:translate-y-1 transition-transform" />
            </motion.button>
          </MagneticButton>
        </div>
      </div>

      {/* Deepened Decorative Wavy Curve */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-30">
        <svg className="relative block w-[calc(100%+1.3px)] h-[180px] md:h-[240px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5,73.84-4.36,147.54,16.88,218.2,35.26,69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="#faf9f6" opacity=".25"></path>
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5V0Z" fill="#faf9f6" opacity=".5"></path>
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="#faf9f6"></path>
        </svg>
      </div>
    </section>
  );
}
