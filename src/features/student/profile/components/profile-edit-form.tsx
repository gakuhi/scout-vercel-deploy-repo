"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  updateProfile,
  type ProfileActionState,
} from "@/features/student/profile/actions";

type StudentProfile = {
  last_name: string | null;
  first_name: string | null;
  last_name_kana: string | null;
  first_name_kana: string | null;
  email: string;
  phone: string | null;
  birthdate: string | null;
  gender: string | null;
  university: string | null;
  faculty: string | null;
  department: string | null;
  academic_type: string | null;
  graduation_year: number | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  street: string | null;
  building: string | null;
  bio: string | null;
  is_profile_public: boolean | null;
  profile_image_url: string | null;
  mbti_types: { type_code: string; name_ja: string } | null;
};

type MbtiType = {
  id: string;
  type_code: string;
  name_ja: string;
};

type ProfileEditFormProps = {
  profile: StudentProfile;
  mbtiTypes: MbtiType[];
};

/**
 * フォーム全体の編集中ドラフト。input は全てこの state を参照する制御入力になり、
 * サーバーアクションが validation エラーで戻ってきても入力値がリセットされない。
 * 画像（File）だけは file input が本質的に非制御なので別管理。
 */
type Draft = {
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  email: string;
  phone: string;
  birthdate: string;
  gender: string;
  university: string;
  faculty: string;
  department: string;
  academic_type: string;
  graduation_year: string;
  postal_code: string;
  prefecture: string;
  city: string;
  street: string;
  building: string;
  mbti: string;
  bio: string;
  is_profile_public: boolean;
};

function initialDraft(profile: StudentProfile): Draft {
  return {
    last_name: profile.last_name ?? "",
    first_name: profile.first_name ?? "",
    last_name_kana: profile.last_name_kana ?? "",
    first_name_kana: profile.first_name_kana ?? "",
    email: profile.email,
    phone: profile.phone ?? "",
    birthdate: profile.birthdate ?? "",
    gender: profile.gender ?? "",
    university: profile.university ?? "",
    faculty: profile.faculty ?? "",
    department: profile.department ?? "",
    academic_type: profile.academic_type ?? "",
    graduation_year: profile.graduation_year?.toString() ?? "",
    postal_code: profile.postal_code ?? "",
    prefecture: profile.prefecture ?? "",
    city: profile.city ?? "",
    street: profile.street ?? "",
    building: profile.building ?? "",
    mbti: profile.mbti_types?.type_code ?? "",
    bio: profile.bio ?? "",
    is_profile_public: profile.is_profile_public ?? false,
  };
}

/**
 * 卒業予定年の選択肢。現在年の前年から +8 年までをカバーし、
 * 既卒ユーザーから低学年まで対応する。
 */
function graduationYearOptions(): number[] {
  const thisYear = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => thisYear - 1 + i);
}

export function ProfileEditForm({ profile, mbtiTypes }: ProfileEditFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ProfileActionState, FormData>(
    updateProfile,
    {},
  );
  const [draft, setDraft] = useState<Draft>(() => initialDraft(profile));
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const initials = [draft.last_name.charAt(0), draft.first_name.charAt(0)]
    .filter(Boolean)
    .join("");

  return (
    <form action={formAction} className="max-w-3xl mx-auto pb-28">
      <section className="mb-8">
        <h2 className="text-3xl font-extrabold text-primary mb-2">
          プロフィール編集
        </h2>
        <p className="text-sm text-on-surface-variant">
          あなたのキャリアの可能性を広げるために、最新の情報に更新しましょう。
        </p>
      </section>

      {state.error && (
        <div className="mb-6 p-4 bg-error-container rounded-lg text-on-error-container text-sm font-medium">
          {state.error}
        </div>
      )}

      <PhotoSection
        initials={initials || "?"}
        imageUrl={profile.profile_image_url}
      />

      <BasicInfoSection
        draft={draft}
        update={update}
        mbtiTypes={mbtiTypes}
      />

      <FooterActions
        onCancel={() => router.push("/student/profile")}
        isPending={isPending}
      />
    </form>
  );
}

