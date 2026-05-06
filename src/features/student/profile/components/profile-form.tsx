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
import DatePicker, { registerLocale } from "react-datepicker";
import Picker from "react-mobile-picker";
import { ja } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  createProfile,
  updateProfile,
  type ProfileActionState,
} from "@/features/student/profile/actions";
import { profileSchema } from "@/features/student/profile/schema";
import { getGraduationYearOptions } from "@/features/student/profile/constants";

// react-datepicker のヘッダー / 月名 / 曜日表記を日本語化する。
registerLocale("ja", ja);

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
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: buildDefaultValues(props.profile),
  });

  // birthdate は DatePicker (カレンダー UI) で setValue 経由で更新するため
  // 明示的に register して validation 対象にする。
  register("birthdate");

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
          <BirthdateField
            value={watch("birthdate") ?? ""}
            onChange={(v) =>
              setValue("birthdate", v, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            error={errors.birthdate?.message}
          />
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

/**
 * 生年月日入力。`<input type="date">` のネイティブ picker は年スクロールが
 * 重いため、デバイスごとに UI を出し分ける:
 * - PC (md+): react-datepicker の calendar UI。年は scrollable dropdown
 * - モバイル (< md): react-mobile-picker の iOS 風 wheel UI（年/月/日 3 列）
 *
 * 値は YYYY-MM-DD 形式の文字列で外部とやり取り。未来日付・60 年以上前は
 * range で制限。
 */
function BirthdateField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const today = new Date();
  // ISO 文字列の new Date() は UTC で解釈されてズレるので、yyyy-mm-dd を
  // ローカルタイム扱いで Date 化する。
  const selected = parseLocalDate(value);
  const minDate = new Date(today.getFullYear() - 60, 0, 1);
  // SSR/初期 render は PC 想定で DatePicker を出し、mount 後にメディアクエリを
  // 評価して一方だけに切り替える（両方 mount を回避）。
  const isMobile = useIsMobile();

  return (
    <Field id="birthdate" label="生年月日" required error={error}>
      {isMobile ? (
        <BirthdateWheel
          value={value}
          onChange={onChange}
          minYear={minDate.getFullYear()}
          maxYear={today.getFullYear()}
        />
      ) : (
        <DatePicker
          id="birthdate"
          selected={selected}
          onChange={(d: Date | null) => onChange(d ? formatYMD(d) : "")}
          dateFormat="yyyy/MM/dd"
          locale="ja"
          maxDate={today}
          minDate={minDate}
          placeholderText="日付を選択"
          className={inputClass}
          wrapperClassName="block w-full"
          popperClassName="z-50"
          renderCustomHeader={(p) => (
            <BirthdateHeader
              {...p}
              minYear={minDate.getFullYear()}
              maxYear={today.getFullYear()}
            />
          )}
        />
      )}
    </Field>
  );
}

/**
 * モバイル幅向け: 通常はカレンダー UI で日タップ。header の年/月は
 * タップで wheel picker overlay が出る形にする。
 *
 * - 年/月の display 状態は内部 state で持ち、ユーザーが wheel を回すたびに
 *   すぐカレンダーグリッドに反映する
 * - 既に日が選択済みなら wheel で年/月が変わった時点で form value も追従する
 *   （日未選択時は wheel 操作だけでは emit しない → 日タップで初確定）
 */
function BirthdateWheel({
  value,
  onChange,
  minYear,
  maxYear,
}: {
  value: string;
  onChange: (value: string) => void;
  minYear: number;
  maxYear: number;
}) {
  const parsed = parseBirthdateParts(value);
  const fallbackYear = Math.max(minYear, maxYear - 20);
  // 表示中の年/月は内部 state で持ち、外部 value と独立させる
  // （日未選択でも年/月だけ動かしたいケースのため）。初期値は mount 時に value から決定。
  const [displayYear, setDisplayYear] = useState(parsed?.y ?? fallbackYear);
  const [displayMonth, setDisplayMonth] = useState(parsed?.m ?? 1);
  const [openWheel, setOpenWheel] = useState<"year" | "month" | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const day = parsed?.d ?? null;

  // 外部 value が変わった（フォームリセット等）かつパース可能なら display 状態を同期。
  // value 文字列の同一性で判定するので無限ループしない。
  const lastSyncedRef = useRef(value);
  useEffect(() => {
    if (lastSyncedRef.current === value) return;
    lastSyncedRef.current = value;
    const next = parseBirthdateParts(value);
    if (next) {
      setDisplayYear(next.y);
      setDisplayMonth(next.m);
    }
  }, [value]);

  const emit = (y: number, m: number, d: number | null) => {
    if (d == null) return;
    const lastDay = new Date(y, m, 0).getDate();
    const adjusted = Math.min(d, lastDay);
    onChange(
      `${y}-${String(m).padStart(2, "0")}-${String(adjusted).padStart(2, "0")}`,
    );
  };

  const setYear = (y: number) => {
    setDisplayYear(y);
    emit(y, displayMonth, day);
  };
  const setMonth = (m: number) => {
    setDisplayMonth(m);
    emit(displayYear, m, day);
  };
  const handleDayTap = (d: number) => {
    emit(displayYear, displayMonth, d);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setCalendarOpen(true)}
        className={`${inputClass} text-left ${
          parsed ? "text-on-surface" : "text-on-surface-variant/60"
        }`}
        aria-label="生年月日を選択"
      >
        {parsed
          ? `${parsed.y}年${parsed.m}月${parsed.d}日`
          : "日付を選択"}
      </button>
      {calendarOpen && (
        <CalendarModal
          onClose={() => setCalendarOpen(false)}
          displayYear={displayYear}
          displayMonth={displayMonth}
          onTapYear={() => setOpenWheel("year")}
          onTapMonth={() => setOpenWheel("month")}
          selectedDay={
            // 表示中の年/月と form 上の年/月が一致するときだけ選択日をハイライト。
            parsed && parsed.y === displayYear && parsed.m === displayMonth
              ? day
              : null
          }
          onSelectDay={handleDayTap}
        />
      )}
      {openWheel && (
        <WheelOverlay
          type={openWheel}
          year={displayYear}
          month={displayMonth}
          minYear={minYear}
          maxYear={maxYear}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onClose={() => setOpenWheel(null)}
        />
      )}
    </>
  );
}

