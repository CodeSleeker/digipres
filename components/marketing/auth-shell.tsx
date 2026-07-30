import Link from "next/link";
import { BRAND } from "./theme";
import { Monogram } from "./monogram";

/**
 * Shared frame for the platform's auth screens.
 *
 * These belong to Aliamz Digital, not to any tenant — so they carry the brand
 * wordmark and the light marketing surface, not a client's template theme.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-center px-6 py-16 ${BRAND.page}`}
    >
      <Link
        href="/"
        className={`flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em] ${BRAND.quietLink}`}
      >
        <Monogram size={32} />
        <span>
          Aliamz<span className={BRAND.accent}> Digital</span>
        </span>
      </Link>

      <div className={`mt-8 w-full max-w-sm p-8 ${BRAND.card}`}>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className={`mt-2 text-sm leading-relaxed ${BRAND.muted}`}>
            {subtitle}
          </p>
        )}
        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="mt-6 text-sm">{footer}</div>}
    </main>
  );
}
