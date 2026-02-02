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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "Service Flow",
                url: "https://www.serviceflow.store",
                logo: "https://www.serviceflow.store/logo.png",
                sameAs: [
                  "https://twitter.com/serviceflow",
                  "https://facebook.com/serviceflow",
                ],
              },
              {
                "@type": "SoftwareApplication",
                name: "Service Flow",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
              },
            ],
          }),
        }}
      />
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
