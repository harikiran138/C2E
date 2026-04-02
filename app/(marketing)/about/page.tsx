export default function AboutPage() {
  return (
    <div className="pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
          About C2E
        </h1>
        <div className="prose prose-lg text-gray-600 space-y-6">
          <p>
            Compliance To Excellence (C2E) is a premier consultancy dedicated to
            elevating the standards of academic institutions worldwide. We
            specialize in bridging the gap between regulatory requirements and
            actual institutional growth.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h3 className="text-primary font-bold mb-2">Our Vision</h3>
              <p className="text-sm">
                To be the global benchmark for institutional excellence and
                quality assurance in education.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h3 className="text-primary font-bold mb-2">Our Mission</h3>
              <p className="text-sm">
                Empowering educators with innovative frameworks and data-driven
                strategies for continuous improvement.
              </p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
            Why Choose C2E?
          </h2>
          <p>
            Our team consists of senior academic leaders, compliance experts,
            and curriculum designers who bring decades of combined experience.
            We don't just provide a service; we partner with you to transform
            your institutional culture toward a focus on measurable excellence.
          </p>
        </div>
      </div>
    </div>
  );
}
