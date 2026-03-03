"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  CheckCircle2,
  Quote,
  Sparkles,
  Target,
  Zap,
  Shield,
  Cpu,
  Users,
  ArrowRight,
  Star,
  Award,
  TrendingUp,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import GridPattern from "./GridPattern";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./ui/section-header";
import { FeatureCard } from "./ui/feature-card";

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.1 });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const goldGlowY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const titleUnderline = useTransform(scrollYProgress, [0.1, 0.3], [0, 100]);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="pt-0 pb-16 relative overflow-hidden text-black transition-colors duration-500 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Intro Header */}
        <div className="mb-16 pt-16 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            viewport={{ once: true }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center space-x-2 bg-[#c9a961]/10 border border-[#c9a961]/20 px-4 py-1.5 rounded-full mb-8"
            >
              <Sparkles className="h-4 w-4 text-[#c9a961]" />
              <span className="text-[#c9a961] text-[10px] font-black tracking-widest uppercase">
                Academic Transformation
              </span>
            </motion.div>

            <h2 className="text-4xl md:text-7xl font-bold relative pb-6 mb-10 tracking-tight text-black">
              About Us
              <motion.div
                style={{ width: `${titleUnderline}%` }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 bg-[#c9a961] rounded-full shadow-[0_0_20px_rgba(201,169,97,0.8)]"
              />
            </h2>

            <div className="max-w-4xl mx-auto space-y-8">
              <p className="text-2xl md:text-4xl text-gray-800 font-medium leading-tight">
                "
                <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg font-black brightness-125">
                  C2X
                </span>{" "}
                is a focused academic transformation firm that helps{" "}
                <span className="text-[#c9a961]">
                  higher-education institutions
                </span>{" "}
                build Outcome Based Education (OBE) systems from first
                principles."
              </p>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                We enable institutions to move beyond regulatory checklists and
                establish robust, measurable, and sustainable academic outcome
                frameworks aligned with national and international accreditation
                standards.
              </p>
            </div>
          </motion.div>
        </div>
        {/* Belief System - Premium Card */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-center">
          <div className="lg:col-span-5">
            <SectionHeader
              title="What We Believe"
              subtitle="OBE is a governance framework for academic quality."
            />
            <p className="text-gray-600 leading-relaxed mt-4">
              At C2X, we believe OBE is not a document or a one-time exercise—it
              is a governance framework. We ensure outcomes are clearly defined,
              objectively measured, and continuously improved.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-12 border border-[#c9a961]/30 p-8 md:p-12 rounded-[2rem] relative overflow-hidden group"
          >
            <Quote className="absolute -top-10 -left-10 h-64 w-64 text-[#c9a961]/5 transform -rotate-12" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 text-center md:text-left">
                <span className="text-[#c9a961] font-black text-xs tracking-widest uppercase mb-4 block">
                  Principle
                </span>
                <h3 className="text-3xl md:text-5xl font-bold text-black leading-tight">
                  "Compliance Ensures Eligibility. <br />
                  <span className="text-[#c9a961]">
                    Excellence Demands Systems.
                  </span>
                  "
                </h3>
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className="text-lg text-gray-700 italic">
                  We bridge the gap between regulatory requirements and true
                  educational excellence through systematic architectural
                  design.
                </p>
                <motion.div
                  whileHover={{ x: 10 }}
                  className="mt-8 inline-flex items-center space-x-2 text-[#c9a961] font-bold cursor-pointer group"
                >
                  <span>Our Methodology</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* What We Do - Grid */}
        <div className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <SectionHeader
              title="What We Do"
              subtitle="End-to-end institutionalization of OBE frameworks."
            />
            <p className="text-[#c9a961]/60 text-xs font-black tracking-widest uppercase pb-12">
              Coherent • Auditable • Scalable
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              index={0}
              icon={Target}
              title="Strategic Alignment"
              items={[
                "Vision and Mission alignment",
                "PEOs, POs, and PSOs",
                "Institutional Development Plans",
              ]}
            />
            <FeatureCard
              index={1}
              icon={Zap}
              title="Academic Logic"
              items={[
                "Bloom's Taxonomy COs",
                "CO–PO–PSO mapping logic",
                "Outcome-Based Evaluation",
              ]}
            />
            <FeatureCard
              index={2}
              icon={Shield}
              title="Quality Control"
              items={[
                "Assessment & attainment",
                "Rubrics & evaluation",
                "Audit-ready ecosystems",
              ]}
            />
            <FeatureCard
              index={3}
              icon={Sparkles}
              title="Continuous Growth"
              items={[
                "CQI systems",
                "Scalable ecosystems",
                "Systemic academic resets",
              ]}
            />
          </div>
        </div>

        {/* Our Approach - Centered Process Flow */}
        <div className="mb-16 rounded-[2.5rem] p-8 md:p-12 border border-primary-gold/10 relative overflow-hidden bg-gray-50/50">
          <SectionHeader
            title="Our Approach"
            subtitle="Clarity. Structure. Sustainability."
            centered
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative max-w-5xl mx-auto">
            {/* Visual connector line for desktop - refined */}
            <div className="absolute top-[45px] left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c9a961]/20 to-transparent hidden lg:block" />

            {[
              { label: "Design", sub: "Precedes documentation", icon: Award },
              { label: "Logic", sub: "Precedes mapping", icon: Cpu },
              {
                label: "Measurement",
                sub: "Precedes improvement",
                icon: TrendingUp,
              },
              { label: "Ownership", sub: "Precedes compliance", icon: Users },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center group relative z-10"
              >
                <div className="w-12 h-12 bg-white border border-[#c9a961]/30 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#c9a961] transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-[#c9a961]/20">
                  <span className="text-[#c9a961] group-hover:text-white font-black text-lg">
                    {i + 1}
                  </span>
                </div>
                <h4 className="text-black font-bold text-lg mb-1 tracking-tight group-hover:text-[#c9a961] transition-colors">
                  {step.label}
                </h4>
                <p className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">
                  {step.sub}
                </p>
              </motion.div>
            ))}
          </div>

          <p className="mt-12 text-center text-gray-500/80 text-sm max-w-xl mx-auto leading-relaxed italic">
            "We work closely with institutional leadership and faculty teams to
            ensure OBE becomes embedded practice, not external dependency."
          </p>
        </div>

        {/* Digital Enablement & Partners */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <motion.div
            whileHover={{ y: -5 }}
            className="backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border border-primary-gold/10 group hover:border-[#c9a961]/30 transition-all duration-500"
          >
            <div className="flex items-center space-x-4 mb-10">
              <div className="p-4 bg-[#c9a961]/10 rounded-3xl group-hover:rotate-12 transition-transform">
                <Cpu className="text-[#c9a961] h-8 w-8" />
              </div>
              <h3 className="text-black text-3xl font-bold tracking-tight">
                Digital Enablement
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-10">
              {[
                "Consistent faculty workflows",
                "Reliable attainment computation",
                "Evidence-ready repositories",
                "Actionable outcome analytics",
                "Long-term CQI tracking",
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 text-gray-700 group-hover:text-black transition-colors"
                >
                  <div className="h-2 w-2 bg-[#c9a961] rounded-full shadow-[0_0_8px_rgba(201,169,97,0.8)]" />
                  <span className="text-lg font-medium">{item}</span>
                </div>
              ))}
            </div>

            <p className="text-[#c9a961]/60 text-[10px] font-black tracking-[0.3em] uppercase border-t border-gray-100 pt-8">
              Technology simplifies adoption, never complexity.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border border-primary-gold/10 group hover:border-[#c9a961]/30 transition-all duration-500 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center space-x-4 mb-10">
                <div className="p-4 bg-[#c9a961]/10 rounded-3xl group-hover:rotate-12 transition-transform">
                  <Users className="text-[#c9a961] h-8 w-8" />
                </div>
                <h3 className="text-black text-3xl font-bold tracking-tight">
                  Who We Work With
                </h3>
              </div>
              <div className="flex flex-wrap gap-4">
                <span className="px-6 py-3 bg-[#c9a961]/10 border border-[#c9a961]/20 rounded-2xl text-xs font-black text-[#c9a961] tracking-widest uppercase">
                  Higher Educational Institutions
                </span>
                <span className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-500 tracking-widest uppercase">
                  Accreditation Boards
                </span>
              </div>
            </div>

            <div className="mt-16 pt-10 border-t border-gray-200">
              <span className="text-[#c9a961] font-black text-[10px] tracking-[0.3em] uppercase block mb-4">
                Our Vision
              </span>
              <p className="text-xl md:text-2xl font-bold text-black leading-snug">
                To be a trusted partner in academic quality transformation,
                enabling institutions to evolve from input-based instruction to
                outcome-driven education.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
