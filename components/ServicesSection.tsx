import { ShieldCheck, BookOpen, Search, Layers } from "lucide-react";

const services = [
  {
    title: "Institutional Compliance",
    description: "Navigate complex regulatory landscapes with ease through our expert compliance management systems.",
    icon: ShieldCheck,
  },
  {
    title: "OBE Implementation",
    description: "Transform your curriculum into a robust Outcome-Based Education framework that delivers results.",
    icon: BookOpen,
  },
  {
    title: "IDP Strategy Planning",
    description: "Develop long-term Institutional Development Plans that align with your core mission and vision.",
    icon: Search,
  },
  {
    title: "Curriculum Design",
    description: "Innovative curriculum structure designed for modern academic needs and industrial relevance.",
    icon: Layers,
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-24 bg-white relative">
      {/* Wave divider from previous section */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] -translate-y-full rotate-180">
        <svg className="relative block w-full h-[150px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
           <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="#ffffff"></path>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2 relative inline-block">
            Our Services
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#c5a059] rounded-full" />
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="group relative bg-white border border-gray-100 shadow-xl rounded-[2rem] p-8 text-center transition-all duration-300 hover-lift overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#c5a059]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="h-16 w-16 bg-[#c5a059]/10 rounded-2xl flex items-center justify-center mb-6 ring-4 ring-[#c5a059]/5 group-hover:bg-[#c5a059] transition-colors">
                  <service.icon className="h-8 w-8 text-[#c5a059] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-4 px-2 leading-tight">{service.title}</h3>
                <p className="text-xs text-gray-500 font-bold leading-loose uppercase tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
