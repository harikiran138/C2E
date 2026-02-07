"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { CheckCircle2, Quote } from "lucide-react";
import { useRef, useState } from "react";
import Image from "next/image";

const BenefitCard = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;
    setRotate({ x: (y - 0.5) * 15, y: (x - 0.5) * -15 });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setRotate({ x: 0, y: 0 })}
      animate={{ rotateX: rotate.x, rotateY: rotate.y }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative flex items-start space-x-4 p-6 bg-white rounded-2xl shadow-sm border border-black/5 hover:shadow-xl hover:border-primary-gold/20 transition-all duration-300"
    >
      <div className="flex-shrink-0 mt-1">
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          whileInView={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2 + (index * 0.1), type: "spring" }}
          viewport={{ once: true }}
        >
          <CheckCircle2 className="h-6 w-6 text-primary-gold" />
        </motion.div>
      </div>
      <p className="text-sm font-bold text-gray-700 leading-relaxed uppercase tracking-tight">
        {children}
      </p>
    </motion.div>
  );
};

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const titleUnderline = useTransform(scrollYProgress, [0.1, 0.3], [0, 100]);

  return (
    <section ref={sectionRef} id="about" className="py-24 md:py-32 relative overflow-hidden bg-white">
      {/* Dual-Image Background Stack */}
      <div className="absolute inset-0 z-0 bg-white">
        {/* Main Background (Scrolls with section) */}
        <Image
          src="/images/about_us.png"
          alt="About Us Background"
          fill
          className="object-cover opacity-60 md:opacity-80"
        />

        {/* Top Filler Image (Fills the Hero Curve area) */}
        <div className="absolute top-0 left-0 w-full h-[600px] z-10">
          <Image
            src="/images/about_us_top.png"
            alt="About Section Accent"
            fill
            className="object-cover opacity-100"
            priority
          />
          {/* Blend from Hero Curve (#faf9f6) into Top Image */}
          <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-[#faf9f6] via-[#faf9f6]/95 to-transparent" />
          {/* Fade transition between the two images */}
          <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-transparent via-white/10 to-transparent" />
        </div>

        {/* Unified Glass Overlay */}
        <div className="absolute inset-0 z-20 bg-white/5 backdrop-blur-[2px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="text-center mb-16 md:mb-24 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="inline-block"
          >
            <h2 className="text-[32px] md:text-[42px] text-primary-dark font-black relative pb-6 mb-4">
              About C2E
              <motion.div 
                style={{ width: `${titleUnderline}%` }}
                className="absolute bottom-0 left-0 h-1.5 bg-primary-gold rounded-full"
              />
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            viewport={{ once: true }}
            className="text-base md:text-lg text-primary-dark max-w-3xl mx-auto leading-relaxed font-bold italic drop-shadow-sm"
          >
            "We are committed to handholding higher Education Institutions (HEIs) in achieving prescribed standards, setting meaningful benchmarks in academic excellence."
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-16 md:mb-24">
          {[
            "Through robust quality systems, structured processes, and proven best practices we ensure institutions meet all statutory and regulatory requirements effectively.",
            "Our focus remains on embedding clarity of purpose, continuous improvement, and systemic resets reaching into every academic activity.",
            "Beyond compliance, we promote a culture of excellence centered around Outcomes-Based Education (OBE).",
            "Committing institutions to thinking strong Institutional Development Plans in the long run."
          ].map((text, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="backdrop-blur-md bg-white/40 border border-white/40 p-5 md:p-6 rounded-2xl shadow-xl hover:bg-white/50 transition-all duration-300"
            >
              <div className="flex items-start space-x-4">
                <CheckCircle2 className="h-5 w-5 text-primary-gold flex-shrink-0 mt-0.5" />
                <p className="text-xs md:text-[13px] font-black text-primary-dark leading-relaxed uppercase tracking-tight">
                  {text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quote Section with Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="relative p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] overflow-hidden group shadow-2xl backdrop-blur-xl bg-white/30 border border-white/50"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-gold/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="relative z-10 text-center space-y-6">
            <Quote className="h-10 md:h-14 w-10 md:w-14 text-primary-gold/30 mx-auto transform -scale-x-100" />
            <p className="text-lg md:text-xl font-serif italic text-primary-dark max-w-4xl mx-auto leading-snug drop-shadow-sm">
              This initiative promotes the core values of <span className="text-primary-gold font-black not-italic">OBE</span> to enhance employability, nurture <span className="text-primary-gold font-black not-italic">OBE</span> Monks, and build champions for a better teaching- and learning ecosystem.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
