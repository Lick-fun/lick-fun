import Link from "next/link";

/**
 * Minimal site footer — legal links + copyright.
 *
 * Rendered inside the scrollable <main> region (below page content, above
 * the mobile BottomNav) so it appears at the bottom of every page without
 * needing per-page wiring.
 */
export function Footer() {
  return (
    <footer className="border-t border-figma-surface px-6 py-6 mt-auto">
      <div className="max-w-content mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-figma-xs text-figma-muted">
        <p>© {new Date().getFullYear()} Lickfun.xyz. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-figma-white transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-figma-white transition-colors">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
