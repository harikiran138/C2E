import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ServicesSection from "@/components/ServicesSection";
import StakeholderLoginSection from "@/components/StakeholderLoginSection";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <StakeholderLoginSection />
      <AboutSection />
      <ServicesSection />
    </div>
  );
}
