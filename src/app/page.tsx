import { HeroSection } from "@/components/sections/HeroSection";
import { ValuePropBanner } from "@/components/sections/ValuePropBanner";
import { WhyUsSection } from "@/components/sections/WhyUsSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { PartnersSection } from "@/components/sections/PartnersSection";
import { MethodSection } from "@/components/sections/MethodSection";
import { ClientsSection } from "@/components/sections/ClientsSection";
import { TeamPreviewSection } from "@/components/sections/TeamPreviewSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { GoogleReviewsSection } from "@/components/sections/GoogleReviewsSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { FaqSection } from "@/components/sections/FaqSection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ValuePropBanner />
      <WhyUsSection />
      <ServicesSection />
      <PartnersSection />
      <MethodSection />
      <ClientsSection />
      <TeamPreviewSection />
      <PricingSection />
      <GoogleReviewsSection />
      <TestimonialsSection />
      <FaqSection />
    </>
  );
}
