import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import LandingFooter from "@/components/landing/LandingFooter";

import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen  w-full bg-background flex flex-col font-sans">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <Suspense fallback={null}>
        <LandingFooter />
      </Suspense>
    </main>
  );
}
