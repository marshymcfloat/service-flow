import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import LandingFooter from "@/components/landing/LandingFooter";

import { Suspense } from "react";

const getBaseUrl = () => {
  const url =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url.replace(/\/$/, "");
  }
  return `https://${url.replace(/\/$/, "")}`;
};

export default function Home() {
  const baseUrl = getBaseUrl();
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
                url: baseUrl,
                logo: `${baseUrl}/logo.png`,
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
                  priceCurrency: "PHP",
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
