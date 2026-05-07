import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/shared/utils/cn";

const FEATURES = [
  {
    icon: "hub",
    title: "4 プロダクトのデータを統合",
    body: "面接練習 AI・スマート ES・企業分析 AI・すごい就活 ― 学生が日常的に使う 4 つのプロダクトの利用履歴を集約。学歴では見えない「努力の質」が分かります。",
  },
  {
    icon: "psychology",
    title: "AI が学生の特性を構造化",
    body: "面接の発話データや ES の推敲履歴から、学生のコミュニケーション傾向や思考の深さを AI が要約。書類だけでは伝わらない人柄を、定量と定性の両面で把握できます。",
  },
  {
    icon: "monitoring",
    title: "「いま動いている学生」が見える",
    body: "リアルタイムの就活行動データに基づき、本気で動いている学生を抽出。受け身のナビ媒体では出会えない母集団に、能動的にアプローチできます。",
  },
] as const;

const FLOW_STEPS = [
  {
    step: "01",
    title: "学生を検索・絞り込み",
    body: "スキル / 学部 / 就活活動量 / 志望業界などの条件で、求める学生を瞬時に絞り込み。",
    icon: "search",
  },
  {
    step: "02",
    title: "プロフィールと活動履歴を確認",
    body: "学歴だけでなく、面接練習や ES 添削の履歴、AI が要約した強み・志向性まで把握。",
    icon: "person_search",
  },
  {
    step: "03",
    title: "スカウトを送信、LINE で返信が届く",
    body: "学生は LINE で受信。アプリのインストールがいらないため、開封率が高く、返信も速い。",
    icon: "send",
  },
] as const;

const PLANS = [
  {
    name: "Free",
    price: "¥0",
    cadence: "/ 月",
    description: "まずは ScoutLink を試したい企業向け。",
    cta: "無料で始める",
    href: "/company/login",
    highlighted: false,
    features: [
      "学生検索（基本フィルタ）",
      "スカウト送信 月 5 通まで",
      "プロフィール閲覧 月 30 件",
      "メールサポート",
    ],
  },
  {
    name: "Standard",
    price: "¥98,000",
    cadence: "/ 月",
    description: "通年採用で安定的に学生と接点を持ちたい企業向け。",
    cta: "Standard を始める",
    href: "/company/login",
    highlighted: true,
    features: [
      "学生検索（全フィルタ + AI 推奨）",
      "スカウト送信 月 50 通",
      "プロフィール閲覧 無制限",
      "メッセージ管理機能",
      "求人ページ作成",
      "優先メールサポート",
    ],
  },
  {
    name: "Premium",
    price: "お問い合わせ",
    cadence: "",
    description: "新卒採用を本格的にスケールしたい企業向け。",
    cta: "問い合わせる",
    href: "mailto:sales@example.com?subject=ScoutLink Premium 問い合わせ",
    highlighted: false,
    features: [
      "Standard のすべての機能",
      "スカウト送信 無制限",
      "メンバー追加 無制限",
      "独自レポート / API 連携",
      "専任カスタマーサクセス",
      "Slack 経由の優先サポート",
    ],
  },
] as const;

const FAQ = [
  {
    q: "他のスカウトサービスと何が違いますか？",
    a: "他社が学生本人の自己申告プロフィールに依存するのに対し、ScoutLink は面接練習 AI・スマート ES などの「実際の行動履歴」をベースにマッチングします。盛られたガクチカではなく、学生のリアルな取り組みが見える点が最大の差別化要素です。",
  },
  {
    q: "学生はどのくらい登録していますか？",
    a: "連携している 4 プロダクトを通じ、月間約 6,000 人の新規学生が登録しています。早期から活発に就活している学生が多いのが特徴です。",
  },
  {
    q: "プランは途中で変更できますか？",
    a: "はい、いつでもアップグレード・ダウングレードが可能です。ダウングレード時は次回更新日からの適用となります。",
  },
  {
    q: "最低契約期間はありますか？",
    a: "Free / Standard プランは月単位のご契約で、最低契約期間はありません。Premium プランの契約条件は個別にご相談ください。",
  },
  {
    q: "請求書払いは可能ですか？",
    a: "Standard プラン以上で請求書払いに対応しています。詳細は契約時にご案内します。",
  },
  {
    q: "学生の個人情報の取り扱いは？",
    a: "プライバシーポリシーに基づき適切に管理しています。スカウト承諾前は、企業側に開示される情報は学生の同意範囲に限定されます。",
  },
] as const;

