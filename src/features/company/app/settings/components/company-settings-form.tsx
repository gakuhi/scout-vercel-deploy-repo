"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import type { SettingsActionState } from "@/features/company/app/settings/actions";
import {
  uploadLogoAction,
  removeLogoAction,
} from "@/features/company/app/settings/actions";
import type { CompanyProfile } from "@/features/company/app/settings/queries";
import { EMPLOYEE_COUNT_RANGES } from "@/features/company/app/settings/schemas";
import {
  INDUSTRY_CATEGORIES,
  industryLabels,
} from "@/shared/constants/industries";
import { PREFECTURES } from "@/shared/constants/prefectures";

type CompanySettingsFormProps = {
  company: CompanyProfile;
  readOnly: boolean;
  action: (
    prev: SettingsActionState,
    formData: FormData,
  ) => Promise<SettingsActionState>;
};

const initialState: SettingsActionState = {};

export function CompanySettingsForm({
  company,
  readOnly,
  action,
}: CompanySettingsFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [showToast, setShowToast] = useState(false);

  const logoUrlWithBuster = company.logoUrl
    ? `${company.logoUrl}?v=${company.updatedAt ?? ""}`
    : null;

  useEffect(() => {
    if (state.success) {
      setShowToast(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12">
        <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
          Company Profile
        </span>
        <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
          企業プロフィール
        </h1>
        <p className="text-outline mt-4 font-medium">
          候補者に提示する企業情報を管理します。{readOnly && " 編集は企業オーナーまたは管理者のみ実行できます。"}
        </p>
      </div>

      {showToast && (
        <div className="mb-8 bg-green-50 text-green-700 p-4 rounded-lg text-sm font-semibold">
          企業情報を更新しました
        </div>
      )}

      {!readOnly && (
        <LogoUploader logoUrl={logoUrlWithBuster} />
      )}

      {readOnly && logoUrlWithBuster && (
        <div className="flex items-center gap-4 mb-8">
          <Image
            src={logoUrlWithBuster}
            alt="企業ロゴ"
            width={80}
            height={80}
            className="rounded-xl object-cover"
            unoptimized
          />
          <p className="text-xs text-outline">現在のロゴ</p>
        </div>
      )}

      <form action={formAction} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Field label="会社名" htmlFor="name" full required>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={200}
              defaultValue={company.name}
              disabled={readOnly}
              className={inputClass}
            />
          </Field>
          <Field label="業界" htmlFor="industry">
            <select
              id="industry"
              name="industry"
              defaultValue={company.industry ?? ""}
              disabled={readOnly}
              className={inputClass}
            >
              <option value="">選択してください</option>
              {INDUSTRY_CATEGORIES.map((i) => (
                <option key={i} value={i}>
                  {industryLabels[i]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="従業員数" htmlFor="employeeCountRange">
            <select
              id="employeeCountRange"
              name="employeeCountRange"
              defaultValue={company.employeeCountRange ?? ""}
              disabled={readOnly}
              className={inputClass}
            >
              <option value="">選択してください</option>
              {EMPLOYEE_COUNT_RANGES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Webサイト" htmlFor="websiteUrl" full>
            <input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              defaultValue={company.websiteUrl ?? ""}
              disabled={readOnly}
              placeholder="https://example.com"
              className={inputClass}
            />
          </Field>
          <Field label="郵便番号" htmlFor="postalCode">
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              maxLength={16}
              defaultValue={company.postalCode ?? ""}
              disabled={readOnly}
              placeholder="100-0001"
              className={inputClass}
            />
          </Field>
          <Field label="都道府県" htmlFor="prefecture">
            <select
              id="prefecture"
              name="prefecture"
              defaultValue={company.prefecture ?? ""}
              disabled={readOnly}
              className={inputClass}
            >
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="市区町村" htmlFor="city">
            <input
              id="city"
              name="city"
              type="text"
              maxLength={80}
              defaultValue={company.city ?? ""}
              disabled={readOnly}
              placeholder="千代田区"
              className={inputClass}
            />
          </Field>
          <Field label="番地・ビル名" htmlFor="street">
            <input
              id="street"
              name="street"
              type="text"
              maxLength={200}
              defaultValue={company.street ?? ""}
              disabled={readOnly}
              className={inputClass}
            />
          </Field>
          <Field label="電話番号" htmlFor="phone">
            <input
              id="phone"
              name="phone"
              type="tel"
              maxLength={32}
              defaultValue={company.phone ?? ""}
              disabled={readOnly}
              placeholder="03-1234-5678"
              className={inputClass}
            />
          </Field>
          <Field label="会社紹介" htmlFor="description" full>
            <textarea
              id="description"
              name="description"
              rows={6}
              maxLength={4000}
              defaultValue={company.description ?? ""}
              disabled={readOnly}
              placeholder="候補者に伝えたい会社の魅力、ミッション、事業内容..."
              className={textareaClass}
            />
          </Field>
        </div>

        <div className="bg-surface-container-low p-8 rounded-xl flex items-center gap-4">
          <Icon
            name={company.isVerified ? "verified" : "pending"}
            className={`text-4xl ${
              company.isVerified
                ? "text-primary-container"
                : "text-outline"
            }`}
            filled={company.isVerified}
          />
          <div>
            <p className="font-bold text-primary">
              {company.isVerified ? "審査済み" : "未審査"}
            </p>
            <p className="text-xs text-outline">
              {company.isVerified
                ? "候補者に企業情報と求人を公開できます"
                : "運営による審査完了後、求人を公開できるようになります"}
            </p>
          </div>
        </div>

        {state.error && (
          <p className="text-sm font-semibold text-error" role="alert">
            {state.error}
          </p>
        )}

        {!readOnly && (
          <div className="flex items-center justify-end pt-8 border-t border-outline-variant/20">
            <button
              type="submit"
              disabled={isPending}
              className="signature-gradient px-12 py-4 rounded-lg text-sm font-extrabold text-white shadow-xl hover:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {isPending ? "保存中..." : "変更を保存"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

const inputClass =
  "w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container focus:outline-none px-4 py-4 rounded-md text-on-surface font-semibold disabled:opacity-70";
const textareaClass = inputClass + " resize-none";


function Field({
  label,
  htmlFor,
  full,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  full?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2 block"
      >
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, uploadFormAction, isUploading] = useActionState(
    uploadLogoAction,
    initialState,
  );
  const [isRemoving, setIsRemoving] = useState(false);

  const currentLogo = previewUrl ?? logoUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemove = async () => {
    if (!window.confirm("ロゴ画像を削除しますか？")) return;
    setIsRemoving(true);
    const result = await removeLogoAction();
    setIsRemoving(false);
    if (result.error) {
      window.alert(result.error);
    } else {
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-surface-container-low p-8 rounded-xl flex flex-col md:flex-row gap-8 items-start mb-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-24 h-24 rounded-2xl bg-surface-container-lowest grid place-items-center overflow-hidden shadow-sm relative">
          {currentLogo ? (
            <Image
              src={currentLogo}
              alt="企業ロゴ"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Icon name="image" className="text-4xl text-outline" />
          )}
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
          ロゴ画像
        </p>
        <form action={uploadFormAction} className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="block text-xs text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-surface-container-lowest file:text-primary-container file:font-bold file:cursor-pointer hover:file:bg-surface-container-high"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isUploading || !previewUrl}
              className="signature-gradient text-white text-xs font-bold px-6 py-2 rounded-lg shadow-sm disabled:opacity-50"
            >
              {isUploading ? "アップロード中..." : "ロゴを保存"}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isRemoving}
                className="text-xs font-bold text-secondary hover:text-error transition-colors disabled:opacity-50"
              >
                {isRemoving ? "削除中..." : "ロゴを削除"}
              </button>
            )}
          </div>
        </form>
        <p className="text-[10px] text-outline">
          PNG / JPEG / WEBP（最大 5MB）
        </p>
        {uploadState.error && (
          <p className="text-xs text-error font-semibold">
            {uploadState.error}
          </p>
        )}
        {uploadState.success && (
          <p className="text-xs text-green-600 font-semibold">
            ロゴを更新しました
          </p>
        )}
      </div>
    </div>
  );
}

