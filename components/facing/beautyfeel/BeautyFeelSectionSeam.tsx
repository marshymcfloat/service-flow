import { cn } from "@/lib/utils";

export interface BeautyFeelSectionSeamProps {
  variant?: "hero" | "highlights";
  className?: string;
}

// Usage:
// <BeautyFeelSectionSeam />
// <BeautyFeelSectionSeam variant="highlights" />
export default function BeautyFeelSectionSeam({
  variant = "hero",
  className,
}: BeautyFeelSectionSeamProps) {
  if (variant === "highlights") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-6 -top-10 h-16 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(255,255,255,0))] blur-2xl",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,var(--bf-cream)_75%)]",
        className,
      )}
    />
  );
}