/** モバイル用 calendar モーダル本体。a11y 副作用 (ESC / scroll lock) も担う。 */
function CalendarModal({
  onClose,
  displayYear,
  displayMonth,
  onTapYear,
  onTapMonth,
  selectedDay,
  onSelectDay,
}: {
  onClose: () => void;
  displayYear: number;
  displayMonth: number;
  onTapYear: () => void;
  onTapMonth: () => void;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
}) {
  useModalEffects(true, onClose);
  const titleId = "birthdate-calendar-title";
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="w-full max-w-xs bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30">
          <span id={titleId} className="text-sm font-bold text-on-surface">
            生年月日を選択
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-sm font-bold text-primary-container hover:bg-surface-container"
          >
            完了
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 px-3 py-3 border-b border-outline-variant/30">
          <button
            type="button"
            onClick={onTapYear}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-sm font-bold text-on-surface flex items-center gap-1"
            aria-label="年を選択"
          >
            {displayYear}年
            <Icon name="expand_more" className="text-base text-outline" />
          </button>
          <button
            type="button"
            onClick={onTapMonth}
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-sm font-bold text-on-surface flex items-center gap-1"
            aria-label="月を選択"
          >
            {displayMonth}月
            <Icon name="expand_more" className="text-base text-outline" />
          </button>
        </div>
        <MiniDayGrid
          year={displayYear}
          month={displayMonth}
          selectedDay={selectedDay}
          onSelect={onSelectDay}
        />
      </div>
    </div>
  );
}

