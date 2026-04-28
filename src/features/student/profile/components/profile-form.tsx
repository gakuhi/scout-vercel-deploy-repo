"use client";

import {
  useEffect,
  useRef,
  useState,
  useActionState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  createProfile,
  updateProfile,
  type ProfileActionState,
} from "@/features/student/profile/actions";
import { profileSchema } from "@/features/student/profile/schema";
import { getGraduationYearOptions } from "@/features/student/profile/constants";

const GRADUATION_YEARS = getGraduationYearOptions();

// graduation_year を z.coerce.number() で扱う関係で、resolver が受け取るのは
// 変換前の入力型 (string|number)。フォーム側は z.input を採用する。
type ProfileFormValues = z.input<typeof profileSchema>;

type MbtiType = {
  id: string;
  type_code: string;
  name_ja: string;
};

export type StudentProfile = {
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

type ProfileFormProps = {
  mode: "create" | "edit";
  profile: StudentProfile;
  mbtiTypes: MbtiType[];
};

function buildDefaultValues(profile: StudentProfile): Partial<ProfileFormValues> {
  return {
    last_name: profile.last_name ?? "",
    first_name: profile.first_name ?? "",
    last_name_kana: profile.last_name_kana ?? "",
    first_name_kana: profile.first_name_kana ?? "",
    email: profile.email,
    phone: profile.phone ?? "",
    birthdate: profile.birthdate ?? "",
    gender: (profile.gender ?? "") as ProfileFormValues["gender"],
    university: profile.university ?? "",
    faculty: profile.faculty ?? "",
    department: profile.department ?? "",
    academic_type: (profile.academic_type ?? "") as ProfileFormValues["academic_type"],
    graduation_year: profile.graduation_year?.toString() ?? "",
    postal_code: profile.postal_code ?? "",
    prefecture: profile.prefecture ?? "",
    city: profile.city ?? "",
    street: profile.street ?? "",
    building: profile.building ?? "",
    mbti_type_code: profile.mbti_types?.type_code ?? "",
    bio: profile.bio ?? "",
    is_profile_public: profile.is_profile_public ?? false,
  };
}

export function ProfileForm(props: ProfileFormProps) {
  const action = props.mode === "create" ? createProfile : updateProfile;
  const [state, formAction, isPending] = useActionState<ProfileActionState, FormData>(
    action,
    {},
  );
  // useActionState の formAction を transition 外で呼ぶと isPending が更新されない
  // (React の警告どおり、submitting フラグが固まり Cancel ボタン等が永続 disabled になる)。
  // RHF の handleSubmit と組み合わせるため、明示的に startTransition でラップする。
  const [, startTransition] = useTransition();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: buildDefaultValues(props.profile),
  });

  const lastName = watch("last_name") ?? "";
  const firstName = watch("first_name") ?? "";
  const initials = [lastName.charAt(0), firstName.charAt(0)].filter(Boolean).join("");
  const existingImageUrl = props.profile.profile_image_url;

  const handleFileSelect = (file: File | null) => {
    setPendingFile(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onSubmit = (data: ProfileFormValues) => {
    const formData = new FormData();
    const addString = (key: string, value: string | undefined | null) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value);
      }
    };

    addString("last_name", data.last_name);
    addString("first_name", data.first_name);
    addString("last_name_kana", data.last_name_kana);
    addString("first_name_kana", data.first_name_kana);
    addString("email", data.email);
    addString("phone", data.phone);
    addString("birthdate", data.birthdate);
    addString("gender", data.gender);
    addString("university", data.university);
    addString("faculty", data.faculty);
    addString("department", data.department);
    addString("academic_type", data.academic_type);
    addString("graduation_year", String(data.graduation_year));
    addString("postal_code", data.postal_code);
    addString("prefecture", data.prefecture);
    addString("city", data.city);
    addString("street", data.street);
    addString("building", data.building);
    addString("mbti", data.mbti_type_code);
    addString("bio", data.bio);
    if (pendingFile) {
      formData.append("avatar", pendingFile);
    }
    if (data.is_profile_public) {
      formData.append("is_profile_public", "on");
    }

    startTransition(() => {
      formAction(formData);
    });
  };

  const submitting = isPending || isSubmitting;
  const heading =
    props.mode === "create" ? "プロフィール作成" : "プロフィール編集";
  const subHeading =
    props.mode === "create"
      ? "はじめまして！まずはあなたの基本情報を登録しましょう。"
      : "あなたのキャリアの可能性を広げるために、最新の情報に更新しましょう。";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto pb-28">
      <section className="mb-8">
        <h2 className="text-3xl font-extrabold text-primary mb-2">{heading}</h2>
        <p className="text-sm text-on-surface-variant">{subHeading}</p>
      </section>

      {state.error && (
        <div className="mb-6 p-4 bg-error-container rounded-lg text-on-error-container text-sm font-medium">
          {state.error}
        </div>
      )}

      <PhotoSection
        preview={preview}
        existingImageUrl={existingImageUrl}
        initials={initials}
        onFileSelect={handleFileSelect}
      />

      <section className="space-y-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field id="last_name" label="姓" required error={errors.last_name?.message}>
            <input id="last_name" type="text" className={inputClass} {...register("last_name")} />
          </Field>
          <Field id="first_name" label="名" required error={errors.first_name?.message}>
            <input id="first_name" type="text" className={inputClass} {...register("first_name")} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            id="last_name_kana"
            label="セイ（カタカナ）"
            required
            error={errors.last_name_kana?.message}
          >
            <input
              id="last_name_kana"
              type="text"
              className={inputClass}
              {...register("last_name_kana")}
            />
          </Field>
          <Field
            id="first_name_kana"
            label="メイ（カタカナ）"
            required
            error={errors.first_name_kana?.message}
          >
            <input
              id="first_name_kana"
              type="text"
              className={inputClass}
              {...register("first_name_kana")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field id="email" label="メールアドレス" required error={errors.email?.message}>
            <input id="email" type="email" className={inputClass} {...register("email")} />
          </Field>
          <Field
            id="phone"
            label="電話番号（ハイフンなし）"
            required
            error={errors.phone?.message}
          >
            <input id="phone" type="tel" className={inputClass} {...register("phone")} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field id="birthdate" label="生年月日" required error={errors.birthdate?.message}>
            <input id="birthdate" type="date" className={inputClass} {...register("birthdate")} />
          </Field>
          <Field id="gender" label="性別" required error={errors.gender?.message}>
            <select id="gender" className={inputClass} {...register("gender")}>
              <option value="">選択してください</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
              <option value="no_answer">回答しない</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Field id="university" label="大学" required error={errors.university?.message}>
            <input id="university" type="text" className={inputClass} {...register("university")} />
          </Field>
          <Field id="faculty" label="学部" required error={errors.faculty?.message}>
            <input id="faculty" type="text" className={inputClass} {...register("faculty")} />
          </Field>
          <Field id="department" label="学科" required error={errors.department?.message}>
            <input
              id="department"
              type="text"
              className={inputClass}
              {...register("department")}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            id="academic_type"
            label="文理区分"
            required
            error={errors.academic_type?.message}
          >
            <select id="academic_type" className={inputClass} {...register("academic_type")}>
              <option value="">選択してください</option>
              <option value="liberal_arts">文系</option>
              <option value="science">理系</option>
              <option value="other">その他</option>
            </select>
          </Field>
          <Field
            id="graduation_year"
            label="卒業予定年"
            required
            error={errors.graduation_year?.message}
          >
            <select
              id="graduation_year"
              className={inputClass}
              {...register("graduation_year")}
            >
              <option value="">選択してください</option>
              {GRADUATION_YEARS.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}年
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            id="postal_code"
            label="郵便番号（ハイフンなし）"
            required
            error={errors.postal_code?.message}
          >
            <input
              id="postal_code"
              type="text"
              className={inputClass}
              {...register("postal_code")}
            />
          </Field>
          <Field id="prefecture" label="都道府県" required error={errors.prefecture?.message}>
            <input
              id="prefecture"
              type="text"
              className={inputClass}
              {...register("prefecture")}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field id="city" label="市区町村" required error={errors.city?.message}>
            <input id="city" type="text" className={inputClass} {...register("city")} />
          </Field>
          <Field id="street" label="町名・番地" required error={errors.street?.message}>
            <input id="street" type="text" className={inputClass} {...register("street")} />
          </Field>
        </div>
        <Field id="building" label="建物名・部屋番号" error={errors.building?.message}>
          <input id="building" type="text" className={inputClass} {...register("building")} />
        </Field>

        <Field id="mbti" label="性格タイプ（任意）" error={errors.mbti_type_code?.message}>
          <select id="mbti" className={inputClass} {...register("mbti_type_code")}>
            <option value="">選択してください</option>
            {props.mbtiTypes.map((m) => (
              <option key={m.type_code} value={m.type_code}>
                {m.type_code}（{m.name_ja}）
              </option>
            ))}
          </select>
        </Field>

        <Field id="bio" label="自己紹介" error={errors.bio?.message}>
          <textarea
            id="bio"
            rows={5}
            placeholder="あなたの強みや興味のある分野について記入してください。（任意）"
            className={`${inputClass} resize-none leading-relaxed`}
            {...register("bio")}
          />
        </Field>

        <div className="bg-surface-container-lowest rounded-xl soft-border shadow-sm">
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-bold text-on-surface">プロフィールを企業に公開</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                ON にすると企業に公開され、スカウト受信されます。OFF にすると企業からは見えず、新規スカウトも届きません。
              </p>
            </div>
            <label
              htmlFor="is_profile_public"
              className="relative inline-flex items-center cursor-pointer shrink-0 ml-4"
            >
              <input
                id="is_profile_public"
                type="checkbox"
                className="sr-only peer"
                {...register("is_profile_public")}
              />
              <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:bg-primary-container after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5 transition-colors" />
            </label>
          </div>
        </div>
      </section>

      {props.mode === "create" ? (
        isValid && (
          <footer className="fixed bottom-0 left-0 w-full z-50 px-6 py-4 pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <Button type="submit" className="w-full py-4" disabled={submitting}>
                <span>{submitting ? "保存中..." : "プロフィールを登録"}</span>
                <Icon name="check" className="text-lg" />
              </Button>
            </div>
          </footer>
        )
      ) : (
        <EditFooter submitting={submitting} />
      )}
    </form>
  );
}

