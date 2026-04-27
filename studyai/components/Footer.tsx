import Link from "next/link";

import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="mt-12 w-full shrink-0 border-t border-border bg-surface-alt py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 md:grid-cols-3">
        <div>
          <p className="font-serif text-base font-semibold text-text">{BRAND_NAME}</p>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">{BRAND_DESCRIPTION}</p>
          <p className="mt-4 text-xs text-text-muted">© {new Date().getFullYear()} {BRAND_NAME}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Product</p>
          <ul className="mt-3 space-y-2 text-xs text-text-muted">
            <li>
              <Link href="/dashboard" className="hover:text-accent">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/papers" className="hover:text-accent">
                My Papers
              </Link>
            </li>
            <li>
              <Link href="/upload" className="hover:text-accent">
                Upload
              </Link>
            </li>
            <li>
              <Link href="/papers/search" className="hover:text-accent">
                Search
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Help</p>
          <ul className="mt-3 space-y-2 text-xs text-text-muted">
            <li>
              <a
                href="https://github.com"
                className="hover:text-accent"
                target="_blank"
                rel="noreferrer"
              >
                GitHub issues
              </a>
            </li>
            <li>
              <span className="text-text-muted/80">Privacy (placeholder)</span>
            </li>
            <li>
              <span className="text-text-muted/80">Terms (placeholder)</span>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
