import Link from "next/link";

import { BRAND_NAME } from "@/lib/brand";

const footerGroups = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "About", href: "/about" },
      { label: "Get started", href: "/auth/signup" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Upload QP/MS", href: "/upload" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/about" },
      { label: "Terms", href: "/about" },
      { label: "Local demo", href: "/about" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto grid min-h-[240px] max-w-7xl gap-10 px-6 py-12 md:grid-cols-3">
        {footerGroups.map((group) => (
          <div key={group.heading}>
            <p className="text-sm font-medium uppercase tracking-wide text-text-muted">{group.heading}</p>
            <ul className="mt-5 space-y-3 text-sm text-text-muted">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition-colors hover:text-text">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="overflow-x-hidden px-6">
        <p className="h-[0.72em] overflow-hidden text-[clamp(96px,18vw,240px)] font-semibold leading-[0.85] tracking-[-0.04em] text-text">
          {BRAND_NAME}
        </p>
        <p className="py-4 text-center text-xs text-text-muted">
          Made by Sulaiman Zahwan Latheef - &copy; {new Date().getFullYear()} {BRAND_NAME}
        </p>
      </div>
    </footer>
  );
}
