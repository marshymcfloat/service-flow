import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import LandingFooter from "@/components/landing/LandingFooter";

import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-background flex flex-col">
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