export function CompanyLandingPage() {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <Flow />
        <Pricing />
        <FAQSection />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-outline-variant/40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/business"
          className="flex items-center gap-3"
          aria-label="ScoutLink for Business"
        >
          <Image
            src="/logos/black.png"
            alt="ScoutLink"
            width={1466}
            height={243}
            priority
            className="h-7 w-auto"
          />
          <span className="hidden sm:inline text-xs font-bold tracking-[0.2em] text-on-surface-variant uppercase">
            for Business
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/company/login"
            className="hidden sm:inline text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/company/login"
            className="inline-flex items-center gap-2 rounded-lg signature-gradient px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
          >
            無料で始める
            <Icon name="arrow_forward" className="text-base" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 signature-gradient opacity-[0.06]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(ellipse_at_top_right,rgba(0,52,102,0.18),transparent_60%)]"
      />
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold tracking-wide text-on-primary-fixed-variant">
            <Icon name="domain" className="text-sm" />
            ScoutLink for Business
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
            盛られたガクチカではなく、
            <br />
            <span className="text-primary">本物の就活履歴で出会う。</span>
          </h1>
          <p className="mt-7 text-base sm:text-lg leading-relaxed text-on-surface-variant max-w-2xl">
            ScoutLink
            は、学生が実際に使っている就活プロダクトの行動データを統合し、
            <br className="hidden sm:block" />
            「いま本気で動いている学生」を可視化するスカウトプラットフォームです。
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              href="/company/login"
              className="inline-flex items-center gap-2 rounded-xl signature-gradient px-7 py-4 text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
            >
              無料で始める
              <Icon name="arrow_forward" className="text-lg" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-7 py-4 text-base font-bold text-on-surface hover:bg-surface-container-low transition-colors"
            >
              料金プランを見る
            </a>
          </div>
          <dl className="mt-14 grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-6 max-w-xl">
            <Stat label="月間新規学生" value="6,000+" suffix="名" />
            <Stat label="連携プロダクト" value="4" suffix="サービス" />
            <Stat label="LINE 開封率" value="高" suffix="" />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </dt>
      <dd className="mt-2 text-3xl font-extrabold text-primary">
        {value}
        <span className="ml-1 text-sm font-bold text-on-surface-variant">
          {suffix}
        </span>
      </dd>
    </div>
  );
}

