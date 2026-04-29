"use client";

import React, { useActionState, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { Tag } from "@/components/ui/tag";
import {
  ACADEMIC_TYPE_LABELS,
  ACADEMIC_TYPES,
  ORIENTATION_SCORES,
  ABILITY_SCORES,
} from "@/features/company/app/students/schemas";
import { industryLabels } from "@/shared/constants/industries";
import type { IndustryCategory } from "@/shared/constants/industries";
import {
  saveSearchAction,
  deleteSavedSearchAction,
  getStudentDetailAction,
} from "@/features/company/app/students/actions";
import { StudentDetailDrawer } from "./student-detail-drawer";
import type { SearchActionState } from "@/features/company/app/students/actions";
import type {
  StudentResult,
  SavedSearch,
} from "@/features/company/app/students/queries";
import type { ProfileMock } from "@/features/student/profile/mock";

type StudentSearchViewProps = {
  action: (
    prev: SearchActionState,
    formData: FormData,
  ) => Promise<SearchActionState>;
  savedSearches: SavedSearch[];
};

type ScoreFilterState = {
  enabled: boolean;
  value: number;
};

type FilterFormState = {
  graduationYear: string;
  academicTypes: string[];
  // 志向スコア（希望値）
  wantGrowthStability: ScoreFilterState;
  wantSpecialistGeneralist: ScoreFilterState;
  wantIndividualTeam: ScoreFilterState;
  wantAutonomyGuidance: ScoreFilterState;
  // 能力スコア（最低値）
  minLogicalThinking: ScoreFilterState;
  minCommunication: ScoreFilterState;
  minWritingSkill: ScoreFilterState;
  minLeadership: ScoreFilterState;
  minActivityVolume: ScoreFilterState;
};

const SCORE_KEYS = [
  "wantGrowthStability",
  "wantSpecialistGeneralist",
  "wantIndividualTeam",
  "wantAutonomyGuidance",
  "minLogicalThinking",
  "minCommunication",
  "minWritingSkill",
  "minLeadership",
  "minActivityVolume",
] as const;

const defaultFilters: FilterFormState = {
  graduationYear: "",
  academicTypes: [],
  wantGrowthStability: { enabled: false, value: 50 },
  wantSpecialistGeneralist: { enabled: false, value: 50 },
  wantIndividualTeam: { enabled: false, value: 50 },
  wantAutonomyGuidance: { enabled: false, value: 50 },
  minLogicalThinking: { enabled: false, value: 0 },
  minCommunication: { enabled: false, value: 0 },
  minWritingSkill: { enabled: false, value: 0 },
  minLeadership: { enabled: false, value: 0 },
  minActivityVolume: { enabled: false, value: 0 },
};

const initialState: SearchActionState = {};

export function StudentSearchView({
  action,
  savedSearches,
}: StudentSearchViewProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterFormState>(defaultFilters);
  const formRef = React.useRef<HTMLFormElement>(null);

  // ドロワー
  const [drawerStudent, setDrawerStudent] = useState<ProfileMock | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [drawerError, setDrawerError] = useState<string | null>(null);

  async function handleStudentClick(studentId: string) {
    setDrawerLoading(true);
    setDrawerStudent(null);
    setDrawerError(null);
    const result = await getStudentDetailAction(studentId);
    setDrawerLoading(false);
    if (result.data) {
      setDrawerStudent(result.data);
    } else if (result.error) {
      setDrawerError(result.error);
    }
  }

  const handleDrawerClose = React.useCallback(() => {
    setDrawerStudent(null);
    setDrawerLoading(false);
    setDrawerError(null);
  }, []);

  function updateScoreFilter(
    key: (typeof SCORE_KEYS)[number],
    update: Partial<ScoreFilterState>,
  ) {
    setFilters((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...update },
    }));
  }

  async function handleSaveSearch() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const raw: Record<string, unknown> = {};
    for (const [key, value] of fd.entries()) {
      const existing = raw[key];
      if (existing !== undefined) {
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          raw[key] = [existing, value];
        }
      } else {
        raw[key] = value;
      }
    }

    const name = prompt("検索条件の名前を入力してください");
    if (!name?.trim()) return;

    const saveFd = new FormData();
    saveFd.set("searchName", name.trim());
    // スコアフィルタの enabled 状態も保存
    const filtersToSave = { ...raw, _scoreState: {} as Record<string, ScoreFilterState> };
    for (const key of SCORE_KEYS) {
      filtersToSave._scoreState[key] = filters[key];
    }
    saveFd.set("filtersJson", JSON.stringify(filtersToSave));
    const result = await saveSearchAction({}, saveFd);
    if (result.error) {
      setSaveError(result.error);
    } else {
      setSaveError(null);
    }
  }

  async function handleDeleteSearch(id: string, searchName: string) {
    if (!confirm(`「${searchName}」を削除しますか？`)) return;
    const result = await deleteSavedSearchAction(id);
    if (result.error) setSaveError(result.error);
  }

  function handleLoadSearch(savedFilters: Record<string, unknown>) {
    const scoreState = (savedFilters._scoreState ?? {}) as Record<
      string,
      ScoreFilterState
    >;

    const newFilters: FilterFormState = { ...defaultFilters };

    // 基本条件
    if (typeof savedFilters.graduationYear === "string") {
      newFilters.graduationYear = savedFilters.graduationYear;
    }
    if (Array.isArray(savedFilters.academicTypes)) {
      newFilters.academicTypes = savedFilters.academicTypes as string[];
    } else if (typeof savedFilters.academicTypes === "string") {
      newFilters.academicTypes = [savedFilters.academicTypes];
    }

    // スコアフィルタ
    for (const key of SCORE_KEYS) {
      if (scoreState[key]) {
        newFilters[key] = scoreState[key];
      }
    }

    setFilters(newFilters);
  }

  return (
    <div>
      <div className="mb-10">
        <span className="text-[10px] font-bold text-tertiary-container uppercase tracking-[0.2em] mb-3 block">
          Student Matching
        </span>
        <h1 className="text-5xl font-extrabold text-primary-container leading-none tracking-tight">
          学生検索
        </h1>
        <p className="text-outline mt-4 font-medium">
          条件を設定して、マッチする学生を検索しましょう。
        </p>
      </div>

      {state.error && (
        <div className="mb-8 bg-error-container text-on-error-container p-4 rounded-lg text-sm font-semibold">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* フィルタパネル */}
        <div className="lg:col-span-1 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {/* 保存済み検索条件 */}
          {savedSearches.length > 0 && (
            <div className="mb-6 bg-surface-container-lowest rounded-xl p-6 space-y-3">
              <h2 className="text-sm font-bold text-primary-container flex items-center gap-2">
                <Icon name="bookmarks" className="text-lg" />
                保存済み条件
              </h2>
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => handleLoadSearch(search.filters)}
                    className="flex-1 text-left text-sm font-medium text-outline hover:text-primary-container hover:bg-surface-container-low px-2 py-1.5 rounded-md transition-all truncate"
                  >
                    {search.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSearch(search.id, search.name)}
                    className="p-1 text-outline hover:text-error transition-colors shrink-0"
                  >
                    <Icon name="close" className="text-sm" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form ref={formRef} action={formAction} className="space-y-6">
            {/* 基本条件 */}
            <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-primary-container flex items-center gap-2">
                <Icon name="filter_alt" className="text-lg" />
                基本条件
              </h2>

              {/* 卒業年度 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block">
                  卒業年度
                </label>
                <select
                  name="graduationYear"
                  value={filters.graduationYear}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      graduationYear: e.target.value,
                    }))
                  }
                  className="w-full py-2.5 px-3 bg-surface-container-low soft-border rounded text-sm font-medium focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                >
                  <option value="">指定なし</option>
                  {Array.from(
                    { length: 7 },
                    (_, i) => new Date().getFullYear() + i,
                  ).map((year) => (
                    <option key={year} value={year}>
                      {year}年卒
                    </option>
                  ))}
                </select>
              </div>

              {/* 文理区分 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-outline uppercase tracking-wider block">
                  文理区分
                </label>
                <div className="space-y-1">
                  {ACADEMIC_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="academicTypes"
                        value={type}
                        checked={filters.academicTypes.includes(type)}
                        onChange={(e) => {
                          setFilters((prev) => ({
                            ...prev,
                            academicTypes: e.target.checked
                              ? [...prev.academicTypes, type]
                              : prev.academicTypes.filter((t) => t !== type),
                          }));
                        }}
                        className="rounded text-primary-container focus:ring-primary-container"
                      />
                      {ACADEMIC_TYPE_LABELS[type]}
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* 志向・価値観スコア */}
            <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-primary-container flex items-center gap-2">
                <Icon name="psychology" className="text-lg" />
                志向・価値観
              </h2>
              <p className="text-xs text-outline">
                求める学生の志向を指定してください。近い学生が優先表示されます。
              </p>
              {ORIENTATION_SCORES.map((score) => {
                const key =
                  `want${score.key.charAt(0).toUpperCase() + score.key.slice(1)}` as (typeof SCORE_KEYS)[number];
                return (
                  <ScoreFilter
                    key={key}
                    name={key}
                    label={score.label}
                    lowLabel={score.lowLabel}
                    highLabel={score.highLabel}
                    enabled={filters[key].enabled}
                    value={filters[key].value}
                    onToggle={(enabled) =>
                      updateScoreFilter(key, { enabled })
                    }
                    onValueChange={(value) =>
                      updateScoreFilter(key, { value })
                    }
                  />
                );
              })}
            </div>

            {/* 能力スコア */}
            <div className="bg-surface-container-lowest rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-primary-container flex items-center gap-2">
                <Icon name="trending_up" className="text-lg" />
                能力スコア
              </h2>
              <p className="text-xs text-outline">
                各能力の最低スコアを指定できます（0〜100）
              </p>
              {ABILITY_SCORES.map((score) => {
                const key =
                  `min${score.key.charAt(0).toUpperCase() + score.key.slice(1)}` as (typeof SCORE_KEYS)[number];
                return (
                  <ScoreFilter
                    key={key}
                    name={key}
                    label={score.label}
                    enabled={filters[key].enabled}
                    value={filters[key].value}
                    onToggle={(enabled) =>
                      updateScoreFilter(key, { enabled })
                    }
                    onValueChange={(value) =>
                      updateScoreFilter(key, { value })
                    }
                  />
                );
              })}
              <ScoreFilter
                name="minActivityVolume"
                label="活動量"
                enabled={filters.minActivityVolume.enabled}
                value={filters.minActivityVolume.value}
                onToggle={(enabled) =>
                  updateScoreFilter("minActivityVolume", { enabled })
                }
                onValueChange={(value) =>
                  updateScoreFilter("minActivityVolume", { value })
                }
              />
            </div>

            <button
              type="button"
              onClick={handleSaveSearch}
              className="w-full bg-surface-container-low text-on-surface text-sm font-bold py-2.5 rounded-lg hover:bg-surface-container-high transition-colors"
            >
              <span className="flex items-center justify-center gap-2">
                <Icon name="bookmark_add" className="text-lg" />
                この条件を保存
              </span>
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="w-full signature-gradient text-white text-sm font-bold py-3 rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon
                    name="progress_activity"
                    className="animate-spin text-lg"
                  />
                  検索中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="search" className="text-lg" />
                  検索する
                </span>
              )}
            </button>
          </form>

          {saveError && (
            <div className="mt-4 bg-error-container text-on-error-container p-3 rounded-lg text-xs font-semibold">
              {saveError}
            </div>
          )}
        </div>

        {/* 検索結果 */}
        <div className="lg:col-span-2">
          {!state.searched ? (
            <div className="text-center py-20">
              <Icon
                name="person_search"
                className="text-outline-variant text-6xl mb-4"
              />
              <p className="text-outline font-medium text-lg mb-2">
                条件を設定して検索してください
              </p>
              <p className="text-outline-variant text-sm">
                左のフィルタで条件を絞り込み、「検索する」ボタンを押してください
              </p>
            </div>
          ) : state.results && state.results.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-bold text-primary-container">
                  {state.results.length}件の学生が見つかりました
                </p>
              </div>
              <div className="space-y-4">
                {state.results.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    onClick={() => handleStudentClick(student.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <Icon
                name="search_off"
                className="text-outline-variant text-6xl mb-4"
              />
              <p className="text-outline font-medium text-lg mb-2">
                条件に一致する学生が見つかりませんでした
              </p>
              <p className="text-outline-variant text-sm">
                条件を変更して再度検索してください
              </p>
            </div>
          )}
        </div>
      </div>

      {drawerError && (
        <div className="fixed bottom-6 right-6 z-50 bg-error-container text-on-error-container px-4 py-3 rounded-lg shadow-lg text-sm font-semibold">
          {drawerError}
        </div>
      )}

      <StudentDetailDrawer
        student={drawerStudent}
        isLoading={drawerLoading}
        onClose={handleDrawerClose}
      />
    </div>
  );
}

function ScoreFilter({
  name,
  label,
  lowLabel,
  highLabel,
  enabled,
  value,
  onToggle,
  onValueChange,
}: {
  name: string;
  label: string;
  lowLabel?: string;
  highLabel?: string;
  enabled: boolean;
  value: number;
  onToggle: (enabled: boolean) => void;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="rounded text-primary-container focus:ring-primary-container"
          />
          {label}
        </label>
        {enabled && (
          <span className="text-xs font-bold text-primary-container">
            {value}
          </span>
        )}
      </div>
      {enabled && (
        <>
          {(lowLabel || highLabel) && (
            <div className="flex justify-between text-[10px] text-outline">
              <span>{lowLabel ?? "0"}</span>
              <span>{highLabel ?? "100"}</span>
            </div>
          )}
          <input
            type="range"
            name={name}
            min={0}
            max={100}
            value={value}
            onChange={(e) => onValueChange(Number(e.target.value))}
            className="w-full accent-primary-container"
          />
        </>
      )}
    </div>
  );
}

function StudentCard({
  student,
  onClick,
}: {
  student: StudentResult;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-surface-container-lowest rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-surface-container-high grid place-items-center shrink-0">
          {student.profileImageUrl ? (
            <Image
              src={student.profileImageUrl}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <Icon name="person" className="text-outline text-2xl" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {student.university && (
              <span className="text-base font-bold text-primary-container">
                {student.university}
              </span>
            )}
            {student.faculty && (
              <span className="text-sm text-outline">{student.faculty}</span>
            )}
            {student.graduationYear && (
              <Tag variant="secondary">{student.graduationYear}年卒</Tag>
            )}
            {student.academicType && (
              <Tag variant="neutral">
                {ACADEMIC_TYPE_LABELS[
                  student.academicType as keyof typeof ACADEMIC_TYPE_LABELS
                ] ?? student.academicType}
              </Tag>
            )}
          </div>

          {/* スコアバー */}
          {student.scoreConfidence !== null && (
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 mb-3 text-xs">
              {student.logicalThinkingScore !== null && (
                <ScoreBar
                  label="論理思考"
                  value={student.logicalThinkingScore}
                />
              )}
              {student.communicationScore !== null && (
                <ScoreBar
                  label="コミュ力"
                  value={student.communicationScore}
                />
              )}
              {student.writingSkillScore !== null && (
                <ScoreBar
                  label="文章力"
                  value={student.writingSkillScore}
                />
              )}
              {student.leadershipScore !== null && (
                <ScoreBar
                  label="リーダー"
                  value={student.leadershipScore}
                />
              )}
              {student.activityVolumeScore !== null && (
                <ScoreBar
                  label="活動量"
                  value={student.activityVolumeScore}
                />
              )}
              {student.growthStabilityScore !== null && (
                <ScoreBar
                  label="成長志向"
                  value={student.growthStabilityScore}
                />
              )}
            </div>
          )}

          {/* メタ情報 */}
          <div className="flex items-center gap-4 text-xs text-outline flex-wrap">
            {student.prefecture && (
              <span className="flex items-center gap-1">
                <Icon name="location_on" className="text-sm" />
                {student.prefecture}
              </span>
            )}
            {student.interestedIndustries &&
              student.interestedIndustries.length > 0 && (
                <span className="flex items-center gap-1">
                  <Icon name="business" className="text-sm" />
                  {student.interestedIndustries
                    .slice(0, 3)
                    .map(
                      (i) => industryLabels[i as IndustryCategory] ?? i,
                    )
                    .join("・")}
                </span>
              )}
          </div>

        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-outline w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-container rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-on-surface font-semibold w-6 text-right">
        {value}
      </span>
    </div>
  );
}
