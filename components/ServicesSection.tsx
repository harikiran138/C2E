"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ShieldCheck, BookOpen, Search, Layers } from "lucide-react";
import { DottedSurface } from "./ui/dotted-surface";

const services = [
  {
    title: "Institutional Compliance",
    description:
      "Navigate complex regulatory landscapes with ease through our expert compliance management systems.",
    icon: ShieldCheck,
    color: "from-blue-500/10 to-primary-gold/20",
  },
  {
    title: "OBE Implementation",
    description:
      "Transform your curriculum into a robust Outcome-Based Education framework that delivers results.",
    icon: BookOpen,
    color: "from-green-500/10 to-primary-gold/20",
  },
  {
    title: "IDP Strategy Planning",
    description:
      "Develop long-term Institutional Development Plans that align with your core mission and vision.",
    icon: Search,
    color: "from-purple-500/10 to-primary-gold/20",
  },
  {
    title: "Curriculum Design",
    description:
      "Innovative curriculum structure designed for modern academic needs and industrial relevance.",
    icon: Layers,
    color: "from-orange-500/10 to-primary-gold/20",
  },
];

export default function ServicesSection() {
  return (
    <section
      id="services"
      className="py-12 md:py-16 relative overflow-hidden transition-colors duration-500 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center space-x-3 mb-6"
            >
              <div className="h-0.5 w-12 bg-primary-gold" />
              <span className="text-primary-gold text-xs font-black tracking-[0.4em] uppercase">
                Core Expertise
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl text-black font-black tracking-tighter leading-[0.9]"
            >
              Our Strategic <br />
              <span className="text-primary-gold">Solutions</span>
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-slate-500 max-w-sm font-medium tracking-tight leading-relaxed"
          >
            Engineering excellence in educational compliance and quality
            transformation through data-driven strategies.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className="group relative flex flex-col sm:flex-row items-start gap-4 p-6 rounded-2xl border border-slate-100 hover:bg-white hover:border-primary-gold/30 hover:shadow-2xl hover:shadow-primary-gold/10 transition-all duration-500"
            >
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:bg-primary-gold transition-colors duration-500">
                  <service.icon className="h-8 w-8 text-primary-gold group-hover:text-white transition-colors duration-500" />
                </div>
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:text-primary-gold/50 transition-colors">
                  0{index + 1}
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-2xl font-black text-black mb-3 tracking-tight group-hover:text-primary-gold transition-colors">
                  {service.title}
                </h3>
                <p className="text-slate-600 font-medium leading-relaxed mb-6">
                  {service.description}
                </p>
                <div className="flex items-center text-xs font-black tracking-widest text-primary-gold uppercase group-hover:gap-4 transition-all duration-300 gap-2">
                  <span>Explore Service</span>
                  <div className="h-px w-8 bg-primary-gold/30 group-hover:w-12 transition-all" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
