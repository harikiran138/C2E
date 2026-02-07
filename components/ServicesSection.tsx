"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ShieldCheck, BookOpen, Search, Layers } from "lucide-react";

const services = [
  {
    title: "Institutional Compliance",
    description: "Navigate complex regulatory landscapes with ease through our expert compliance management systems.",
    icon: ShieldCheck,
    color: "from-blue-500/10 to-primary-gold/20"
  },
  {
    title: "OBE Implementation",
    description: "Transform your curriculum into a robust Outcome-Based Education framework that delivers results.",
    icon: BookOpen,
    color: "from-green-500/10 to-primary-gold/20"
  },
  {
    title: "IDP Strategy Planning",
    description: "Develop long-term Institutional Development Plans that align with your core mission and vision.",
    icon: Search,
    color: "from-purple-500/10 to-primary-gold/20"
  },
  {
    title: "Curriculum Design",
    description: "Innovative curriculum structure designed for modern academic needs and industrial relevance.",
    icon: Layers,
    color: "from-orange-500/10 to-primary-gold/20"
  }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-24 md:py-32 relative overflow-hidden bg-white">
      {/* Dual-Image Background Stack */}
      <div className="absolute inset-0 z-0 bg-white">
        {/* Main Background */}
        <Image
          src="/images/about_us.png"
          alt="Services Background"
          fill
          className="object-cover opacity-60 md:opacity-80"
        />

        {/* Top Filler Image (Clouds) */}
        <div className="absolute top-0 left-0 w-full h-[600px] z-10">
          <Image
            src="/images/about_us_top.png"
            alt="Services Accent"
            fill
            className="object-cover opacity-100"
          />
          {/* Blend from previous section into Top Image */}
          <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-white via-white/80 to-transparent" />
          {/* Fade transition between the two images */}
          <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-transparent via-white/10 to-transparent" />
        </div>

        {/* Unified Glass Overlay */}
        <div className="absolute inset-0 z-20 bg-white/5 backdrop-blur-[2px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30">
        <div className="text-center mb-16 md:mb-20">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-[32px] md:text-[42px] text-primary-dark font-black mb-6"
          >
            Our Services
            <div className="h-1.5 w-32 bg-primary-gold mx-auto mt-4 rounded-full" />
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.15, duration: 0.8, type: "spring" }}
              viewport={{ once: true }}
              whileHover={{ y: -15 }}
              className="group relative backdrop-blur-md bg-white/40 border border-white/40 p-8 md:p-10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:bg-white/50 hover:border-primary-gold/50 shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="relative h-16 w-16 md:h-20 md:w-20 mb-6 md:mb-8 mx-auto">
                    <div className="absolute inset-0 bg-primary-gold rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="h-full w-full bg-white/10 rounded-2xl flex items-center justify-center ring-2 ring-primary-gold/30 group-hover:rotate-[360deg] transition-transform duration-1000 group-hover:bg-primary-gold">
                        <service.icon className="h-8 w-8 md:h-10 md:w-10 text-primary-gold group-hover:text-white" />
                    </div>
                </div>

                <h3 className="text-lg md:text-xl font-black text-primary-dark mb-4 text-center group-hover:text-primary-gold transition-colors">{service.title}</h3>
                <p className="text-xs md:text-[13px] font-black text-primary-dark/70 leading-relaxed text-center group-hover:text-primary-dark transition-colors uppercase tracking-tight">
                  {service.description}
                </p>

                <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-primary-dark/5 opacity-0 group-hover:opacity-100 transition-opacity text-center">
                    <span className="text-[10px] font-black text-primary-gold uppercase tracking-[0.2em]">Explore Service +</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
