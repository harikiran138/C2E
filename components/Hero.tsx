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
          alt="C2X Hero"
          fill
          priority
          className="object-cover object-[center_top]"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full flex flex-col justify-center">
        <div className="flex flex-col items-start text-left w-full lg:max-w-4xl">
            <div className="flex flex-col items-start gap-4 md:gap-6">
              <h1 className="flex flex-col text-left items-start w-full">
                <span className="text-[40px] leading-[0.95] sm:text-[60px] md:text-[80px] lg:text-[100px] text-white font-sans font-black tracking-tighter text-left">
                  Compliance
                </span>
                <span className="text-[40px] leading-[0.95] sm:text-[60px] md:text-[80px] lg:text-[100px] text-[#c9a961] font-sans font-black tracking-tighter text-left">
                  to Excellence
                </span>
              </h1>
              
              <div className="flex flex-col items-start gap-6 md:gap-8 mt-4">
                <p className="text-[14px] sm:text-[16px] md:text-[18px] text-white/90 font-bold tracking-[0.2em] text-left leading-relaxed max-w-xl">
                  QUIETLY POWERFUL. <span className="text-[#c9a961] block sm:inline">UNCOMPROMISINGLY EXCELLENT</span>
                </p>
                
                <MagneticButton className="group flex items-center gap-3 px-8 py-3 border border-[#c9a961]/30 rounded-full hover:border-[#c9a961] transition-all duration-300 bg-white/5 backdrop-blur-md cursor-pointer">
                  <span className="text-[10px] md:text-[12px] font-black tracking-widest uppercase text-[#c9a961] group-hover:text-white transition-colors">
                    Request Demo
                  </span>
                  <div className="w-1.5 h-1.5 bg-[#c9a961] rounded-full group-hover:scale-150 transition-transform" />
                </MagneticButton>
              </div>
            </div>
        </div>
      </div>

    </section>
  );
}