function EditFooter({ submitting }: { submitting: boolean }) {
  const router = useRouter();
  return (
    <footer className="fixed bottom-20 md:bottom-0 left-0 w-full md:left-64 md:w-[calc(100%-16rem)] z-50 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/20 px-6 py-4">
      <div className="max-w-3xl mx-auto flex gap-4">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 py-4"
          onClick={() => router.push("/student/profile")}
          disabled={submitting}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          className="flex-2 py-4 whitespace-nowrap"
          disabled={submitting}
        >
          <span>{submitting ? "保存中..." : "プロフィールを保存"}</span>
          <Icon name="check" className="text-lg hidden sm:inline" />
        </Button>
      </div>
    </footer>
  );
}

function PhotoSection({
  preview,
  existingImageUrl,
  initials,
  onFileSelect,
}: {
  preview: string | null;
  existingImageUrl: string | null;
  initials: string;
  onFileSelect: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileSelect(file);
  };

  const displayUrl = preview ?? existingImageUrl;

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
            {initials ? initials : <Icon name="person" className="text-5xl" />}
          </div>
        )}
        <button
          type="button"
          className="absolute bottom-0 right-0 bg-primary-container text-white p-2.5 rounded-full shadow-lg hover:opacity-90 active:scale-95 transition-all border-2 border-surface-container-lowest"
          aria-label="プロフィール写真を設定"
        >
          <Icon name="photo_camera" className="text-sm" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      <p className="mt-4 text-[10px] font-bold text-outline uppercase tracking-[0.2em]">
        {preview ? "保存時に反映されます" : "プロフィール写真を設定"}
      </p>
    </section>
  );
}

const inputClass =
  "w-full px-4 py-3 bg-surface-container-lowest outline outline-1 outline-outline-variant/30 rounded-lg text-sm font-medium text-on-surface focus:outline-primary-container focus:outline-2 focus:ring-0 transition-all";

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-on-surface-variant ml-1">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-error font-medium ml-1">{error}</p>}
    </div>
  );
}
