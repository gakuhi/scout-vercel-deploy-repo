"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/icon";
import {
  updateNotificationSettings,
  type SettingsActionState,
} from "@/features/student/settings/actions";
import {
  NOTIFICATION_TYPES,
  type NotificationSettings,
} from "@/features/student/settings/schema";

type SettingsFormProps = {
  notificationSettings: NotificationSettings;
  isMock?: boolean;
};

/** ?mock=1 でレンダ時に server action を呼ばないための no-op。常に成功扱い。 */
async function noopAction(): Promise<SettingsActionState> {
  return { success: true };
}

export function SettingsForm({
  notificationSettings,
  isMock = false,
}: SettingsFormProps) {
  const [notifState, notifFormAction, isNotifPending] = useActionState<
    SettingsActionState,
    FormData
  >(isMock ? noopAction : updateNotificationSettings, {});

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-12">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-[0.2em] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#06c755]" />
          Notification Center
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
          通知・設定
        </h1>
      </div>

      <form id="notification-settings-form" action={notifFormAction}>
        <NotificationSettingsCard
          settings={notificationSettings}
          isSaving={isNotifPending}
          error={notifState.error}
        />
      </form>

      <div className="mt-8">
        <ProductLinksCard />
      </div>
    </div>
  );
}

const KOKOSHIRO_PRODUCTS = [
  {
    key: "sugoshu",
    name: "すごい就活",
    description: "就活ノウハウと戦略設計",
    url: "https://sugoshu.kokoshiro.jp/",
    // ロゴは M PLUS Rounded 1c で親しみのある丸み。
    nameFontFamily: "var(--font-m-plus-rounded)",
    nameWeight: 900,
    icon: "rocket_launch",
    accent: "#ff8a4c",
  },
  {
    key: "compai",
    name: "企業分析AI",
    description: "企業研究を AI が支援",
    url: "https://compai.kokoshiro.jp/",
    nameFontFamily: "var(--font-noto-sans-jp)",
    nameWeight: 800,
    icon: "analytics",
    accent: "#4c8fff",
  },
  {
    key: "interviewai",
    name: "面接練習AI",
    description: "AI と面接シミュレーション",
    url: "https://interview-ai.kokoshiro.jp/",
    nameFontFamily: "var(--font-noto-sans-jp)",
    nameWeight: 800,
    icon: "record_voice_over",
    accent: "#a061ff",
  },
  {
    key: "smartes",
    name: "SmartES",
    description: "エントリーシート作成・添削",
    url: "https://smartes.kokoshiro.jp/",
    nameFontFamily: "var(--font-noto-sans-jp)",
    nameWeight: 800,
    icon: "edit_document",
    accent: "#14b8a6",
  },
] as const;

function ProductLinksCard() {
  return (
    <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary-container/15 text-primary-container">
          <Icon name="apps" />
        </span>
        <h2 className="text-xl font-bold text-on-surface">プロダクト連携</h2>
      </div>
      <p className="text-xs text-outline mb-6 leading-relaxed">
        kokoshiro が運営する就活プロダクトへの入口です。クリックすると外部サイトが開きます。
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {KOKOSHIRO_PRODUCTS.map((p) => (
          <a
            key={p.key}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center gap-4 p-5 rounded-xl border border-outline-variant/40 hover:shadow-md transition-all overflow-hidden"
            style={{ borderColor: undefined }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${p.accent}66`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "";
            }}
          >
            <span
              className="absolute top-0 left-0 bottom-0 w-1"
              style={{ backgroundColor: p.accent }}
              aria-hidden
            />
            <span
              className="inline-flex items-center justify-center w-11 h-11 rounded-lg shrink-0"
              style={{
                backgroundColor: `${p.accent}1f`,
                color: p.accent,
              }}
            >
              <Icon name={p.icon} className="text-xl" />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="text-base truncate text-on-surface"
                style={{
                  fontFamily: p.nameFontFamily,
                  fontWeight: p.nameWeight,
                }}
              >
                {p.name}
              </p>
              <p className="text-xs text-outline mt-1 leading-relaxed truncate">
                {p.description}
              </p>
            </div>
            <Icon
              name="open_in_new"
              className="text-outline group-hover:text-on-surface transition-colors shrink-0"
            />
          </a>
        ))}
      </div>
    </section>
  );
}

function NotificationSettingsCard({
  settings,
  isSaving,
  error,
}: {
  settings: NotificationSettings;
  isSaving: boolean;
  error?: string;
}) {
  return (
    <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded line-green text-white text-sm font-extrabold tracking-wider">
            LINE
          </span>
          通知設定
        </h2>
        {isSaving && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-outline uppercase tracking-[0.2em]">
            <Icon name="sync" className="text-sm animate-spin" />
            保存中
          </span>
        )}
      </div>

      <p className="text-xs text-outline mb-8 leading-relaxed">
        LINE 公式アカウント宛にどの種類の通知を配信するかを切り替えます。OFF にしても通知はアプリ内のベル一覧に通常どおり表示されます。
      </p>

      {error && (
        <div className="mb-6 p-3 bg-error-container rounded-lg text-on-error-container text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-7">
        {NOTIFICATION_TYPES.map((t) => (
          <ToggleRow
            key={t.key}
            name={t.key}
            title={t.label}
            description={t.description}
            defaultChecked={settings[t.key]}
          />
        ))}
      </div>
    </section>
  );
}

function ToggleRow({
  name,
  title,
  description,
  icon,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  icon?: string;
  defaultChecked: boolean;
}) {
  return (
    <label
      htmlFor={name}
      className="flex items-center justify-between gap-4 cursor-pointer"
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <Icon name={icon} className="text-primary-container mt-0.5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface">{title}</p>
          <p className="text-xs text-outline mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      <span className="relative inline-flex items-center shrink-0">
        <input
          id={name}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          onChange={(e) => {
            e.currentTarget.form?.requestSubmit();
          }}
          className="sr-only peer"
        />
        <span className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:bg-primary-container after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 transition-colors" />
      </span>
    </label>
  );
}

