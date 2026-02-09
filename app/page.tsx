import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import LandingFooter from "@/components/landing/LandingFooter";
import Schema from "@/components/seo/Schema";
import { organizationSchema, websiteSchema } from "@/lib/json-ld";

import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background flex flex-col">
      <Schema data={organizationSchema()} />
      <Schema data={websiteSchema()} />
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <Suspense fallback={null}>
        <LandingFooter />
      </Suspense>
    </main>
  );
}
