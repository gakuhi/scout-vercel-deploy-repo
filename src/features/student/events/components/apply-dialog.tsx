"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Icon } from "@/components/ui/icon";

export type ApplyContext = {
  eventId: string;
  eventTitle: string;
  eventDateLabel?: string;
  eventLocationLabel?: string;
};

/**
 * 申込フォームの初期値。プロフィール画面で設定されている情報を自動入力するために
 * 上位コンポーネントから渡す。未設定の項目は空欄で表示される。
 */
export type ApplyDefaults = {
  name?: string;
  email?: string;
  affiliation?: string;
};

/** ApplyDialog から submit ハンドラに渡す入力値。 */
export type ApplyDialogSubmitInput = {
  applicantName: string;
  applicantEmail: string;
  applicantAffiliation: string;
  motivation?: string;
};

/** Submit ハンドラの返り値。新規申込 / 既申込 / 失敗を区別する。 */
export type ApplyDialogResult =
  | { ok: true; status: "applied" | "already_applied" }
  | { ok: false; message: string };

type Props = {
  open: boolean;
  context: ApplyContext;
  defaults?: ApplyDefaults;
  onClose: () => void;
  /** 送信ボタン押下時に実行する server action 呼び出し。 */
  onSubmit: (
    eventId: string,
    input: ApplyDialogSubmitInput,
  ) => Promise<ApplyDialogResult>;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; alreadyApplied: boolean }
  | { kind: "error"; message: string };

export function ApplyDialog({ open, context, defaults, onClose, onSubmit }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setState({ kind: "idle" });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // 氏名 / メール / 所属はプロフィール由来 (defaults) を信頼してそのまま送る。
    // ダイアログ上は read-only 表示で編集不可にしているため、未設定で開く想定はない。
    const input: ApplyDialogSubmitInput = {
      applicantName: (defaults?.name ?? "").trim(),
      applicantEmail: (defaults?.email ?? "").trim(),
      applicantAffiliation: (defaults?.affiliation ?? "").trim(),
      motivation:
        String(formData.get("motivation") ?? "").trim() || undefined,
    };
    setState({ kind: "submitting" });
    const result = await onSubmit(context.eventId, input);
    if (result.ok) {
      setState({ kind: "success", alreadyApplied: result.status === "already_applied" });
    } else {
      setState({
        kind: "error",
        message: result.message ?? "申込の送信に失敗しました",
      });
    }
  };

  // Dialog 要素そのもの（= バックドロップ領域）クリックで閉じる。
  const handleDialogMouseDown = (e: ReactMouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onMouseDown={handleDialogMouseDown}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm rounded-xl p-0 w-[92vw] max-w-md md:max-w-lg bg-surface-container-lowest text-on-surface shadow-2xl"
    >
      <div className="flex flex-col max-h-[90vh]">
        <DialogHeader context={context} onClose={onClose} />
        {state.kind === "success" ? (
          <SuccessPanel
            onClose={onClose}
            alreadyApplied={state.alreadyApplied}
          />
        ) : (
          <ApplyForm
            state={state}
            defaults={defaults}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        )}
      </div>
    </dialog>
  );
}

function DialogHeader({
  context,
  onClose,
}: {
  context: ApplyContext;
  onClose: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-4 px-6 md:px-8 pt-6 pb-4 border-b border-outline-variant/30">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
          イベント申し込み
        </div>
        <h2 className="text-lg md:text-xl font-bold leading-snug">
          {context.eventTitle}
        </h2>
        {(context.eventDateLabel || context.eventLocationLabel) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-on-surface-variant">
            {context.eventDateLabel && (
              <span className="inline-flex items-center gap-1">
                <Icon name="calendar_month" className="text-[14px]" />
                {context.eventDateLabel}
              </span>
            )}
            {context.eventLocationLabel && (
              <span className="inline-flex items-center gap-1">
                <Icon name="location_on" className="text-[14px]" />
                {context.eventLocationLabel}
              </span>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 -mr-2 -mt-2 p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg"
        aria-label="閉じる"
      >
        <Icon name="close" />
      </button>
    </header>
  );
}

function ApplyForm({
  state,
  defaults,
  onSubmit,
  onCancel,
}: {
  state: SubmitState;
  defaults?: ApplyDefaults;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCancel: () => void;
}) {
  const isSubmitting = state.kind === "submitting";
  return (
    <form onSubmit={onSubmit} className="flex flex-col min-h-0">
      <div className="px-6 md:px-8 py-5 md:py-6 space-y-5 md:space-y-6 overflow-y-auto">
        <section
          aria-label="申込者情報"
          className="rounded-lg bg-surface-container-low/60 px-4 py-3 md:px-5 md:py-4"
        >
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 items-baseline text-sm">
            <ReadOnlyRow label="氏名" value={defaults?.name} />
            <ReadOnlyRow label="メールアドレス" value={defaults?.email} />
            <ReadOnlyRow label="所属" value={defaults?.affiliation} />
          </dl>
          <p className="pt-3 text-[11px] text-on-surface-variant">
            <Link
              href="/student/profile/edit"
              className="text-primary hover:underline font-bold"
            >
              プロフィールを編集
            </Link>
          </p>
        </section>
        <Field id="apply-motivation" label="志望動機（任意）">
          <textarea
            id="apply-motivation"
            name="motivation"
            rows={3}
            className={`${FIELD_INPUT_CLASS} resize-y`}
          />
        </Field>
        <label className="flex items-start gap-2 text-xs text-on-surface-variant cursor-pointer">
          <input
            type="checkbox"
            name="agree"
            required
            className="mt-0.5 accent-primary"
          />
          <span>
            個人情報の取扱い方針に同意し、イベント運営のために登録情報が利用されることを承諾します。
            <span className="text-error ml-1">*</span>
          </span>
        </label>
        {state.kind === "error" && (
          <p className="text-xs text-error font-semibold" role="alert">
            {state.message}
          </p>
        )}
      </div>
      <footer className="px-6 md:px-8 py-4 border-t border-outline-variant/30 flex gap-3 justify-end bg-surface-container-low">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-bold text-on-surface-variant hover:text-primary"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="signature-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? "送信中…" : "申し込む"}
        </button>
      </footer>
    </form>
  );
}

function SuccessPanel({
  onClose,
  alreadyApplied,
}: {
  onClose: () => void;
  alreadyApplied: boolean;
}) {
  return (
    <div className="px-6 md:px-8 py-10 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-secondary-container text-on-secondary-container grid place-items-center">
        <Icon name="check_circle" filled className="text-3xl" />
      </div>
      <h3 className="text-lg font-bold mb-2">
        {alreadyApplied
          ? "すでに申込済みです"
          : "申し込みを受け付けました"}
      </h3>
      <p className="text-sm text-on-surface-variant leading-relaxed">
        {alreadyApplied
          ? "このイベントへの申込はすでに完了しています。当日の詳細はメールでお知らせします。"
          : "登録されたメールアドレス宛に、受付完了のお知らせをお送りしました。"}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-8 signature-gradient text-white px-8 py-3 rounded-lg font-bold text-sm active:scale-95"
      >
        閉じる
      </button>
    </div>
  );
}

function Field({
  id,
  label,
  required = false,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-bold mb-1.5 text-on-surface-variant"
      >
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant">
        {label}
      </dt>
      <dd className="text-on-surface break-all">{value ?? "—"}</dd>
    </>
  );
}

const FIELD_INPUT_CLASS =
  "w-full px-4 py-2.5 bg-surface-container-low border border-transparent focus:border-primary-container/40 rounded-lg text-sm outline-none";
