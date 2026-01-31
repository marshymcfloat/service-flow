"use client";

import { Star, Quote } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

export default function TestimonialsSection() {
  const testimonials: Testimonial[] = [
    {
      quote:
        "ServiceFlow cut our no-shows by 40%. The automated reminders are a game-changer for our small salon.",
      author: "Maria Santos",
      role: "Owner, Bella Spa Manila",
      rating: 5,
    },
    {
      quote:
        "Finally, I can track my staff's attendance without paper timesheets. Payroll day is no longer stressful.",
      author: "Carlos Reyes",
      role: "Manager, Classic Cuts Barbershop",
      rating: 5,
    },
    {
      quote:
        "The booking page is so clean my clients actually use it. We've seen a 60% increase in online bookings.",
      author: "Ana Lim",
      role: "Owner, Glow Wellness Clinic",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-green-50/30 via-background to-background" />

      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center sm:text-left max-w-2xl mx-auto sm:mx-0 mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Trusted by service businesses{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-green-600 to-emerald-500">
              like yours
            </span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Real stories from real business owners who made the switch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="group relative bg-background p-5 sm:p-6 md:p-8 rounded-2xl border border-border/50 hover:border-green-200 hover:shadow-xl hover:shadow-green-100/20 transition-all duration-300"
            >
              <div className="absolute top-6 right-6 text-green-100 group-hover:text-green-200 transition-colors">
                <Quote className="size-8" />
              </div>

              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="size-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              <p className="text-foreground/90 leading-relaxed mb-6 text-base">
                "{testimonial.quote}"
              </p>

              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-linear-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                  <span className="text-sm font-bold text-green-700">
                    {testimonial.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
