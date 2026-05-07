import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type LegalLayoutProps = {
  title: string;
  effectiveDate: string;
  lastUpdated?: string;
  children: ReactNode;
};

export function LegalLayout({
  title,
  effectiveDate,
  lastUpdated,
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-outline-variant/40">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center" aria-label="ScoutLink">
            <Image
              src="/logos/black.png"
              alt="ScoutLink"
              width={1466}
              height={243}
              priority
              className="h-7 w-auto"
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/terms"
              className="font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              利用規約
            </Link>
            <Link
              href="/privacy"
              className="font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              プライバシーポリシー
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <article className="prose-style">
          <header className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {title}
            </h1>
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-on-surface-variant">
              <dt className="font-bold">施行日</dt>
              <dd>{effectiveDate}</dd>
              {lastUpdated && (
                <>
                  <dt className="font-bold">最終更新</dt>
                  <dd>{lastUpdated}</dd>
                </>
              )}
            </dl>
          </header>
          {children}
        </article>
      </main>
      <footer className="border-t border-outline-variant/40 bg-surface-container-low">
        <div className="mx-auto max-w-3xl px-6 py-10 text-xs text-on-surface-variant">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} ScoutLink / 株式会社SHiRO</span>
            <nav className="flex gap-4">
              <Link href="/" className="hover:text-primary transition-colors">
                ホーム
              </Link>
              <Link
                href="/business"
                className="hover:text-primary transition-colors"
              >
                企業の方
              </Link>
              <Link
                href="/terms"
                className="hover:text-primary transition-colors"
              >
                利用規約
              </Link>
              <Link
                href="/privacy"
                className="hover:text-primary transition-colors"
              >
                プライバシーポリシー
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg sm:text-xl font-bold tracking-tight border-l-4 border-primary pl-3">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm sm:text-base leading-relaxed text-on-surface">
        {children}
      </div>
    </section>
  );
}

export function OrderedList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="list-decimal pl-6 space-y-2 marker:text-on-surface-variant marker:font-bold">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

export function UnorderedList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-6 space-y-2 marker:text-on-surface-variant">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
