"use client";

import { BarChart3, Calendar, Users, CheckCircle2 } from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      title: "Smart Scheduling",
      description:
        "Effortless booking management with automated conflicts checking. Drag-and-drop calendar interface coming soon.",
      icon: Calendar,
      color: "green",
      points: ["Real-time availability", "Automated reminders"],
    },
    {
      title: "Staff Management",
      description:
        "Track attendance, daily tasks, and performance commissions. Keep your team organized and motivated.",
      icon: Users,
      color: "blue",
      points: ["Geofenced attendance", "Performance tracking"],
    },
    {
      title: "Business Analytics",
      description:
        "Gain insights into your revenue, popular services, and customer retention with interactive dashboards.",
      icon: BarChart3,
      color: "purple",
      points: ["Revenue reports", "Service popularity"],
    },
  ];

  const colorVariants: Record<string, any> = {
    green: {
      bg: "bg-linear-to-br from-green-50 to-emerald-100/50 group-hover:from-green-600 group-hover:to-emerald-600",
      text: "text-green-600 group-hover:text-white",
      shadow: "hover:shadow-green-100/50 hover:border-green-200",
      icon: "text-green-500",
    },
    blue: {
      bg: "bg-linear-to-br from-blue-50 to-indigo-100/50 group-hover:from-blue-600 group-hover:to-indigo-600",
      text: "text-blue-600 group-hover:text-white",
      shadow: "hover:shadow-blue-100/50 hover:border-blue-200",
      icon: "text-blue-500",
    },
    purple: {
      bg: "bg-linear-to-br from-purple-50 to-violet-100/50 group-hover:from-purple-600 group-hover:to-violet-600",
      text: "text-purple-600 group-hover:text-white",
      shadow: "hover:shadow-purple-100/50 hover:border-purple-200",
      icon: "text-purple-500",
    },
  };

  return (
    <section
      id="features"
      className="py-24 bg-muted/30 border-y border-border/40 relative"
    >
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
            Everything you need to <br className="hidden sm:block" /> run your
            business
          </h2>
          <p className="text-muted-foreground text-lg/relaxed">
            Powerful features designed to replace your spreadsheets and manual
            logs with intelligent automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const styles = colorVariants[feature.color];

            return (
              <div
                key={feature.title}
                className={`group bg-background p-8 rounded-3xl shadow-sm border border-border/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${styles.shadow}`}
              >
                <div
                  className={`size-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${styles.bg} ${styles.text}`}
                >
                  <feature.icon className="size-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {feature.description}
                </p>
                <ul className="space-y-2 mt-auto">
                  {feature.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-center text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className={`size-4 mr-2 ${styles.icon}`} />{" "}
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
