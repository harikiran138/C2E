"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { CheckCircle2, Quote, Sparkles, Target, Zap, Shield, Cpu, Users } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-12">
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex items-center space-x-3 mb-4"
    >
      <div className="h-1 w-12 bg-primary-gold" />
      <span className="text-primary-gold text-xs font-black tracking-[0.3em]">{title}</span>
    </motion.div>
    {subtitle && (
      <h3 className="text-2xl md:text-3xl text-black font-black leading-tight tracking-tighter">
        {subtitle}
      </h3>
    )}
  </div>
);

const FeatureCard = ({ icon: Icon, title, items }: { icon: any; title: string; items: string[] }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-primary-gold/30 transition-all duration-500 group"
  >
    <div className="flex items-center space-x-4 mb-6">
      <div className="p-3 bg-primary-gold/10 rounded-2xl group-hover:bg-primary-gold/20 transition-colors">
        <Icon className="h-6 w-6 text-primary-gold" />
      </div>
      <h4 className="text-black font-black tracking-tight text-lg">{title}</h4>
    </div>
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start space-x-3 text-sm text-gray-600 group-hover:text-black transition-colors">
          <div className="h-1 w-1 bg-primary-gold/50 rounded-full mt-2" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </motion.div>
);

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const titleUnderline = useTransform(scrollYProgress, [0.1, 0.3], [0, 100]);

  return (
    <section ref={sectionRef} id="about" className="pt-0 pb-16 md:pb-20 relative overflow-hidden bg-white">
      {/* Background Media */}
      <motion.div 
        style={{ scale: useTransform(scrollYProgress, [0, 1], [1, 1.1]) }}
        className="absolute inset-0 z-0"
      >
        <Image
          src="/images/abou_us_3.png"
          alt="About Us Background"
          fill
          className="object-cover opacity-90 brightness-[0.8]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white z-10" />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-20" />
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30">
        {/* Intro Header */}
        <div className="mb-24 pt-12 md:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-[32px] md:text-[52px] text-black font-black relative pb-4 mb-6 tracking-tighter inline-block mx-auto">
              About Us
              <motion.div 
                style={{ width: `${titleUnderline}%` }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 bg-primary-gold rounded-full shadow-[0_0_20px_rgba(201,169,97,0.8)]"
              />
            </h2>
            <p className="text-xl md:text-2xl text-gray-800 max-w-4xl mx-auto font-bold leading-relaxed mb-4">
              "C2E (Compliance To Excellence) Is A Focused Academic Transformation Firm That Helps Higher-Education Institutions Build Outcome Based Education (OBE) Systems From First Principles."
            </p>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              We Enable Institutions To Move Beyond Regulatory Checklists And Establish Robust, Measurable, And Sustainable Academic Outcome Frameworks Aligned With National And International Accreditation Standards.
            </p>
          </motion.div>
        </div>

        {/* Belief System */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          <SectionHeader title="What We Believe" subtitle="OBE is a governance framework for academic quality." />
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 bg-primary-gold/5 border border-primary-gold/20 p-8 md:p-12 rounded-[2rem] flex flex-col justify-center"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-2">
                <span className="text-gray-500 font-black text-xs tracking-widest">Principles</span>
                <p className="text-black text-2xl font-black">"Compliance Ensures Eligibility. Excellence Demands Systems."</p>
              </div>
              <div className="h-px md:h-24 w-full md:w-px bg-primary-gold/30" />
              <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
                At C2E, We Believe OBE Is Not A Document Or A One-Time Exercise—It Is A Governance Framework. We Ensure Outcomes Are Clearly Defined, Objectively Measured, And Continuously Improved.
              </p>
            </div>
          </motion.div>
        </div>

        {/* What We Do */}
        <div className="mb-24">
          <SectionHeader title="What We Do" subtitle="End-to-end institutionalization of OBE frameworks." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={Target} 
              title="Strategic Alignment" 
              items={["Vision and Mission alignment", "PEOs, POs, and PSOs", "Institutional Development Plans"]} 
            />
            <FeatureCard 
              icon={Zap} 
              title="Academic Logic" 
              items={["Bloom's Taxonomy COs", "CO–PO–PSO mapping logic", "Outcome-Based Evaluation"]} 
            />
            <FeatureCard 
              icon={Shield} 
              title="Quality Control" 
              items={["Assessment & attainment", "Rubrics & evaluation", "Audit-ready ecosystems"]} 
            />
            <FeatureCard 
              icon={Sparkles} 
              title="Continuous Growth" 
              items={["CQI systems", "Scalable ecosystems", "Systemic academic resets"]} 
            />
          </div>
          <p className="mt-8 text-primary-gold/80 text-xs font-black tracking-widest text-center">
            Each Engagement Results In A Coherent, Auditable, And Scalable OBE Ecosystem.
          </p>
        </div>

        {/* Our Approach */}
        <div className="mb-24">
          <SectionHeader title="Our Approach" subtitle="Clarity. Structure. Sustainability." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { label: "Design", sub: "Precedes documentation" },
              { label: "Logic", sub: "Precedes mapping" },
              { label: "Measurement", sub: "Precedes improvement" },
              { label: "Ownership", sub: "Precedes compliance" }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.8 }}
                viewport={{ once: true, amount: 0.3 }}
                className="bg-white/5 p-8 rounded-2xl border border-white/10 text-center group hover:bg-primary-gold transition-all duration-500"
              >
                <div className="text-primary-gold group-hover:text-white font-black text-xl mb-1 tracking-tighter">{step.label}</div>
                <div className="text-gray-500 group-hover:text-white/80 text-[10px] font-bold tracking-widest">{step.sub}</div>
              </motion.div>
            ))}
          </div>
          <p className="mt-8 text-center text-gray-600 max-w-2xl mx-auto">
            We Work Closely With Institutional Leadership And Faculty Teams To Ensure OBE Becomes Embedded Practice, Not External Dependency.
          </p>
        </div>

        {/* Digital Enablement & Partners */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-24">
          <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/10">
            <div className="flex items-center space-x-4 mb-8">
              <Cpu className="text-primary-gold h-8 w-8" />
              <h3 className="text-black text-2xl font-black tracking-tight">Digital Enablement</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Consistent faculty workflows",
                "Reliable attainment computation",
                "Evidence-ready repositories",
                "Actionable outcome analytics",
                "Long-term CQI tracking"
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-3 text-sm text-slate-700">
                  <div className="h-1.5 w-1.5 bg-primary-gold rounded-full" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-8 text-gray-500 text-xs font-black tracking-widest border-t border-gray-200 pt-6">
              Technology Is Used To Simplify Adoption, Not Increase Complexity.
            </p>
          </div>

          <div className="bg-primary-gold/5 rounded-[2.5rem] p-10 border border-primary-gold/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-4 mb-8">
                <Users className="text-primary-gold h-8 w-8" />
                <h3 className="text-black text-2xl font-black tracking-tight">Who We Work With</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-primary-gold/10 border border-primary-gold/20 rounded-full text-xs font-black text-primary-gold tracking-widest">
                  Higher Educational Institutions
                </span>
              </div>
            </div>
            <div className="mt-12 space-y-4">
              <div className="h-px bg-primary-gold/20 w-full" />
              <p className="text-sm text-primary-gold/80 font-bold tracking-[0.2em]">Our Vision</p>
              <p className="text-white text-lg font-black leading-snug">
                To be a trusted partner in academic quality transformation, enabling institutions to evolve from input-based instruction to outcome-driven education.
              </p>
            </div>
          </div>
        </div>

        {/* Final Promise */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative py-24 px-8 text-center"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-gold/20 blur-[120px] rounded-full -z-10" />
          <Quote className="h-16 w-16 text-primary-gold/20 mx-auto mb-8 transform -scale-x-100" />
          <h2 className="text-4xl md:text-5xl text-black font-black tracking-tighter mb-4">Our Promise</h2>
          <div className="space-y-2 mb-8">
            <p className="text-xl md:text-2xl text-gray-500 font-bold">Compliance Is Necessary.</p>
            <p className="text-xl md:text-2xl text-primary-gold font-black tracking-widest">Excellence Is Deliberate.</p>
          </div>
          <p className="text-3xl md:text-4xl text-black font-black tracking-tight">C2E Enables The Transition.</p>
        </motion.div>
      </div>
    </section>
  );
}
