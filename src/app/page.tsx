import { Suspense } from "react";
import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/HeroSection";
import { HomeBelowFold } from "@/components/sections/HomeBelowFold";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { getFaqItems } from "@/lib/public-faq-resolver";

export const metadata: Metadata = {
  verification: {
    google: "HJKMgEUIvxJbR9RnUbzkwM2VZ4D1JMBdF1CghaHbDVg",
  },
};

export default async function HomePage() {
  const faqItems = await getFaqItems("fr");

  return (
    <>
      {faqItems.length > 0 && <FaqJsonLd items={faqItems} />}
      <HeroSection />
      <Suspense fallback={null}>
        <HomeBelowFold faqItems={faqItems} />
      </Suspense>
    </>
  );
}
