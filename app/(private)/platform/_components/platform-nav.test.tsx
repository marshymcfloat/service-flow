import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch,
    ...props
  }: {
    href: string;
    children: ReactNode;
    prefetch?: boolean;
    [key: string]: unknown;
  }) => {
    void prefetch;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

import { PlatformNav, type PlatformNavItem } from "./platform-nav";

const items: PlatformNavItem[] = [
  { href: "/platform", label: "Overview", icon: "overview" },
  { href: "/platform/invoices", label: "Invoices", icon: "invoices" },
  { href: "/platform/referrals", label: "Referrals", icon: "referrals" },
];

describe("PlatformNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks overview active on /platform", () => {
    usePathnameMock.mockReturnValue("/platform");
    render(<PlatformNav items={items} />);

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Invoices" })).not.toHaveAttribute("aria-current");
  });

  it("marks nested routes active for matching section", () => {
    usePathnameMock.mockReturnValue("/platform/invoices/123");
    render(<PlatformNav items={items} />);

    expect(screen.getByRole("link", { name: "Invoices" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });
});
