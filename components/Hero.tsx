"use client";

import Image from "next/image";
import MagneticButton from "./MagneticButton";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center overflow-hidden bg-primary-dark py-20 sm:py-24"
    >
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
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/75 via-slate-950/45 to-slate-950/10" />

      {/* Content */}
      <div className="relative z-20 mx-auto flex h-full w-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex w-full flex-col items-start text-left lg:max-w-4xl">
          <div className="flex max-w-4xl flex-col items-start gap-5 md:gap-7">
            <h1 className="flex w-full max-w-5xl flex-col items-start text-left">
              <span className="text-[40px] leading-[0.95] sm:text-[60px] md:text-[80px] lg:text-[100px] text-white font-sans font-black tracking-tighter text-left">
                Compliance
              </span>
              <span className="text-[40px] leading-[0.95] sm:text-[60px] md:text-[80px] lg:text-[100px] text-[#c9a961] font-sans font-black tracking-tighter text-left">
                to Excellence
              </span>
            </h1>

            <div className="mt-2 flex flex-col items-start gap-5 md:mt-4 md:gap-8">
              <p className="max-w-[22rem] text-[10px] leading-relaxed text-white/90 sm:max-w-xl sm:text-[11px] md:text-[13px] font-bold tracking-[0.12em] text-left">
                QUIETLY POWERFUL.{" "}
                <span className="text-[#c9a961]">
                  UNCOMPROMISINGLY EXCELLENT
                </span>
              </p>

              <MagneticButton className="group flex w-fit items-center gap-3 rounded-full border border-[#c9a961]/30 bg-white/5 px-6 py-3 backdrop-blur-md transition-all duration-300 hover:border-[#c9a961] sm:px-8">
                <span className="text-[10px] md:text-[12px] font-black tracking-widest uppercase text-[#c9a961] transition-colors group-hover:text-white">
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
