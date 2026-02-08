"use client";

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import MagneticButton from './MagneticButton';

export default function Hero() {

  return (
    <section id="hero" className="relative h-[95vh] min-h-[850px] flex items-center overflow-hidden bg-primary-dark pt-16 pb-48">
      {/* Background Image - Static */}
      <div className="absolute inset-0 z-0 scale-100">
        <Image
          src="/images/hero1.png"
          alt="C2E Hero"
          fill
          priority
          className="object-cover object-[center_top]"
        />
      </div>

      {/* Logo Integration - Top Left Corner */}
      <div className="absolute top-[15px] left-6 sm:left-12 lg:left-20 z-30">
        <Image 
          src="/logo.svg" 
          alt="C2E Logo" 
          width={100} 
          height={100} 
          className="w-16 md:w-20 lg:w-24 h-auto drop-shadow-[0_0_20px_rgba(201,169,97,0.4)] brightness-110"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-full mx-0 px-6 sm:px-12 lg:px-20 w-full h-full flex flex-col justify-start pt-32 sm:pt-40 lg:pt-48">
        <div className="flex flex-col items-start text-left w-full">
          <div className="space-y-6 md:space-y-8 w-full max-w-full sm:max-w-4xl flex flex-col items-start">

            <h1 className="flex flex-col gap-y-2 md:gap-y-4 text-left items-start w-full">
              <span className="overflow-hidden inline-block py-0">
                <span className="inline-block text-[32px] sm:text-[42px] md:text-[56px] lg:text-[72px] text-white font-sans font-black leading-[0.95] tracking-tight text-left">
                  Compliance
                </span>
              </span>
              <span className="overflow-hidden inline-block py-0">
                <span className="inline-block text-[32px] sm:text-[42px] md:text-[56px] lg:text-[72px] text-[#c9a961] font-sans font-black leading-[0.95] tracking-tight text-left">
                  To Excellence
                </span>
              </span>
            </h1>
            <p className="text-[14px] sm:text-[16px] md:text-[18px] lg:text-[20px] text-white/90 font-medium tracking-tight text-left leading-snug max-w-2xl border-l-2 border-[#c9a961] pl-6 py-1">
              Building Academic Systems That Stand Up To Scrutiny And Improve With Time.
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Curve Transition with Golden Sparkles */}
      <div className="absolute bottom-0 left-0 w-full z-30 pointer-events-none">
        {/* Deep Golden Glow */}
        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-[#c9a961]/50 via-[#c9a961]/10 to-transparent" />
        
        <div className="relative h-[180px] md:h-[220px] w-full">
          <svg 
            className="absolute bottom-[-1px] left-0 w-full h-full z-20 pointer-events-none" 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none"
          >
            {/* Outline path - Golden */}
            <path 
              d="M0,0 Q600,120 1200,0" 
              fill="none"
              stroke="#c9a961"
              strokeWidth="4"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(201,169,97,0.5)]"
            ></path>
            {/* Fill path - Black */}
            <path 
              d="M0,0 Q600,120 1200,0 V120 H0 Z" 
              fill="#000000"
            ></path>
          </svg>
        </div>
      </div>
      {/* Overlay Image - On top of everything INCLUDING curve */}
      <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
        <div className="relative w-full h-full">
          <Image
            src="/images/hero_overlay.png"
            alt="Hero Overlay"
            fill
            priority
            className="object-cover object-[center_top]"
          />
        </div>
      </div>
    </section>
  );
}
