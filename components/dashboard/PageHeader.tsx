import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

interface PageHeaderActionProps {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export function PageHeader({
  title,
  description,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm md:text-base">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 mt-4 sm:mt-0">{children}</div>
      )}
    </div>
  );
}

export function PageHeaderAction({
  label,
  href,
  onClick,
  icon: Icon = Plus,
  variant = "default",
}: PageHeaderActionProps) {
  const content = (
    <>
      <Icon className="h-4 w-4 mr-2" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Add</span>
    </>
  );

  if (href) {
    return (
      <Button asChild variant={variant} className="shadow-sm">
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button onClick={onClick} variant={variant} className="shadow-sm">
      {content}
    </Button>
  );
}
