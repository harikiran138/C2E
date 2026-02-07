import { CheckCircle2, Quote } from "lucide-react";

export default function AboutSection() {
  const points = [
    "Institutional compliance management",
    "Outcome-Based Education (OBE) integration",
    "Comprehensive quality assurance frameworks",
    "Strategic IDP planning and execution",
  ];

  return (
    <section id="about" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2 relative inline-block">
          About C2E
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#c5a059] rounded-full" />
        </h2>
        <p className="text-lg text-gray-600 mt-10 max-w-4xl mx-auto font-medium leading-relaxed">
          We are committed to handholding higher Education Institutions (HEIs) in achieving prescribed standards, 
          setting meaningful benchmarks in academic excellence, and formulating strong Institutional Development Plans (IDP).
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10 items-start">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:col-span-2">
            <ul className="space-y-6">
              {[
                "Through robust quality systems, structured processes, and proven best practices we ensure institutions meet all statutory and regulatory requirements effectively.",
                "Beyond compliance, we promote a culture of excellence centered around Outcomes-Based Education (OBE)."
              ].map((point, idx) => (
                <li key={idx} className="flex items-start space-x-4 text-gray-700">
                  <div className="mt-1 bg-[#c5a059]/10 p-1 rounded-full flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-[#c5a059]" />
                  </div>
                  <span className="text-sm font-semibold leading-snug">{point}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-6">
              {[
                "Our focus remains on embedding clarity of purpose, continuous improvement, and systemic resets reaching into every academic activity.",
                "Committing institutions to thinking strong Institutional Development Plans in the long run."
              ].map((point, idx) => (
                <li key={idx} className="flex items-start space-x-4 text-gray-700">
                  <div className="mt-1 bg-[#c5a059]/10 p-1 rounded-full flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-[#c5a059]" />
                  </div>
                  <span className="text-sm font-semibold leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 mt-12 bg-gradient-to-r from-[#f9f5ed] to-[#ffffff] border border-[#e6d5b8] p-10 rounded-[2.5rem] shadow-sm relative group hover-lift transition-all">
            <Quote className="h-10 w-10 text-[#c5a059] opacity-20 absolute top-8 left-8" />
            <div className="relative z-10 text-center max-w-4xl mx-auto">
              <p className="text-xl md:text-2xl font-bold text-[#1a1a1a] leading-tight italic">
                "This initiative promotes the core values of OBE to enhance employability, nurture <span className="text-[#c5a059]">OBE Monks</span>, and build champions for a better teaching-and learning ecosystem."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