function PhotoSection({
  initials,
  imageUrl,
}: {
  initials: string;
  imageUrl: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // createObjectURL で作った blob: URL をアンマウント時 / 差し替え時に解放する。
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const displayUrl = preview ?? imageUrl;

  return (
    <section className="bg-surface-container-lowest rounded-xl p-8 mb-6 flex flex-col items-center soft-border shadow-sm">
      <div className="relative cursor-pointer" onClick={handleClick}>
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt="プロフィール写真"
            className="w-32 h-32 rounded-xl object-cover border-4 border-surface-container-lowest shadow-inner"
          />
        ) : (
          <div className="w-32 h-32 rounded-xl bg-primary-container grid place-items-center text-4xl font-extrabold text-white border-4 border-surface-container-lowest shadow-inner">
            {initials}
          </div>
        )}
        <button
          type="button"
          className="absolute bottom-0 right-0 bg-primary-container text-white w-10 h-10 flex items-center justify-center rounded-full shadow-lg hover:opacity-90 active:scale-95 transition-all border-2 border-surface-container-lowest"
          aria-label="プロフィール写真を変更"
        >
          <Icon name="photo_camera" className="text-base leading-none" />
        </button>
        {/*
          File を直接 FormData に乗せて Server Action に送る（案 B）。
          クライアントから URL を組み立てて送らないので、URL 偽装の余地がない。
        */}
        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      <button
        type="button"
        onClick={handleClick}
        className="mt-4 text-sm font-medium text-primary underline underline-offset-2 hover:opacity-80 transition"
      >
        画像を変更
      </button>
      {preview && (
        <p className="mt-2 text-[10px] font-bold text-outline uppercase tracking-[0.2em]">
          保存時にアップロードされます
        </p>
      )}
    </section>
  );
}

