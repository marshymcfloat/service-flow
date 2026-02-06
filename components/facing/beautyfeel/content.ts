export type BeautyFeelHighlight = {
  title: string;
  description: string;
};

export type BeautyFeelTestimonial = {
  name: string;
  service: string;
  quote: string;
  rating: number;
};

export type BeautyFeelSocial = {
  label: string;
  href: string;
};

export const BEAUTY_FEEL_SLUGS = new Set(["beautyfeel", "beautyifeel"]);

export const beautyFeelContent = {
  hero: {
    eyebrow: "BeautyFeel Studio",
    title: "Glow-first rituals for skin, nails, and lashes.",
    description:
      "Unwind in a quiet studio where every detail is intentional. Book curated treatments that feel restorative and effortless.",
    primaryCta: "Book now",
    secondaryCta: "View services",
  },
  highlights: [
    {
      title: "Skin-first formulas",
      description:
        "Thoughtfully selected products that focus on barrier care and long-lasting glow.",
    },
    {
      title: "Precision artistry",
      description:
        "Deliberate, meticulous work across nails, lash, and facial treatments.",
    },
    {
      title: "Unhurried care",
      description:
        "A calming pace with time for consultation, aftercare, and touch-ups.",
    },
  ] as BeautyFeelHighlight[],
  testimonials: [
    {
      name: "Nadia P.",
      service: "Gel manicure",
      quote:
        "My nails lasted weeks and the whole session felt so calm and polished.",
      rating: 5,
    },
    {
      name: "Kai M.",
      service: "Signature facial",
      quote:
        "Skin felt hydrated right away. The attention to detail was next level.",
      rating: 5,
    },
    {
      name: "Sam R.",
      service: "Lash lift",
      quote: "Natural-looking lift and the studio vibe is beautiful.",
      rating: 5,
    },
  ] as BeautyFeelTestimonial[],
  socials: [
    { label: "Instagram", href: "https://instagram.com/beautyfeel" },
    { label: "Facebook", href: "https://facebook.com/beautyfeel" },
    { label: "TikTok", href: "https://tiktok.com/@beautyfeel" },
  ] as BeautyFeelSocial[],
  quickFacts: [
    { label: "Avg. visit", value: "60-90 min" },
    { label: "Walk-ins", value: "Limited slots" },
    { label: "Payment", value: "Cash, QR" },
  ],
};

export const isBeautyFeelSlug = (slug: string) => BEAUTY_FEEL_SLUGS.has(slug);
