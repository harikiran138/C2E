"use client";

import { motion } from "framer-motion";
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
    <section id="services" className="py-32 relative bg-primary-dark overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 particle-bg">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#c9a961_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      {/* Top Wave Divider */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] z-10 rotate-180 -translate-y-[1px]">
        <svg className="relative block w-full h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="#faf9f6"></path>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="text-center mb-24">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-fluid-h2 text-white font-black mb-6"
          >
            Our Services
            <div className="h-1.5 w-32 bg-primary-gold mx-auto mt-4 rounded-full" />
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.15, duration: 0.8, type: "spring" }}
              viewport={{ once: true }}
              whileHover={{ y: -15 }}
              className="group relative bg-white/5 backdrop-blur-sm border border-white/10 p-10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:bg-white/10 hover:border-primary-gold/50 shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="relative h-20 w-20 mb-8 mx-auto">
                    <div className="absolute inset-0 bg-primary-gold rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className="h-full w-full bg-white/10 rounded-2xl flex items-center justify-center ring-2 ring-primary-gold/30 group-hover:rotate-[360deg] transition-transform duration-1000 group-hover:bg-primary-gold">
                        <service.icon className="h-10 w-10 text-primary-gold group-hover:text-white" />
                    </div>
                </div>

                <h3 className="text-xl font-black text-white mb-4 text-center group-hover:text-primary-gold transition-colors">{service.title}</h3>
                <p className="text-sm font-bold text-gray-400 leading-relaxed text-center group-hover:text-white/80 transition-colors uppercase tracking-tight">
                  {service.description}
                </p>

                <div className="mt-8 pt-8 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-center">
                    <span className="text-xs font-black text-primary-gold uppercase tracking-[0.2em]">Explore Service +</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-10 translate-y-[1px]">
        <svg className="relative block w-full h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="#111827"></path>
        </svg>
      </div>
    </section>
  );
}
