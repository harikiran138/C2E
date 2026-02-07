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
    <section id="services" className="py-24 md:py-32 relative overflow-hidden bg-black">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/abou_us_3.png"
          alt="Services Background"
          fill
          className="object-cover opacity-30 md:opacity-40 brightness-[0.5] scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px] z-20" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30">
        <div className="text-center mb-16 md:mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-[32px] md:text-[52px] text-white font-black mb-6 uppercase tracking-tighter"
          >
            Our Services
            <div className="h-1.5 w-32 bg-primary-gold mx-auto mt-4 rounded-full shadow-[0_0_20px_rgba(201,169,97,0.8)]" />
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="group relative backdrop-blur-xl bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:bg-white/10 hover:border-primary-gold/40 shadow-2xl hover:shadow-primary-gold/5"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="relative h-16 w-16 md:h-20 md:w-20 mb-6 md:mb-8 mx-auto">
                    <div className="absolute inset-0 bg-primary-gold rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
                    <div className="h-full w-full bg-white/5 rounded-2xl flex items-center justify-center ring-1 ring-white/10 group-hover:ring-primary-gold/50 transition-all duration-700 group-hover:bg-primary-gold">
                        <service.icon className="h-8 w-8 md:h-10 md:w-10 text-primary-gold group-hover:text-white transition-colors duration-500" />
                    </div>
                </div>

                <h3 className="text-lg md:text-xl font-black text-white mb-4 text-center group-hover:text-primary-gold transition-colors uppercase tracking-tight">{service.title}</h3>
                <p className="text-xs md:text-[13px] font-medium text-gray-400 leading-relaxed text-center group-hover:text-gray-200 transition-colors uppercase tracking-wide">
                  {service.description}
                </p>

                <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-center">
                    <span className="text-[10px] font-black text-primary-gold uppercase tracking-[0.3em] cursor-pointer hover:underline decoration-primary-gold decoration-2 underline-offset-4">Explore Service +</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