/** 年または月を回せる wheel picker のオーバーレイ。タップ時にだけ展開する。 */
function WheelOverlay({
  type,
  year,
  month,
  minYear,
  maxYear,
  onYearChange,
  onMonthChange,
  onClose,
}: {
  type: "year" | "month";
  year: number;
  month: number;
  minYear: number;
  maxYear: number;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  onClose: () => void;
}) {
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) =>
    String(maxYear - i),
  );
  const months = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );

  const value: Record<string, string> =
    type === "year"
      ? { year: String(year) }
      : { month: String(month).padStart(2, "0") };

  const handleChange = (v: Record<string, string>) => {
    if (type === "year" && v.year) onYearChange(Number(v.year));
    if (type === "month" && v.month) onMonthChange(Number(v.month));
  };

  useModalEffects(true, onClose);
  const titleId = `wheel-overlay-title-${type}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="w-full max-w-xs bg-surface-container-lowest rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30">
          <span id={titleId} className="text-sm font-bold text-on-surface">
            {type === "year" ? "年" : "月"}を選択
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-sm font-bold text-primary-container hover:bg-surface-container"
          >
            完了
          </button>
        </div>
        <div className="px-4 py-3">
          <Picker
            value={value}
            onChange={handleChange}
            height={200}
            itemHeight={40}
            wheelMode="natural"
          >
            {type === "year" ? (
              <Picker.Column name="year">
                {years.map((y) => (
                  <Picker.Item key={y} value={y}>
                    {({ selected }) => (
                      <span
                        className={
                          selected
                            ? "text-lg font-bold text-primary"
                            : "text-base text-on-surface-variant/60"
                        }
                      >
                        {y}年
                      </span>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>
            ) : (
              <Picker.Column name="month">
                {months.map((m) => (
                  <Picker.Item key={m} value={m}>
                    {({ selected }) => (
                      <span
                        className={
                          selected
                            ? "text-lg font-bold text-primary"
                            : "text-base text-on-surface-variant/60"
                        }
                      >
                        {Number(m)}月
                      </span>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>
            )}
          </Picker>
        </div>
      </div>
    </div>
  );
}

/** 指定の年/月の日付グリッド。日タップで選択を通知する。 */
function MiniDayGrid({
  year,
  month,
  selectedDay,
  onSelect,
}: {
  year: number;
  month: number;
  selectedDay: number | null;
  onSelect: (day: number) => void;
}) {
  // JS Date(year, monthIndex(0-11), 1) → 月の 1 日。getDay() が 0(日)〜6(土)。
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  // 1 日の前にダミーセルを並べて grid 上の位置を合わせる。
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="border-t border-outline-variant/30 px-3 py-3">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((w, i) => (
          <div
            key={w}
            className={`text-[10px] text-center font-bold ${
              i === 0
                ? "text-error"
                : i === 6
                  ? "text-primary-container"
                  : "text-on-surface-variant"
            }`}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              className={`h-8 rounded text-sm font-medium transition-colors ${
                selectedDay === d
                  ? "bg-primary-container text-white font-bold"
                  : "text-on-surface hover:bg-surface-container"
              }`}
            >
              {d}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function parseBirthdateParts(
  value: string,
): { y: number; m: number; d: number } | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function parseLocalDate(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * react-datepicker のカレンダー header を「左に年 / 右に月」の dropdown 並びで
 * 描画する。デフォルト header は month → year の順で日本語的に違和感があるため
 * 自前で組む。年は minYear〜maxYear を新しい順に列挙、月は 1〜12 月。
 */
function BirthdateHeader({
  date,
  changeYear,
  changeMonth,
  minYear,
  maxYear,
}: {
  date: Date;
  changeYear: (y: number) => void;
  changeMonth: (m: number) => void;
  minYear: number;
  maxYear: number;
}) {
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) =>
    maxYear - i,
  );
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-2">
      <select
        aria-label="年"
        value={date.getFullYear()}
        onChange={(e) => changeYear(Number(e.target.value))}
        className="px-2 py-1 rounded border border-outline-variant/40 bg-surface-container-lowest text-sm font-bold text-on-surface"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}年
          </option>
        ))}
      </select>
      <select
        aria-label="月"
        value={date.getMonth() + 1}
        onChange={(e) => changeMonth(Number(e.target.value) - 1)}
        className="px-2 py-1 rounded border border-outline-variant/40 bg-surface-container-lowest text-sm font-bold text-on-surface"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {m}月
          </option>
        ))}
      </select>
    </div>
  );
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Modal を開いている間の共通副作用:
 * - body の overflow を hidden にして背景スクロールを止める
 * - ESC キーで onClose を発火する
 *
 * 同 component 内に複数の modal があるため、入れ子で使う場合も干渉しないよう
 * mount 時の overflow 値を保存して復元する。
 */
function useModalEffects(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);
}

/**
 * tailwind の md (768px) ブレークポイント未満なら true。SSR / 初期 render は
 * false を返すため、最初は PC 想定で hydrate される。jsdom / 古いブラウザの
 * matchMedia 未対応環境でも安全に動くよう存在チェックする。
 */
function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}
