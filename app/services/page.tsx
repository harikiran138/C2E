import {
  ShieldCheck,
  BookOpen,
  Search,
  Layers,
  Zap,
  Users,
  BarChart,
  Globe,
} from "lucide-react";

export default function ServicesPage() {
  const detailedServices = [
    {
      title: "Institutional Compliance",
      icon: ShieldCheck,
      desc: "Full-scale audit readiness and regulatory adherence management.",
    },
    {
      title: "OBE Implementation",
      icon: BookOpen,
      desc: "End-to-end framework for Outcome-Based Education delivery.",
    },
    {
      title: "IDP Strategy Planning",
      icon: Search,
      desc: "Crafting multi-year Institutional Development Plans.",
    },
    {
      title: "Curriculum Design",
      icon: Layers,
      desc: "Developing future-ready academic programs.",
    },
    {
      title: "Performance Metrics",
      icon: BarChart,
      desc: "Advanced analytics for student and faculty success.",
    },
    {
      title: "Quality Assurance",
      icon: Zap,
      desc: "Internal quality control systems and methodology.",
    },
    {
      title: "Global Benchmarking",
      icon: Globe,
      desc: "Comparing institutional standards with international leaders.",
    },
    {
      title: "Stakeholder Engagement",
      icon: Users,
      desc: "Strategic communication for alumni, parents, and industry.",
    },
  ];

  return (
    <div className="pt-32 pb-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Our Services
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Deep-dive into our comprehensive suite of services designed for
            institutional success.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {detailedServices.map((service, idx) => (
            <div
              key={idx}
              className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover-lift"
            >
              <service.icon className="h-10 w-10 text-primary mb-6" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {service.title}
              </h3>
              <p className="text-sm text-gray-500">{service.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