function Features() {
  return (
    <section className="py-24 sm:py-32 bg-surface-container-low">
      <div className="mx-auto max-w-6xl px-6">
        <SectionEyebrow>Why ScoutLink</SectionEyebrow>
        <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight max-w-3xl">
          学生の「実態」が見える、
          <br />
          ３つの差別化ポイント。
        </h2>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-surface-container-lowest p-7 soft-border h-full"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary">
                <Icon name={f.icon} className="text-2xl" />
              </div>
              <h3 className="mt-5 text-lg font-bold leading-snug">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Flow() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionEyebrow>How it works</SectionEyebrow>
        <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight max-w-3xl">
          検索からスカウトまで、3 ステップ。
        </h2>
        <ol className="mt-14 space-y-6">
          {FLOW_STEPS.map((s) => (
            <li
              key={s.step}
              className="grid gap-6 sm:grid-cols-[auto_1fr_auto] items-center rounded-3xl bg-surface-container-low p-8"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl signature-gradient text-white">
                <Icon name={s.icon} className="text-3xl" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-secondary">
                  STEP {s.step}
                </span>
                <h3 className="mt-1 text-lg font-bold leading-snug">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {s.body}
                </p>
              </div>
              <Icon
                name="arrow_forward"
                className="hidden sm:block text-2xl text-on-surface-variant"
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section
      id="pricing"
      className="py-24 sm:py-32 bg-surface-container-low scroll-mt-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionEyebrow>Pricing</SectionEyebrow>
        <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
          シンプルな料金体系。
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-on-surface-variant">
          まずは Free
          で機能をご確認ください。利用規模に応じてアップグレードできます。
        </p>
        <div className="mt-14 grid gap-6 lg:grid-cols-3 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-3xl p-8 h-full",
                plan.highlighted
                  ? "primary-gradient text-white shadow-xl ring-2 ring-primary"
                  : "bg-surface-container-lowest soft-border",
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-extrabold">{plan.name}</h3>
                  {plan.highlighted && (
                    <span className="rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Recommended
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 text-sm leading-relaxed min-h-[2.5em]",
                    plan.highlighted
                      ? "text-white/85"
                      : "text-on-surface-variant",
                  )}
                >
                  {plan.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.cadence && (
                    <span
                      className={cn(
                        "text-sm font-bold",
                        plan.highlighted
                          ? "text-white/85"
                          : "text-on-surface-variant",
                      )}
                    >
                      {plan.cadence}
                    </span>
                  )}
                </div>
              </div>
              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className={cn(
                      "flex items-start gap-2 text-sm",
                      plan.highlighted
                        ? "text-white/95"
                        : "text-on-surface-variant",
                    )}
                  >
                    <Icon
                      name="check"
                      className={cn(
                        "mt-0.5 text-base shrink-0",
                        plan.highlighted ? "text-white" : "text-primary",
                      )}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={cn(
                  "mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition-all active:scale-[0.98]",
                  plan.highlighted
                    ? "bg-white text-primary shadow-lg hover:shadow-xl"
                    : "signature-gradient text-white shadow-md hover:shadow-lg",
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-on-surface-variant">
          ※ 表示価格は税抜です。料金は予告なく改定される場合があります。
        </p>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <SectionEyebrow>FAQ</SectionEyebrow>
        <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
          よくある質問
        </h2>
        <dl className="mt-12 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl bg-surface-container-lowest p-6 soft-border open:shadow-md transition-shadow"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <dt className="text-base font-bold leading-snug">{item.q}</dt>
                <Icon
                  name="expand_more"
                  className="text-xl text-on-surface-variant transition-transform group-open:rotate-180"
                />
              </summary>
              <dd className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                {item.a}
              </dd>
            </details>
          ))}
        </dl>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24 sm:py-32 bg-surface-container-low">
      <div className="mx-auto max-w-5xl px-6">
        <div className="signature-gradient rounded-3xl px-8 py-16 sm:px-16 sm:py-20 text-white text-center shadow-xl">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            次の採用は、
            <br />
            行動データから始めよう。
          </h2>
          <p className="mt-6 text-base sm:text-lg text-white/85 max-w-xl mx-auto">
            まずは Free プランで、ScoutLink
            のスカウト体験を確かめてください。クレジットカード不要で始められます。
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/company/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-primary shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
            >
              無料で始める
              <Icon name="arrow_forward" className="text-lg" />
            </Link>
            <a
              href="mailto:sales@example.com?subject=ScoutLink 導入相談"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors"
            >
              導入を相談する
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-outline-variant/40 bg-surface-container-lowest">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logos/black.png"
                alt="ScoutLink"
                width={1466}
                height={243}
                className="h-7 w-auto"
              />
              <span className="text-xs font-bold tracking-[0.2em] text-on-surface-variant uppercase">
                for Business
              </span>
            </div>
            <p className="mt-3 text-xs text-on-surface-variant max-w-xs leading-relaxed">
              本物の就活履歴で学生と出会う、企業向けスカウトプラットフォーム。
            </p>
            <p className="mt-2 text-xs text-on-surface-variant">
              運営：株式会社SHiRO
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
            <Link
              href="/company/login"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              ログイン
            </Link>
            <Link
              href="/"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              学生の方はこちら
            </Link>
            <a
              href="#pricing"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              料金プラン
            </a>
            <a
              href="mailto:sales@example.com"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              導入相談
            </a>
            <Link
              href="/terms"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              利用規約
            </Link>
            <Link
              href="/privacy"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              プライバシーポリシー
            </Link>
          </nav>
        </div>
        <p className="mt-10 text-xs text-on-surface-variant">
          © {new Date().getFullYear()} 株式会社SHiRO
        </p>
      </div>
    </footer>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-secondary">
      {children}
    </span>
  );
}