function BasicInfoSection({
  draft,
  update,
  mbtiTypes,
}: {
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  mbtiTypes: MbtiType[];
}) {
  return (
    <section className="space-y-6 mb-12">
      {/* 氏名 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field id="last_name" label="姓" required>
          <input
            id="last_name"
            name="last_name"
            type="text"
            value={draft.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field id="first_name" label="名" required>
          <input
            id="first_name"
            name="first_name"
            type="text"
            value={draft.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field id="last_name_kana" label="セイ（カタカナ）" required>
          <input
            id="last_name_kana"
            name="last_name_kana"
            type="text"
            value={draft.last_name_kana}
            onChange={(e) => update("last_name_kana", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field id="first_name_kana" label="メイ（カタカナ）" required>
          <input
            id="first_name_kana"
            name="first_name_kana"
            type="text"
            value={draft.first_name_kana}
            onChange={(e) => update("first_name_kana", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>

      {/* メール・電話 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field id="email" label="メールアドレス" required>
          <input
            id="email"
            name="email"
            type="email"
            value={draft.email}
            onChange={(e) => update("email", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field id="phone" label="電話番号（ハイフンなし）" required>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={draft.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>

      {/* 生年月日・性別 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field id="birthdate" label="生年月日" required>
          <input
            id="birthdate"
            name="birthdate"
            type="date"
            value={draft.birthdate}
            onChange={(e) => update("birthdate", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field id="gender" label="性別" required>
          <select
            id="gender"
            name="gender"
            value={draft.gender}
            onChange={(e) => update("gender", e.target.value)}
            required
            className={inputClass}
          >
            <option value="">選択してください</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
            <option value="no_answer">回答しない</option>
          </select>
        </Field>
      </div>

      {/* 大学・学部・学科 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Field id="university" label="大学" required>
          <input
            id="university"
            name="university"
            type="text"
            value={draft.university}
            onChange={(e) => update("university", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field id="faculty" label="学部" required>
          <input
            id="faculty"
            name="faculty"
            type="text"
            value={draft.faculty}
            onChange={(e) => update("faculty", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field id="department" label="学科" required>
          <input
            id="department"
            name="department"
            type="text"
            value={draft.department}
            onChange={(e) => update("department", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>

      {/* 文理・卒業年 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field id="academic_type" label="文理区分" required>
          <select
            id="academic_type"
            name="academic_type"
            value={draft.academic_type}
            onChange={(e) => update("academic_type", e.target.value)}
            required
            className={inputClass}
          >
            <option value="">選択してください</option>
            <option value="liberal_arts">文系</option>
            <option value="science">理系</option>
            <option value="other">その他</option>
          </select>
        </Field>
        <Field id="graduation_year" label="卒業予定年" required>
          <select
            id="graduation_year"
            name="graduation_year"
            value={draft.graduation_year}
            onChange={(e) => update("graduation_year", e.target.value)}
            required
            className={inputClass}
          >
            <option value="">選択してください</option>
            {graduationYearOptions().map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* 住所 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field id="postal_code" label="郵便番号（ハイフンなし）" required>
          <input
            id="postal_code"
            name="postal_code"
            type="text"
            value={draft.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field id="prefecture" label="都道府県" required>
          <input
            id="prefecture"
            name="prefecture"
            type="text"
            value={draft.prefecture}
            onChange={(e) => update("prefecture", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field id="city" label="市区町村" required>
          <input
            id="city"
            name="city"
            type="text"
            value={draft.city}
            onChange={(e) => update("city", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field id="street" label="町名・番地" required>
          <input
            id="street"
            name="street"
            type="text"
            value={draft.street}
            onChange={(e) => update("street", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <Field id="building" label="建物名・部屋番号(任意)">
          <input
            id="building"
            name="building"
            type="text"
            value={draft.building}
            onChange={(e) => update("building", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {/* MBTI */}
      <Field id="mbti" label="MBTIタイプ" required>
        <select
          id="mbti"
          name="mbti"
          value={draft.mbti}
          onChange={(e) => update("mbti", e.target.value)}
          required
          className={inputClass}
        >
          <option value="">選択してください</option>
          {mbtiTypes.map((m) => (
            <option key={m.type_code} value={m.type_code}>
              {m.type_code}（{m.name_ja}）
            </option>
          ))}
        </select>
      </Field>

      {/* 自己紹介 */}
      <Field id="bio" label="自己紹介">
        <textarea
          id="bio"
          name="bio"
          rows={5}
          value={draft.bio}
          onChange={(e) => update("bio", e.target.value)}
          placeholder="あなたの強みや興味のある分野について記入してください。（任意）"
          className={`${inputClass} resize-none leading-relaxed`}
        />
      </Field>

      {/* 公開設定 */}
      <div className="bg-surface-container-lowest rounded-xl soft-border shadow-sm">
        <ToggleRow
          id="is_profile_public"
          title="プロフィールを企業に公開"
          description="公開すると企業の検索結果にあなたのプロフィールが表示されます"
          checked={draft.is_profile_public}
          onChange={(v) => update("is_profile_public", v)}
        />
      </div>
    </section>
  );
}

/* ─── 共通コンポーネント ─── */

const inputClass =
  "w-full px-4 py-3 bg-surface-container-lowest outline outline-1 outline-outline-variant/30 rounded-lg text-sm font-medium text-on-surface focus:outline-primary-container focus:outline-2 focus:ring-0 transition-all";

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-bold text-on-surface-variant ml-1"
      >
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-5 hover:bg-surface-container-low/50 transition-colors">
      <div>
        <p className="text-sm font-bold text-on-surface">{title}</p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          {description}
        </p>
      </div>
      <label
        htmlFor={id}
        className="relative inline-flex items-center cursor-pointer shrink-0 ml-4"
      >
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:bg-primary-container after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 transition-colors" />
      </label>
    </div>
  );
}

function FooterActions({
  onCancel,
  isPending,
}: {
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <footer className="fixed bottom-20 md:bottom-0 left-0 w-full md:left-64 md:w-[calc(100%-16rem)] z-50 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/20 px-6 py-4">
      <div className="max-w-3xl mx-auto flex gap-4">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 py-4"
          onClick={onCancel}
          disabled={isPending}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          className="flex-2 py-4 whitespace-nowrap"
          disabled={isPending}
        >
          <span>{isPending ? "保存中..." : "プロフィールを保存"}</span>
          <Icon name="check" className="text-lg hidden sm:inline" />
        </Button>
      </div>
    </footer>
  );
}
