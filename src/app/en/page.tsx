import { HeroSection } from "@/components/sections/HeroSection";
import { ValuePropBanner } from "@/components/sections/ValuePropBanner";
import { DiscoveryBanner } from "@/components/sections/DiscoveryBanner";
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
import { createMetadata } from "@/lib/metadata";

export const metadata = createMetadata({
  title: "Web agency Abidjan",
  description:
    "Professional websites, e-commerce, AI agents and digital solutions for SMEs in Côte d'Ivoire.",
  path: "/en",
  locale: "en",
});

export default function EnHomePage() {
  return (
    <>
      <HeroSection locale="en" />
      <ValuePropBanner locale="en" />
      <DiscoveryBanner locale="en" />
      <WhyUsSection locale="en" />
      <ServicesSection locale="en" />
      <PartnersSection locale="en" />
      <MethodSection locale="en" />
      <ClientsSection locale="en" />
      <TeamPreviewSection locale="en" />
      <PricingSection locale="en" />
      <GoogleReviewsSection locale="en" />
      <TestimonialsSection locale="en" />
      <FaqSection locale="en" />
    </>
  );
}
