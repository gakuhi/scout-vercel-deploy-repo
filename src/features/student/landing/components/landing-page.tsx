import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { AUTH_ROUTES } from "@/shared/constants/auth";

export function LandingPage() {
  return (
    <div className="bg-surface text-on-surface">
      <Header />
      <main>
        <Hero />
        <Problem />
        <ValueProps />
        <Flow />
        <Companies />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant/60 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Scout Link ホーム"
        >
          <Image
            src="/logos/logo.svg"
            alt=""
            width={32}
            height={36}
            priority
            className="h-9 w-auto"
          />
          <span className="text-lg font-semibold text-primary">Scout Link</span>
        </Link>
        <Link
          href={AUTH_ROUTES.STUDENT_LOGIN}
          className="text-sm font-medium text-on-surface-variant hover:text-primary"
        >
          ログイン
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-secondary">
          3 分で登録 ｜ 完全無料 ｜ 学生限定
        </p>
        <h1 className="text-4xl font-bold leading-tight text-primary md:text-6xl md:leading-[1.15]">
          あなたの就活履歴が、
          <br />
          企業との出会いになる。
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-on-surface-variant md:text-lg">
          履歴書じゃなくて、就活履歴で。
          <br className="hidden md:inline" />
          面接練習 AI ・スマート ES ・企業分析 AI ・すごい就活 ―
          あなたが就活でやってきたことを、Scout Link が企業に届けます。
        </p>
        <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center">
          <PrimaryCTA href={AUTH_ROUTES.STUDENT_LOGIN}>
            LINE で無料ではじめる
          </PrimaryCTA>
          <Link
            href={AUTH_ROUTES.STUDENT_LOGIN}
            className="inline-flex h-12 items-center justify-center rounded-full border border-outline-variant px-6 text-sm font-semibold text-primary hover:bg-surface-container"
          >
            すでに登録済みの方はログイン
          </Link>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  const items = [
    {
      icon: "refresh",
      title: "書き直しの繰り返し",
      body: "ガクチカも自己 PR も、毎月のように書き直していませんか？",
    },
    {
      icon: "search_off",
      title: "出会いの不足",
      body: "業界研究はやったけれど、本当に合う企業に出会える気がしない。",
    },
    {
      icon: "mark_email_unread",
      title: "テンプレスカウト",
      body: "「あなたへ」ではない、一斉送信のオファーに気持ちが追いつかない。",
    },
  ];
  return (
    <section className="bg-surface-container-low">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <h2 className="text-3xl font-bold leading-tight text-primary md:text-4xl">
          その就活、損していませんか？
        </h2>
        <ul className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {items.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm"
            >
              <Icon
                name={item.icon}
                className="mb-3 text-3xl text-error"
              />
              <p className="text-sm font-semibold text-on-surface-variant">
                {item.title}
              </p>
              <p className="mt-2 text-base leading-relaxed text-on-surface">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ValueProps() {
  const items = [
    {
      icon: "smart_toy",
      title: "AI プロフィール生成",
      body: "面接練習 AI ・スマート ES ・企業分析 AI ・すごい就活と連携。あなたの就活履歴を AI が読み取り、専用プロフィールを生成します。",
    },
    {
      icon: "trending_up",
      title: "行動履歴ベース",
      body: "就活履歴が増えるほど、出会いが磨かれる。あなたが動くたびに、AI があなたを再評価します。",
    },
    {
      icon: "chat",
      title: "LINE で完結",
      body: "受信から返信、面談調整まですべて LINE で。新しいアプリのインストールは不要です。",
    },
  ];
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <h2 className="text-3xl font-bold leading-tight text-primary md:text-4xl">
          Scout Link が選ばれる 3 つの理由
        </h2>
        <ul className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {items.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm"
            >
              <Icon
                name={item.icon}
                className="mb-3 text-3xl text-secondary"
              />
              <p className="text-sm font-semibold text-on-surface-variant">
                {item.title}
              </p>
              <p className="mt-2 text-base leading-relaxed text-on-surface">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Flow() {
  const steps = [
    {
      no: "01",
      title: "LINE で友だち追加",
      body: "アプリのインストール不要。LINE 上で完結します。",
    },
    {
      no: "02",
      title: "就活 AI ツールを連携",
      body: "使っている AI ツールと連携。任意・後からでも OK 。",
    },
    {
      no: "03",
      title: "AI が就活履歴を分析",
      body: "あなた専用のプロフィールが自動生成されます。",
    },
    {
      no: "04",
      title: "企業からスカウトが届く",
      body: "あなたに合う企業から、 LINE でスカウトが届きます。",
    },
  ];
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <h2 className="text-3xl font-bold leading-tight text-primary md:text-4xl">
          はじめかた
        </h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.no}
              className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6"
            >
              <p className="text-3xl font-bold text-secondary">{step.no}</p>
              <p className="mt-3 text-lg font-semibold text-primary">
                {step.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Companies() {
  return (
    <section className="bg-surface-container-low">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          Scout Link で学生に出会っている企業
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="flex h-16 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface-variant"
            >
              Logo
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "連携した AI の会話内容は、企業に見られますか？",
      a: "会話の生データは企業に公開されません。AI が生成した要約・強み・スキル評価のみ、あなたが許可した形で企業から閲覧されます。",
    },
    {
      q: "4 つの AI ツールを全部使っていないと利用できませんか？",
      a: "連携していなくても登録できます。Scout Link 上での行動履歴からプロフィールが少しずつ磨かれていきます。",
    },
    {
      q: "料金はかかりますか？",
      a: "学生は無料でご利用いただけます。",
    },
    {
      q: "スカウトに必ず返信しないとダメですか？",
      a: "興味がない企業には返信不要です。LINE 上で気軽に判断できます。",
    },
  ];
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-20 md:px-8 md:py-28">
        <h2 className="text-3xl font-bold leading-tight text-primary md:text-4xl">
          よくある質問
        </h2>
        <ul className="mt-12 space-y-4">
          {items.map((item) => (
            <li
              key={item.q}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
            >
              <p className="text-base font-semibold text-primary">
                Q. {item.q}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                {item.a}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-surface-container-low">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <h2 className="text-3xl font-bold leading-tight text-primary md:text-5xl md:leading-[1.15]">
          あなたの就活履歴を、
          <br />
          出会いに変えよう。
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-on-surface-variant md:text-lg">
          履歴書じゃなくて、就活履歴で。
          <br className="hidden md:inline" />
          LINE で友だち追加するだけで、あなたに合う企業がスカウトしてくれます。
        </p>
        <div className="mt-10">
          <PrimaryCTA href={AUTH_ROUTES.STUDENT_LOGIN}>
            LINE で無料ではじめる
          </PrimaryCTA>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-primary text-on-primary">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image
                src="/logos/white_logo.svg"
                alt=""
                width={28}
                height={32}
                className="h-8 w-auto"
              />
              <span className="text-lg font-semibold">Scout Link</span>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-on-primary/70">
              あなたの就活履歴が、企業との出会いになる。
            </p>
          </div>
          <nav className="flex flex-col gap-3 text-sm md:items-end">
            <FooterLink href="/terms">利用規約</FooterLink>
            <FooterLink href="/privacy">プライバシーポリシー</FooterLink>
            <FooterLink href="/about">運営会社</FooterLink>
            <FooterLink href="/contact">お問い合わせ</FooterLink>
            <Link
              href={AUTH_ROUTES.COMPANY_LOGIN}
              className="font-semibold text-secondary-fixed-dim hover:opacity-80"
            >
              企業の方はこちら →
            </Link>
          </nav>
        </div>
        <div className="mt-12 border-t border-on-primary/10 pt-6 text-xs text-on-primary/50">
          © {new Date().getFullYear()} Scout Link. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="hover:opacity-80">
      {children}
    </Link>
  );
}

function PrimaryCTA({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-on-primary shadow-md transition-transform hover:scale-[0.98]"
    >
      <Icon name="chat" className="text-lg" />
      {children}
    </Link>
  );
}
