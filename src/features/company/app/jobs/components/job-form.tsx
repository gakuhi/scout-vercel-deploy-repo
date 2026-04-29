"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/shared/utils/cn";
import { Input, FieldLabel } from "@/components/ui/input";
import { EMPLOYMENT_TYPES } from "@/features/company/app/jobs/schemas";
import { INDUSTRY_CATEGORIES } from "@/features/company/app/jobs/industry-data";
import { JOB_TYPE_CATEGORIES } from "@/features/company/app/jobs/job-type-data";
import { PREFECTURES } from "@/shared/constants/locations";
import type { SaveJobState } from "@/features/company/app/jobs/actions/save";
import type { JobPosting } from "@/features/company/app/jobs/queries";

type JobFormProps = {
  job?: JobPosting;
  action: (prev: SaveJobState, formData: FormData) => Promise<SaveJobState>;
};

const initialState: SaveJobState = {};

const RequiredMark = () => (
  <span className="text-error ml-0.5" aria-label="必須">
    *
  </span>
);

export function JobForm({ job, action }: JobFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);

  // プレビュー
  const [showPreview, setShowPreview] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // 画像アップロード
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const hasExistingImage = !!job?.heroImagePath && !removeImage;

  // 職種の2段階選択
  const initialJobTypeCategory = job?.jobType
    ? JOB_TYPE_CATEGORIES.find((c) =>
        c.subcategories.includes(job.jobType!),
      )?.label ?? ""
    : "";
  const [selectedJobTypeCategory, setSelectedJobTypeCategory] = useState(initialJobTypeCategory);

  // 業種の2段階選択
  const initialCategory = job?.jobCategory
    ? INDUSTRY_CATEGORIES.find((c) =>
        c.subcategories.includes(job.jobCategory!),
      )?.label ?? ""
    : "";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // 勤務地の2段階選択
  const initialPrefecture = job?.workLocation
    ? PREFECTURES.find((p) =>
        p.municipalities.includes(job.workLocation!),
      )?.label ?? ""
    : "";
  const [selectedPrefecture, setSelectedPrefecture] = useState(initialPrefecture);
  const [selectedCity, setSelectedCity] = useState(
    job?.workLocation
      ? job.workLocation.replace(/^.+?[都道府県]\s*/, "")
      : "",
  );

  useEffect(() => {
    if (state.success && state.jobId) {
      router.push("/company/jobs");
    }
  }, [state.success, state.jobId, router]);

  // 必須項目の検証: HTML5 required + チェックボックス群 + 画像
  const validateRequired = (): boolean => {
    const form = formRef.current;
    if (!form) return false;
    if (!form.reportValidity()) return false;

    const checkedYears = form.querySelectorAll<HTMLInputElement>(
      'input[name="targetGraduationYears"]:checked',
    );
    if (checkedYears.length === 0) {
      alert("対象卒業年度を1つ以上選択してください");
      return false;
    }

    const hasImage = !!imagePreview || hasExistingImage;
    if (!hasImage) {
      alert("トップ画像をアップロードしてください");
      return false;
    }
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs font-bold text-outline hover:text-primary-container transition-colors mb-4"
        >
          <Icon name="arrow_back" className="text-sm" />
          求人一覧に戻る
        </button>
        <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
          {job ? "Edit Job Posting" : "New Job Posting"}
        </span>
        <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
          {job ? "求人編集" : "新規求人作成"}
        </h1>
        <p className="text-outline mt-4 font-medium">
          求人情報を入力しましょう。下書き保存も可能です。
        </p>
      </div>

      {state.error && (
        <div className="mb-8 bg-error-container text-on-error-container p-4 rounded-lg text-sm font-semibold">
          {state.error}
        </div>
      )}

      <form ref={formRef} action={formAction}>
        {job && <input type="hidden" name="jobId" value={job.id} />}

        {showPreview && (
          <JobPreview
            formRef={formRef}
            imagePreview={imagePreview}
            hasExistingImage={hasExistingImage}
            isPending={isPending}
            onBack={() => setShowPreview(false)}
            validateRequired={validateRequired}
          />
        )}
        <div className={cn("space-y-10", showPreview && "hidden")}>
            {/* Section 01: 基本情報 */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg signature-gradient text-white text-xs font-bold">
                  01
                </span>
                <h2 className="text-lg font-bold text-primary-container">
                  基本情報
                </h2>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
                {/* トップ画像 */}
                <div className="space-y-1.5">
                  <FieldLabel>トップ画像<RequiredMark /></FieldLabel>
                  {removeImage && <input type="hidden" name="removeHeroImage" value="true" />}
                  <div
                    className={cn(
                      "relative rounded-xl overflow-hidden border-2 border-dashed transition-colors",
                      imagePreview || hasExistingImage
                        ? "border-transparent"
                        : "border-outline-variant hover:border-primary-container",
                    )}
                  >
                    {imagePreview ? (
                      <div className="relative h-48">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="プレビュー" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full grid place-items-center hover:bg-black/70 transition-colors"
                        >
                          <Icon name="close" className="text-sm" />
                        </button>
                      </div>
                    ) : hasExistingImage ? (
                      <div className="relative h-48 bg-surface-container grid place-items-center">
                        <div className="text-center">
                          <Icon name="image" className="text-3xl text-outline mb-1" />
                          <p className="text-xs text-outline">画像設定済み</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRemoveImage(true)}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full grid place-items-center hover:bg-black/70 transition-colors"
                        >
                          <Icon name="close" className="text-sm" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-36 flex flex-col items-center justify-center gap-2 text-outline hover:text-primary-container transition-colors"
                      >
                        <Icon name="add_photo_alternate" className="text-3xl" />
                        <span className="text-xs font-medium">クリックして画像をアップロード</span>
                        <span className="text-[10px] text-outline-variant">推奨: 1200x400px / 最大10MB / JPG・PNG・WebP</span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="heroImage"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setRemoveImage(false);
                      const url = URL.createObjectURL(file);
                      setImagePreview(url);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="job-title">求人タイトル<RequiredMark /></FieldLabel>
                  <Input
                    id="job-title"
                    name="title"
                    type="text"
                    placeholder="例: 戦略コンサルタント - 次世代リーダーシップ・プログラム"
                    defaultValue={job?.title ?? ""}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="industry-category">業種（大分類）<RequiredMark /></FieldLabel>
                    <select
                      id="industry-category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      required
                      className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                    >
                      <option value="">選択してください</option>
                      {INDUSTRY_CATEGORIES.map((cat) => (
                        <option key={cat.label} value={cat.label}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="job-category">業種（小分類）<RequiredMark /></FieldLabel>
                    <select
                      id="job-category"
                      name="jobCategory"
                      defaultValue={job?.jobCategory ?? ""}
                      disabled={!selectedCategory}
                      required
                      className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all disabled:opacity-50"
                    >
                      <option value="">
                        {selectedCategory ? "選択してください" : "先に大分類を選択"}
                      </option>
                      {INDUSTRY_CATEGORIES.find(
                        (c) => c.label === selectedCategory,
                      )?.subcategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="job-type-category">職種（大分類）<RequiredMark /></FieldLabel>
                    <select
                      id="job-type-category"
                      value={selectedJobTypeCategory}
                      onChange={(e) => setSelectedJobTypeCategory(e.target.value)}
                      required
                      className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                    >
                      <option value="">選択してください</option>
                      {JOB_TYPE_CATEGORIES.map((cat) => (
                        <option key={cat.label} value={cat.label}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="job-type">職種（小分類）<RequiredMark /></FieldLabel>
                    <select
                      id="job-type"
                      name="jobType"
                      defaultValue={job?.jobType ?? ""}
                      disabled={!selectedJobTypeCategory}
                      required
                      className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all disabled:opacity-50"
                    >
                      <option value="">
                        {selectedJobTypeCategory ? "選択してください" : "先に大分類を選択"}
                      </option>
                      {JOB_TYPE_CATEGORIES.find(
                        (c) => c.label === selectedJobTypeCategory,
                      )?.subcategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="employment-type">雇用形態<RequiredMark /></FieldLabel>
                    <select
                      id="employment-type"
                      name="employmentType"
                      defaultValue={job?.employmentType ?? ""}
                      required
                      className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                    >
                      <option value="">選択してください</option>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="salary-range">給与<RequiredMark /></FieldLabel>
                    <select
                      id="salary-range"
                      name="salaryRange"
                      defaultValue={job?.salaryRange ?? ""}
                      required
                      className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                    >
                      <option value="">選択してください</option>
                      <option value="〜300万円">〜300万円</option>
                      <option value="300万〜400万円">300万〜400万円</option>
                      <option value="400万〜500万円">400万〜500万円</option>
                      <option value="500万〜600万円">500万〜600万円</option>
                      <option value="600万〜700万円">600万〜700万円</option>
                      <option value="700万〜800万円">700万〜800万円</option>
                      <option value="800万〜1000万円">800万〜1000万円</option>
                      <option value="1000万〜1500万円">1000万〜1500万円</option>
                      <option value="1500万円〜">1500万円〜</option>
                    </select>
                  </div>
                </div>

                <input
                  type="hidden"
                  name="workLocation"
                  value={selectedPrefecture && selectedCity ? `${selectedPrefecture} ${selectedCity}` : ""}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="work-prefecture">勤務地（都道府県）<RequiredMark /></FieldLabel>
                    <select
                      id="work-prefecture"
                      value={selectedPrefecture}
                      onChange={(e) => {
                        setSelectedPrefecture(e.target.value);
                        setSelectedCity("");
                      }}
                      required
                      className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                    >
                      <option value="">選択してください</option>
                      {PREFECTURES.map((pref) => (
                        <option key={pref.label} value={pref.label}>
                          {pref.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="work-city">勤務地（市区町村）<RequiredMark /></FieldLabel>
                    <select
                      id="work-city"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      disabled={!selectedPrefecture}
                      required
                      className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all disabled:opacity-50"
                    >
                      <option value="">
                        {selectedPrefecture ? "選択してください" : "先に都道府県を選択"}
                      </option>
                      {PREFECTURES.find(
                        (p) => p.label === selectedPrefecture,
                      )?.municipalities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel>対象卒業年度（複数選択可）<RequiredMark /></FieldLabel>
                  <div className="flex flex-wrap gap-3">
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(
                      (year) => (
                        <label key={year} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="targetGraduationYears"
                            value={year}
                            defaultChecked={job?.targetGraduationYears?.includes(year) ?? false}
                            className="w-4 h-4 rounded border-outline-variant text-primary-container focus:ring-primary-container"
                          />
                          <span className="text-sm font-medium text-on-surface">{year}卒</span>
                        </label>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 02: 仕事内容・魅力 */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg signature-gradient text-white text-xs font-bold">
                  02
                </span>
                <h2 className="text-lg font-bold text-primary-container">
                  仕事内容・魅力
                </h2>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="description">仕事内容<RequiredMark /></FieldLabel>
                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    maxLength={5000}
                    required
                    placeholder="具体的な仕事内容、プロジェクト概要などを記載してください"
                    defaultValue={job?.description ?? ""}
                    className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all resize-y placeholder:text-outline-variant"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="requirements">応募要件<RequiredMark /></FieldLabel>
                  <textarea
                    id="requirements"
                    name="requirements"
                    rows={4}
                    maxLength={5000}
                    required
                    placeholder="必須スキル、経験、資格などを記載してください"
                    defaultValue={job?.requirements ?? ""}
                    className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all resize-y placeholder:text-outline-variant"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="benefits">福利厚生・魅力<RequiredMark /></FieldLabel>
                  <textarea
                    id="benefits"
                    name="benefits"
                    rows={4}
                    maxLength={5000}
                    required
                    placeholder="福利厚生、社内制度、働く環境の魅力などを記載してください"
                    defaultValue={job?.benefits ?? ""}
                    className="w-full py-3 px-4 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all resize-y placeholder:text-outline-variant"
                  />
                </div>
              </div>
            </section>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (validateRequired()) setShowPreview(true);
              }}
              className="signature-gradient text-white text-sm font-bold px-8 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              内容を確認して公開
            </button>
            <button
              type="submit"
              name="action"
              value="draft"
              formNoValidate
              disabled={isPending}
              onClick={(e) => {
                if (!confirm("下書きとして保存しますか？")) e.preventDefault();
              }}
              className="bg-surface-container-low text-on-surface text-sm font-bold px-8 py-3 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              {isPending ? "処理中..." : "下書き保存"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// --- プレビューコンポーネント ---

function getFormValue(form: HTMLFormElement, name: string): string {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value;
  }
  return "";
}

function getCheckedValues(form: HTMLFormElement, name: string): string[] {
  const elements = form.elements.namedItem(name);
  if (elements instanceof RadioNodeList) {
    return Array.from(elements)
      .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && el.checked)
      .map((el) => el.value);
  }
  if (elements instanceof HTMLInputElement && elements.checked) {
    return [elements.value];
  }
  return [];
}

function JobPreview({
  formRef,
  imagePreview,
  hasExistingImage,
  isPending,
  onBack,
  validateRequired,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  imagePreview: string | null;
  hasExistingImage: boolean;
  isPending: boolean;
  onBack: () => void;
  validateRequired: () => boolean;
}) {
  const form = formRef.current;
  if (!form) return null;

  const title = getFormValue(form, "title");
  const jobType = getFormValue(form, "jobType");
  const jobCategory = getFormValue(form, "jobCategory");
  const employmentType = getFormValue(form, "employmentType");
  const salaryRange = getFormValue(form, "salaryRange");
  const workLocation = getFormValue(form, "workLocation");
  const description = getFormValue(form, "description");
  const requirements = getFormValue(form, "requirements");
  const benefits = getFormValue(form, "benefits");
  const graduationYears = getCheckedValues(form, "targetGraduationYears");

  const overviewRows: Array<{ icon: string; label: string; value: string }> = [];
  if (employmentType) overviewRows.push({ icon: "badge", label: "雇用形態", value: employmentType });
  if (jobCategory) overviewRows.push({ icon: "domain", label: "業種", value: jobCategory });
  if (jobType) overviewRows.push({ icon: "category", label: "職種", value: jobType });
  if (workLocation) overviewRows.push({ icon: "location_on", label: "勤務地", value: workLocation });
  if (salaryRange) overviewRows.push({ icon: "payments", label: "給与", value: salaryRange });
  if (graduationYears.length > 0) overviewRows.push({ icon: "school", label: "対象卒年", value: graduationYears.map((y) => `${y}年卒`).join("・") });

  return (
    <div className="space-y-6">
      {/* プレビューヘッダー */}
      <div className="bg-tertiary-container/10 border border-tertiary-container/30 rounded-xl p-4 flex items-center gap-3">
        <Icon name="visibility" className="text-xl text-tertiary-container" />
        <div>
          <p className="text-sm font-bold text-tertiary-container">プレビュー</p>
          <p className="text-xs text-outline">学生に表示されるイメージです。確認後「公開する」を押してください。</p>
        </div>
      </div>

      {/* トップ画像 */}
      {(imagePreview || hasExistingImage) && (
        <div className="rounded-xl overflow-hidden h-36 md:h-44 shadow-sm">
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="トップ画像" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-surface-container grid place-items-center">
              <div className="text-center">
                <Icon name="image" className="text-3xl text-outline mb-1" />
                <p className="text-xs text-outline">設定済みの画像</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* タイトル */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-primary-container leading-tight">
          {title || "（タイトル未入力）"}
        </h2>
      </div>

      {/* 求人概要カード */}
      {overviewRows.length > 0 && (
        <div className="bg-surface-container-lowest p-6 rounded-xl">
          <h5 className="text-[10px] font-bold text-outline tracking-[0.2em] mb-4">求人概要</h5>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {overviewRows.map((r) => (
              <div key={r.label} className="flex items-start gap-3">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-surface-container grid place-items-center text-primary-container">
                  <Icon name={r.icon} className="text-base" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-[10px] font-bold text-outline tracking-wider uppercase">{r.label}</dt>
                  <dd className="text-xs font-semibold text-on-surface mt-0.5 whitespace-pre-wrap break-words">{r.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* 募集ポジション・応募要件・福利厚生 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(title || description) && (
          <div className="bg-surface-container-lowest p-6 rounded-xl">
            <h5 className="text-[10px] font-bold text-outline tracking-[0.2em] mb-3">募集ポジション</h5>
            <p className="text-sm font-bold text-on-surface mb-1">{title}</p>
            {description && (
              <p className="text-xs text-outline leading-relaxed whitespace-pre-wrap">{description}</p>
            )}
          </div>
        )}
        {requirements && (
          <div className="bg-surface-container-lowest p-6 rounded-xl">
            <h5 className="text-[10px] font-bold text-outline tracking-[0.2em] mb-3">応募要件</h5>
            <p className="text-xs text-outline leading-relaxed whitespace-pre-wrap">{requirements}</p>
          </div>
        )}
        {benefits && (
          <div className="bg-surface-container-lowest p-6 rounded-xl">
            <h5 className="text-[10px] font-bold text-outline tracking-[0.2em] mb-3">福利厚生</h5>
            <ul className="space-y-2">
              {benefits.split("\n").filter(Boolean).map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-on-surface">
                  <Icon name="verified" className="text-base text-secondary shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          name="action"
          value="publish"
          disabled={isPending}
          onClick={(e) => {
            if (!validateRequired()) {
              e.preventDefault();
              return;
            }
            if (!confirm("この内容で求人を公開しますか？")) e.preventDefault();
          }}
          className="signature-gradient text-white text-sm font-bold px-8 py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "処理中..." : "公開する"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="bg-surface-container-low text-on-surface text-sm font-bold px-8 py-3 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50"
        >
          修正する
        </button>
      </div>
    </div>
  );
}
