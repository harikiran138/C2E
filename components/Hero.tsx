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
      <div className="relative z-20 max-w-full mx-0 px-6 sm:px-12 lg:px-20 w-full h-full flex flex-col justify-start pt-32 sm:pt-40 lg:pt-48">
        <div className="flex flex-col items-start text-left w-full">
          <div className="space-y-6 md:space-y-8 w-full max-w-full sm:max-w-4xl flex flex-col items-start">

            <h1 className="flex flex-col gap-y-0 text-left items-start w-full">
              <span className="overflow-hidden inline-block py-0">
                <span className="inline-block text-[32px] sm:text-[42px] md:text-[56px] lg:text-[72px] text-white font-sans font-black leading-[0.9] tracking-tight text-left">
                  Compliance
                </span>
              </span>
              <span className="overflow-hidden inline-block py-0">
                <span className="inline-block text-[32px] sm:text-[42px] md:text-[56px] lg:text-[72px] text-[#c9a961] font-sans font-black leading-[0.9] tracking-tight text-left">
                  to Excellence
                </span>
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] md:text-[12px] text-white font-bold tracking-[0.3em] uppercase text-left leading-snug max-w-2xl">
              Where Compliance Becomes Capability
            </p>
          </div>
        </div>
      </div>

      {/* Simplified background glow */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/20 to-transparent z-10" />

    </section>
  );
}
