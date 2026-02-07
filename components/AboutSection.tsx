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
      className="relative flex items-start space-x-4 p-6 bg-white/5 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 hover:shadow-2xl hover:border-primary-gold/40 hover:bg-white/10 transition-all duration-300 group"
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
      <p className="text-sm font-bold text-gray-300 leading-relaxed uppercase tracking-tight group-hover:text-white transition-colors duration-300">
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
    <section ref={sectionRef} id="about" className="pt-12 pb-24 md:pt-16 md:pb-32 relative overflow-hidden bg-black">
      {/* Dual-Image Background Stack */}
      <div className="absolute inset-0 z-0 bg-black">
        {/* Main Background (Scrolls with section) */}
        <Image
          src="/images/about_us.jpeg"
          alt="About Us Background"
          fill
          className="object-cover opacity-60 md:opacity-75 grayscale brightness-[0.6]"
        />

        {/* Blend from Hero Curve (Black) into Top Image */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent z-20" />
        {/* Fade transition at the bottom */}
        <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black via-transparent to-transparent z-20" />

        {/* Unified Glass Overlay */}
        <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[1px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="text-center mb-10 md:mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="inline-block"
          >
            <h2 className="text-[32px] md:text-[42px] text-white font-black relative pb-6 mb-4">
              About C2E
              <motion.div 
                style={{ width: `${titleUnderline}%` }}
                className="absolute bottom-0 left-0 h-1.5 bg-primary-gold rounded-full shadow-[0_0_15px_rgba(201,169,97,0.6)]"
              />
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            viewport={{ once: true }}
            className="text-base md:text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed font-bold italic drop-shadow-lg"
          >
            "We are committed to handholding higher Education Institutions (HEIs) in achieving prescribed standards, setting meaningful benchmarks in academic excellence."
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-10 md:mb-16">
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
              className="backdrop-blur-md bg-white/5 border border-white/10 p-5 md:p-6 rounded-2xl shadow-xl hover:bg-white/10 hover:border-primary-gold/30 transition-all duration-300 group"
            >
              <div className="flex items-start space-x-4">
                <CheckCircle2 className="h-5 w-5 text-primary-gold flex-shrink-0 mt-0.5" />
                <p className="text-xs md:text-[13px] font-black text-white leading-relaxed uppercase tracking-tight group-hover:text-primary-gold transition-colors duration-300">
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
          className="relative p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] overflow-hidden group shadow-2xl backdrop-blur-xl bg-white/5 border border-white/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="relative z-10 text-center space-y-6">
            <Quote className="h-10 md:h-14 w-10 md:w-14 text-primary-gold/30 mx-auto transform -scale-x-100" />
            <p className="text-lg md:text-xl font-serif italic text-gray-200 max-w-4xl mx-auto leading-snug drop-shadow-lg">
              This initiative promotes the core values of <span className="text-primary-gold font-black not-italic">OBE</span> to enhance employability, nurture <span className="text-primary-gold font-black not-italic">OBE</span> Monks, and build champions for a better teaching- and learning ecosystem.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
