"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { SaveSettingsState } from "@/features/company/app/notifications/actions";
import type { NotificationSettings } from "@/features/company/app/notifications/schemas";

type NotificationSettingsViewProps = {
  settings: NotificationSettings;
  action: (
    prev: SaveSettingsState,
    formData: FormData,
  ) => Promise<SaveSettingsState>;
};

const initialState: SaveSettingsState = {};

export function NotificationSettingsView({
  settings,
  action,
}: NotificationSettingsViewProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (state.success) {
      setShowToast(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <button
          type="button"
          onClick={() => router.push("/company/notifications")}
          className="flex items-center gap-1 text-xs font-bold text-outline hover:text-primary-container transition-colors mb-4"
        >
          <Icon name="arrow_back" className="text-sm" />
          通知一覧に戻る
        </button>
        <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
          Notification Settings
        </span>
        <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
          通知設定
        </h1>
        <p className="text-outline mt-4 font-medium">
          メール通知を受け取る種類を設定します。アプリ内通知はすべての種別で常に表示されます。
        </p>
      </div>

      {showToast && (
        <div className="mb-8 bg-green-50 text-green-700 p-4 rounded-lg text-sm font-semibold">
          通知設定を保存しました
        </div>
      )}

      {state.error && (
        <div className="mb-8 bg-error-container text-on-error-container p-4 rounded-lg text-sm font-semibold">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-8">
        {/* メール通知種別 */}
        <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-primary-container flex items-center gap-2">
            <Icon name="mail" className="text-lg" />
            メール通知種別
          </h2>
          <p className="text-xs text-outline">
            メール通知を受け取りたい種類を選択してください。
          </p>

          <SettingToggle
            name="scoutAccepted"
            label="スカウト承諾"
            description="学生がスカウトを承諾した時にメールで通知"
            icon="check_circle"
            defaultChecked={settings.scoutAccepted}
          />
          <SettingToggle
            name="chatMessage"
            label="チャット新着"
            description="学生からの新着メッセージをメールで通知"
            icon="chat"
            defaultChecked={settings.chatMessage}
          />
          <SettingToggle
            name="eventReminder"
            label="イベントリマインダー"
            description="イベント開催日が近づいた時にメールで通知"
            icon="event"
            defaultChecked={settings.eventReminder}
          />
          <SettingToggle
            name="systemAnnouncement"
            label="システムお知らせ"
            description="サービスに関する重要なお知らせをメールで通知"
            icon="campaign"
            defaultChecked={settings.systemAnnouncement}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="signature-gradient text-white text-sm font-bold px-8 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "保存中..." : "設定を保存"}
        </button>
      </form>
    </div>
  );
}

function SettingToggle({
  name,
  label,
  description,
  icon,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  icon: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  useEffect(() => {
    setChecked(defaultChecked);
  }, [defaultChecked]);

  return (
    <label className="flex items-center justify-between gap-4 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <Icon name={icon} className="text-outline text-lg" />
        <div>
          <p className="text-sm font-semibold text-on-surface">{label}</p>
          <p className="text-xs text-outline">{description}</p>
        </div>
      </div>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="w-5 h-5 rounded text-primary-container focus:ring-primary-container cursor-pointer"
      />
    </label>
  );
}
