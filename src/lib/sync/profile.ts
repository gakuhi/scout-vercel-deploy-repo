import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic } from "@/lib/anthropic/client";
import { getGemini } from "@/lib/gemini/client";
import { createAdminClient } from "@/lib/supabase/admin";

export type Product = "smartes" | "compai" | "interviewai" | "sugoshu";
export const PRODUCTS: Product[] = ["smartes", "compai", "interviewai", "sugoshu"];

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = "gemini-2.5-flash";
// JSON schema 強制で構造化出力する一発出し用。thinking は使わないので
// 生成本体だけで余裕を持たせる量として 8K を割り当てる
// （16K 未満に抑えることで非ストリーミングの HTTP タイムアウトを回避）
const MAX_TOKENS = 8192;

// 設計書 03-02-matching-design.md の enum と一致させる
export const INDUSTRY_CATEGORIES = [
  "it_software",
  "consulting",
  "finance",
  "trading_company",
  "manufacturing",
  "advertising_media",
  "retail_service",
  "real_estate",
  "infrastructure",
  "public_sector",
  "other",
] as const;
export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];

export const JOB_CATEGORIES = [
  "engineer_it",
  "engineer_other",
  "designer",
  "sales",
  "marketing",
  "planning",
  "corporate",
  "consultant",
  "research",
  "other",
] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

export type ProfileScores = {
  growth_stability: number;
  specialist_generalist: number;
  individual_team: number;
  autonomy_guidance: number;
  logical_thinking: number;
  communication: number;
  writing_skill: number;
  leadership: number | null;
  activity_volume: number;
};

export type IntegratedProfile = {
  summary: string;
  strengths: string[];
  skills: string[];
  scores: ProfileScores;
  interested_industries: IndustryCategory[];
  interested_job_types: JobCategory[];
  score_confidence: number;
};

// --- 更新チェッカー（モック可能なインターフェース） ---

export interface UpdateChecker {
  check(product: Product, studentId: string): Promise<boolean>;
  hasUpdate(studentId: string): Promise<boolean>;
}

// 各プロダクトの synced_* テーブル一覧。getLastSyncedAt と fetchUserData が共有する。
const SYNCED_TABLES_BY_PRODUCT: Record<Product, readonly string[]> = {
  smartes: [
    "synced_smartes_motivations",
    "synced_smartes_gakuchika",
    "synced_smartes_generated_es",
  ],
  compai: ["synced_compai_messages", "synced_compai_researches"],
  interviewai: ["synced_interviewai_sessions", "synced_interviewai_searches"],
  sugoshu: ["synced_sugoshu_diagnoses", "synced_sugoshu_resumes"],
};

/**
 * synced_* テーブルの synced_at と student_integrated_profiles.generated_at を比較し
 * 更新の有無を判定する実装。
 */
export class DbUpdateChecker implements UpdateChecker {
  constructor(private supabase: SupabaseClient) {}

  async check(product: Product, studentId: string): Promise<boolean> {
    const lastGeneratedAt = await this.getLastGeneratedAt(studentId);
    const externalUserId = await this.getExternalUserId(product, studentId);
    if (!externalUserId) return false;

    const lastSyncedAt = await this.getLastSyncedAt(product, externalUserId);
    if (!lastSyncedAt) return false;

    if (!lastGeneratedAt) return true;
    return new Date(lastSyncedAt) > new Date(lastGeneratedAt);
  }

  async hasUpdate(studentId: string): Promise<boolean> {
    for (const product of PRODUCTS) {
      if (await this.check(product, studentId)) return true;
    }
    return false;
  }

  private async getLastGeneratedAt(studentId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from("student_integrated_profiles")
      .select("generated_at")
      .eq("student_id", studentId)
      .maybeSingle();
    return (data as { generated_at: string | null } | null)?.generated_at ?? null;
  }

  private async getExternalUserId(product: Product, studentId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from("student_product_links")
      .select("external_user_id")
      .eq("student_id", studentId)
      .eq("product", product)
      .maybeSingle();
    return (data as { external_user_id: string | null } | null)?.external_user_id ?? null;
  }

  private async getLastSyncedAt(product: Product, externalUserId: string): Promise<string | null> {
    const tables = SYNCED_TABLES_BY_PRODUCT[product];
    let latest: string | null = null;
    for (const table of tables) {
      const { data } = await this.supabase
        .from(table)
        .select("synced_at")
        .eq("external_user_id", externalUserId)
        .order("synced_at", { ascending: false })
        .limit(1);
      const row = (data as { synced_at: string | null }[] | null)?.[0];
      if (row?.synced_at && (!latest || row.synced_at > latest)) {
        latest = row.synced_at;
      }
    }
    return latest;
  }
}

// --- データ収集 ---

type SmartesData = {
  motivations: { generated_text: string; regenerated_count: number }[];
  gakuchika: { generated_text: string; regenerated_count: number }[];
  generated_es: { generated_text: string; regenerated_count: number }[];
};

async function fetchSmartesData(
  supabase: SupabaseClient,
  externalUserId: string,
): Promise<SmartesData> {
  const [motivations, gakuchika, generatedEs] = await Promise.all([
    supabase
      .from("synced_smartes_motivations")
      .select("generated_text, regenerated_count")
      .eq("external_user_id", externalUserId)
      .limit(10),
    supabase
      .from("synced_smartes_gakuchika")
      .select("generated_text, regenerated_count")
      .eq("external_user_id", externalUserId)
      .limit(5),
    supabase
      .from("synced_smartes_generated_es")
      .select("generated_text, regenerated_count")
      .eq("external_user_id", externalUserId)
      .limit(10),
  ]);
  return {
    motivations: (motivations.data ?? []) as SmartesData["motivations"],
    gakuchika: (gakuchika.data ?? []) as SmartesData["gakuchika"],
    generated_es: (generatedEs.data ?? []) as SmartesData["generated_es"],
  };
}

type CompaiResearch = {
  title: string | null;
  content: string | null;
  is_bookmarked: boolean | null;
};
type CompaiMessage = {
  content: string | null;
  sender_type: string | null;
};
type CompaiData = {
  researches: CompaiResearch[];
  messages: CompaiMessage[];
};

async function fetchCompaiData(
  supabase: SupabaseClient,
  externalUserId: string,
): Promise<CompaiData> {
  const [researches, messages] = await Promise.all([
    supabase
      .from("synced_compai_researches")
      .select("title, content, is_bookmarked")
      .eq("external_user_id", externalUserId)
      .order("original_created_at", { ascending: false })
      .limit(20),
    supabase
      .from("synced_compai_messages")
      .select("content, sender_type")
      .eq("external_user_id", externalUserId)
      .order("original_created_at", { ascending: false })
      .limit(40),
  ]);
  return {
    researches: (researches.data ?? []) as CompaiResearch[],
    messages: (messages.data ?? []) as CompaiMessage[],
  };
}

type InterviewaiSession = {
  company_name: string | null;
  industry: string | null;
  overall_score: number | null;
  skill_scores: unknown;
  strengths: unknown;
  areas_for_improvement: unknown;
  growth_hint: string | null;
};
type InterviewaiSearch = { company_name: string | null };
type InterviewaiData = {
  sessions: InterviewaiSession[];
  searches: InterviewaiSearch[];
};

async function fetchInterviewaiData(
  supabase: SupabaseClient,
  externalUserId: string,
): Promise<InterviewaiData> {
  const [sessions, searches] = await Promise.all([
    supabase
      .from("synced_interviewai_sessions")
      .select(
        "company_name, industry, overall_score, skill_scores, strengths, areas_for_improvement, growth_hint",
      )
      .eq("external_user_id", externalUserId)
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("synced_interviewai_searches")
      .select("company_name")
      .eq("external_user_id", externalUserId)
      .order("searched_at", { ascending: false })
      .limit(50),
  ]);
  return {
    sessions: (sessions.data ?? []) as InterviewaiSession[],
    searches: (searches.data ?? []) as InterviewaiSearch[],
  };
}

type SugoshuDiagnosis = { diagnosis_data: unknown };
type SugoshuResume = { content: string | null };
type SugoshuData = {
  diagnoses: SugoshuDiagnosis[];
  resumes: SugoshuResume[];
};

async function fetchSugoshuData(
  supabase: SupabaseClient,
  externalUserId: string,
): Promise<SugoshuData> {
  const [diagnoses, resumes] = await Promise.all([
    supabase
      .from("synced_sugoshu_diagnoses")
      .select("diagnosis_data")
      .eq("external_user_id", externalUserId)
      .order("original_created_at", { ascending: false })
      .limit(5),
    supabase
      .from("synced_sugoshu_resumes")
      .select("content")
      .eq("external_user_id", externalUserId)
      .order("original_created_at", { ascending: false })
      .limit(5),
  ]);
  return {
    diagnoses: (diagnoses.data ?? []) as SugoshuDiagnosis[],
    resumes: (resumes.data ?? []) as SugoshuResume[],
  };
}

type UserData = {
  studentId: string;
  sources: Product[];
  smartes?: SmartesData;
  compai?: CompaiData;
  interviewai?: InterviewaiData;
  sugoshu?: SugoshuData;
};

async function fetchUserData(supabase: SupabaseClient, studentId: string): Promise<UserData> {
  const { data: links } = await supabase
    .from("student_product_links")
    .select("product, external_user_id")
    .eq("student_id", studentId);

  const linksTyped = (links ?? []) as { product: Product; external_user_id: string }[];
  const sources = linksTyped.map((l) => l.product);
  const data: UserData = { studentId, sources };

  const linkOf = (p: Product) => linksTyped.find((l) => l.product === p);

  // 1 プロダクトの DB 失敗で他プロダクトのデータまで失わないよう、各フェッチを個別に try/catch する
  const safeFetch = async <T>(
    product: Product,
    run: () => Promise<T>,
  ): Promise<T | undefined> => {
    try {
      return await run();
    } catch (err) {
      console.error(
        `[fetchUserData] ${product} fetch failed for student=${studentId}:`,
        err,
      );
      return undefined;
    }
  };

  // 4 プロダクト分のフェッチを並列化（リンクが無いプロダクトはスキップ）
  await Promise.all([
    (async () => {
      const link = linkOf("smartes");
      if (link)
        data.smartes = await safeFetch("smartes", () =>
          fetchSmartesData(supabase, link.external_user_id),
        );
    })(),
    (async () => {
      const link = linkOf("compai");
      if (link)
        data.compai = await safeFetch("compai", () =>
          fetchCompaiData(supabase, link.external_user_id),
        );
    })(),
    (async () => {
      const link = linkOf("interviewai");
      if (link)
        data.interviewai = await safeFetch("interviewai", () =>
          fetchInterviewaiData(supabase, link.external_user_id),
        );
    })(),
    (async () => {
      const link = linkOf("sugoshu");
      if (link)
        data.sugoshu = await safeFetch("sugoshu", () =>
          fetchSugoshuData(supabase, link.external_user_id),
        );
    })(),
  ]);
  return data;
}

function hasMeaningfulData(data: UserData): boolean {
  const smartesText = data.smartes
    ? [
        ...data.smartes.motivations,
        ...data.smartes.gakuchika,
        ...data.smartes.generated_es,
      ].some((item) => item.generated_text?.trim().length)
    : false;

  const compaiText = data.compai
    ? data.compai.researches.some((r) => r.title?.trim() || r.content?.trim()) ||
      data.compai.messages.some((m) => m.content?.trim())
    : false;

  const interviewaiText = data.interviewai
    ? data.interviewai.sessions.length > 0 ||
      data.interviewai.searches.some((s) => s.company_name?.trim())
    : false;

  const sugoshuText = data.sugoshu
    ? data.sugoshu.diagnoses.some((d) => d.diagnosis_data) ||
      data.sugoshu.resumes.some((r) => r.content?.trim())
    : false;

  return smartesText || compaiText || interviewaiText || sugoshuText;
}

// 1 プロダクトあたりの最大文字数。4 プロダクト全部活発な学生でも sugoshu が末尾切り捨ての
// 巻き添えにならないよう、プロダクトごとに公平な予算を割り当てる。
const MAX_CHARS_PER_PRODUCT = 7500;

function trimToLimit(text: string, limit: number): string {
  return text.length > limit ? text.slice(0, limit) + "\n...（省略）" : text;
}

function formatSmartesSection(d: SmartesData): string {
  const { motivations, gakuchika, generated_es } = d;
  const parts: string[] = [];

  if (gakuchika.length > 0) {
    parts.push(`\n## スマートES — ガクチカデータ（${gakuchika.length}件）`);
    gakuchika.slice(0, 5).forEach((g, i) => {
      if (!g.generated_text?.trim()) return;
      parts.push(`\n### ガクチカ ${i + 1}（推敲回数: ${g.regenerated_count}）`);
      parts.push(g.generated_text.slice(0, 500));
    });
  }

  if (motivations.length > 0) {
    parts.push(`\n## スマートES — 志望動機データ（${motivations.length}件）`);
    motivations.slice(0, 10).forEach((m, i) => {
      if (!m.generated_text?.trim()) return;
      parts.push(`\n### 志望動機 ${i + 1}（推敲回数: ${m.regenerated_count}）`);
      parts.push(m.generated_text.slice(0, 400));
    });
  }

  if (generated_es.length > 0) {
    parts.push(`\n## スマートES — ES回答データ（${generated_es.length}件）`);
    generated_es.slice(0, 10).forEach((e, i) => {
      if (!e.generated_text?.trim()) return;
      parts.push(`\n### ES回答 ${i + 1}（推敲回数: ${e.regenerated_count}）`);
      parts.push(e.generated_text.slice(0, 400));
    });
  }

  return trimToLimit(parts.join("\n"), MAX_CHARS_PER_PRODUCT);
}

function formatCompaiSection(d: CompaiData): string {
  const { researches, messages } = d;
  const parts: string[] = [];

  if (researches.length > 0) {
    // ブックマークは強い興味シグナルなので分けて出す
    const bookmarked = researches.filter((r) => r.is_bookmarked);
    const others = researches.filter((r) => !r.is_bookmarked);

    parts.push(`\n## 企業分析AI — リサーチ（全${researches.length}件）`);
    if (bookmarked.length > 0) {
      parts.push(`### ブックマーク済み（${bookmarked.length}件 / 強い興味シグナル）`);
      bookmarked.slice(0, 10).forEach((r, i) => {
        parts.push(`- ${i + 1}. ${r.title?.trim() || "(無題)"}`);
        if (r.content?.trim()) parts.push(`  ${r.content.slice(0, 200)}`);
      });
    }
    if (others.length > 0) {
      parts.push(`### その他のリサーチ（最新${Math.min(others.length, 10)}件）`);
      others.slice(0, 10).forEach((r, i) => {
        parts.push(`- ${i + 1}. ${r.title?.trim() || "(無題)"}`);
      });
    }
  }

  if (messages.length > 0) {
    parts.push(
      `\n## 企業分析AI — 会話ログ（最新${Math.min(messages.length, 20)}件）`,
    );
    messages.slice(0, 20).forEach((m, i) => {
      if (!m.content?.trim()) return;
      const role = m.sender_type ?? "?";
      parts.push(`- [${role}] ${i + 1}: ${m.content.slice(0, 200)}`);
    });
  }

  return trimToLimit(parts.join("\n"), MAX_CHARS_PER_PRODUCT);
}

function formatInterviewaiSection(d: InterviewaiData): string {
  const { sessions, searches } = d;
  const parts: string[] = [];

  if (sessions.length > 0) {
    parts.push(`\n## 面接練習AI — セッション（${sessions.length}件）`);
    sessions.slice(0, 5).forEach((s, i) => {
      const head = `${s.company_name?.trim() || "(企業名なし)"} / 業界: ${s.industry?.trim() || "?"}`;
      parts.push(`\n### セッション ${i + 1}: ${head}`);
      if (s.overall_score != null) parts.push(`- 総合スコア: ${s.overall_score}`);
      if (s.skill_scores)
        parts.push(
          `- スキルスコア: ${JSON.stringify(s.skill_scores).slice(0, 400)}`,
        );
      if (s.strengths)
        parts.push(`- 強み: ${JSON.stringify(s.strengths).slice(0, 300)}`);
      if (s.areas_for_improvement)
        parts.push(
          `- 改善点: ${JSON.stringify(s.areas_for_improvement).slice(0, 300)}`,
        );
      if (s.growth_hint?.trim())
        parts.push(`- アドバイス: ${s.growth_hint.slice(0, 300)}`);
    });
  }

  if (searches.length > 0) {
    const companies = Array.from(
      new Set(searches.map((s) => s.company_name?.trim()).filter(Boolean)),
    );
    if (companies.length > 0) {
      parts.push(
        `\n## 面接練習AI — 検索企業（${companies.length}社、興味業界の手がかり）`,
      );
      parts.push(companies.slice(0, 30).join(", "));
    }
  }

  return trimToLimit(parts.join("\n"), MAX_CHARS_PER_PRODUCT);
}

function formatSugoshuSection(d: SugoshuData): string {
  const { diagnoses, resumes } = d;
  const parts: string[] = [];

  if (diagnoses.length > 0) {
    parts.push(`\n## すごい就活 — 自己診断（${diagnoses.length}件）`);
    diagnoses.slice(0, 3).forEach((diag, i) => {
      if (!diag.diagnosis_data) return;
      parts.push(`\n### 診断 ${i + 1}`);
      parts.push(JSON.stringify(diag.diagnosis_data).slice(0, 800));
    });
  }

  if (resumes.length > 0) {
    parts.push(`\n## すごい就活 — 履歴書（${resumes.length}件）`);
    resumes.slice(0, 3).forEach((r, i) => {
      if (!r.content?.trim()) return;
      parts.push(`\n### 履歴書 ${i + 1}`);
      parts.push(r.content.slice(0, 600));
    });
  }

  return trimToLimit(parts.join("\n"), MAX_CHARS_PER_PRODUCT);
}

function formatUserData(data: UserData): string {
  const sections: string[] = [];
  sections.push(`## 基本情報`);
  sections.push(`- 利用プロダクト: ${data.sources.join(", ") || "不明"}`);

  if (data.smartes) sections.push(formatSmartesSection(data.smartes));
  if (data.compai) sections.push(formatCompaiSection(data.compai));
  if (data.interviewai) sections.push(formatInterviewaiSection(data.interviewai));
  if (data.sugoshu) sections.push(formatSugoshuSection(data.sugoshu));

  return sections.join("\n");
}

// --- Claude API ---

const SYSTEM_PROMPT = `あなたは就活学生の行動データを分析し、統合プロフィールを生成するAIです。
設計書 03-02-matching-design.md のスコアリング基準に厳密に従い、JSON形式で出力してください。

## 出力フィールド

### summary（TEXT）
2-3文で学生の人物像を要約する。

### strengths（array<string>）
行動データから読み取れる強み・特性（3-5 個）。

### skills（array<string>）
ESやガクチカから読み取れるスキル・経験（3-5 個）。

### scores（object）

#### A. 志向・価値観スコア（スペクトラム型：0と100の両端に意味がある）
- growth_stability: 0=安定・待遇重視 ↔ 100=成長・挑戦重視
  - 企業分析での質問傾向（給与/福利厚生が多い→低い、成長/裁量が多い→高い）、志望動機の内容から判断
- specialist_generalist: 0=ゼネラリスト志向 ↔ 100=スペシャリスト志向
  - 志望職種の一貫性、スキルの集中度から判断
- individual_team: 0=個人で成果を出す ↔ 100=チームで成果を出す
  - ガクチカのエピソード（個人活動 vs チーム活動）から判断
- autonomy_guidance: 0=手厚い指導を求める ↔ 100=裁量を求める
  - 面接回答、企業研究の質問パターンから判断

#### B. 能力スコア（絶対スケール型：0-100、高いほど能力が高い）
- logical_thinking: 面接AIのlogicalStructureスコアがあればそれを基準に。なければ会話・文章から推定
- communication: 面接AIのqaSkill + 会話ログの質から推定
- writing_skill: スマートESのガクチカ・志望動機・ES回答の文章品質から 0-100 で評価。推敲回数が多いほど本気度が高い
- leadership: ガクチカ等からリーダーシップ経験を評価。経験が読み取れない場合は null

#### C. 活動量スコア（相対スケール型：0-100）
- activity_volume: 利用プロダクト数・セッション数・リサーチ数・ES作成数・メッセージ数から相対評価
  - 1プロダクトで数件 → 10-30
  - 1プロダクトで多数 → 30-50
  - 2プロダクトで活発 → 50-70
  - 3プロダクト以上で非常に活発 → 70-100

### D. 興味タグ
- interested_industries: 行動データから推定した興味業界。関心度順に最大5つ。
  使用可能な値: ${JSON.stringify(INDUSTRY_CATEGORIES)}
- interested_job_types: 行動データから推定した興味職種。
  使用可能な値: ${JSON.stringify(JOB_CATEGORIES)}

### score_confidence（0-100）
元データの充実度を示す信頼度。
- 1 プロダクトのみ・データ少 → 20-30
- 1 プロダクトでデータ豊富 → 30-40
- 2 プロダクト利用 → 40-60
- 3 プロダクト以上 → 60-80
- 4 プロダクト全て + データ豊富 → 80-100

## 重要事項
- データが不足している場合でも、利用可能なデータから最善の推定を行うこと
- leadership スコアはリーダーシップ経験が読み取れない場合のみ null にする
- interested_industries は最大 5 つ、関心度の高い順に並べる
- すべてのスコアは 0-100 の整数値で出力する
- 推敲回数が多い文章は本気度の高さを示唆する`;

const profileSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    skills: { type: "array", items: { type: "string" } },
    scores: {
      type: "object",
      properties: {
        growth_stability: { type: "integer", minimum: 0, maximum: 100 },
        specialist_generalist: { type: "integer", minimum: 0, maximum: 100 },
        individual_team: { type: "integer", minimum: 0, maximum: 100 },
        autonomy_guidance: { type: "integer", minimum: 0, maximum: 100 },
        logical_thinking: { type: "integer", minimum: 0, maximum: 100 },
        communication: { type: "integer", minimum: 0, maximum: 100 },
        writing_skill: { type: "integer", minimum: 0, maximum: 100 },
        leadership: { type: ["integer", "null"], minimum: 0, maximum: 100 },
        activity_volume: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: [
        "growth_stability",
        "specialist_generalist",
        "individual_team",
        "autonomy_guidance",
        "logical_thinking",
        "communication",
        "writing_skill",
        "leadership",
        "activity_volume",
      ],
      additionalProperties: false,
    },
    interested_industries: {
      type: "array",
      items: { type: "string", enum: INDUSTRY_CATEGORIES as unknown as string[] },
      maxItems: 5,
    },
    interested_job_types: {
      type: "array",
      items: { type: "string", enum: JOB_CATEGORIES as unknown as string[] },
    },
    score_confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: [
    "summary",
    "strengths",
    "skills",
    "scores",
    "interested_industries",
    "interested_job_types",
    "score_confidence",
  ],
  additionalProperties: false,
} as const;

/**
 * Anthropic JSON Schema (`type: ["integer", "null"]`) を Gemini が解釈できる
 * `{ type: "integer", nullable: true }` に変換し、Gemini が無視する `additionalProperties` を除去する。
 */
function adaptSchemaForGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(adaptSchemaForGemini);
  if (!schema || typeof schema !== "object") return schema;
  const obj = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "additionalProperties") continue;
    if (key === "type" && Array.isArray(value)) {
      const types = value.filter((t) => t !== "null");
      out.type = types.length === 1 ? types[0] : types;
      if (value.includes("null")) out.nullable = true;
      continue;
    }
    out[key] = adaptSchemaForGemini(value);
  }
  return out;
}

async function generateProfileWithAnthropic(data: UserData): Promise<IntegratedProfile> {
  const client = getAnthropic();
  const userData = formatUserData(data);

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    // JSON schema 強制で構造化出力するため thinking は使わず一発出し
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    output_config: {
      format: { type: "json_schema", schema: profileSchema },
    },
    messages: [
      {
        role: "user",
        content: `以下の学生の行動データを分析し、統合プロフィールを生成してください。\n\n${userData}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude が安全上の理由で応答を拒否しました");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error(`Claude の出力が max_tokens (${MAX_TOKENS}) で打ち切られました`);
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude からテキスト応答が得られませんでした");
  }

  try {
    return JSON.parse(textBlock.text) as IntegratedProfile;
  } catch (error) {
    const snippet = textBlock.text.slice(0, 200);
    throw new Error(
      `Claude 応答の JSON パースに失敗しました: ${error instanceof Error ? error.message : String(error)}。先頭200文字: ${snippet}`,
    );
  }
}

async function generateProfileWithGemini(data: UserData): Promise<IntegratedProfile> {
  const client = getGemini();
  const userData = formatUserData(data);

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: `以下の学生の行動データを分析し、統合プロフィールを生成してください。\n\n${userData}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: adaptSchemaForGemini(profileSchema),
      maxOutputTokens: MAX_TOKENS,
      // Gemini 2.5 Flash の thinking を無効化して max_tokens を生成本体に全振り
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini からテキスト応答が得られませんでした");
  }

  try {
    return JSON.parse(text) as IntegratedProfile;
  } catch (error) {
    const snippet = text.slice(0, 200);
    throw new Error(
      `Gemini 応答の JSON パースに失敗しました: ${error instanceof Error ? error.message : String(error)}。先頭200文字: ${snippet}`,
    );
  }
}

type LlmProvider = "anthropic" | "gemini";

function resolveProvider(): LlmProvider {
  const raw = process.env.LLM_PROVIDER ?? "anthropic";
  if (raw !== "anthropic" && raw !== "gemini") {
    throw new Error(`未知の LLM_PROVIDER: ${raw}（"anthropic" または "gemini" を指定）`);
  }
  return raw;
}

export async function generateProfile(data: UserData): Promise<IntegratedProfile> {
  const provider = resolveProvider();
  return provider === "gemini"
    ? generateProfileWithGemini(data)
    : generateProfileWithAnthropic(data);
}

function modelVersionInUse(): string {
  const provider = resolveProvider();
  return provider === "gemini" ? `gemini/${GEMINI_MODEL}` : `anthropic/${ANTHROPIC_MODEL}`;
}

// --- 保存 ---

async function saveProfile(
  supabase: SupabaseClient,
  studentId: string,
  profile: IntegratedProfile,
): Promise<void> {
  const { error } = await supabase.from("student_integrated_profiles").upsert(
    {
      student_id: studentId,
      summary: profile.summary,
      strengths: profile.strengths,
      skills: profile.skills,
      growth_stability_score: profile.scores.growth_stability,
      specialist_generalist_score: profile.scores.specialist_generalist,
      individual_team_score: profile.scores.individual_team,
      autonomy_guidance_score: profile.scores.autonomy_guidance,
      logical_thinking_score: profile.scores.logical_thinking,
      communication_score: profile.scores.communication,
      writing_skill_score: profile.scores.writing_skill,
      leadership_score: profile.scores.leadership,
      activity_volume_score: profile.scores.activity_volume,
      interested_industries: profile.interested_industries,
      interested_job_types: profile.interested_job_types,
      score_confidence: profile.score_confidence,
      generated_at: new Date().toISOString(),
      model_version: modelVersionInUse(),
    },
    { onConflict: "student_id" },
  );
  if (error) throw error;
}

// --- メイン関数: f(user_id) ---

export type UpdateProfileOptions = {
  checker?: UpdateChecker;
  supabase?: SupabaseClient;
  force?: boolean;
};

/**
 * updateProfile の結果。null 1 つでは「更新不要」と「データ不足」が区別できないため
 * 判別可能な union で返し、runBatch が統計に分類できるようにする。
 */
export type UpdateProfileResult =
  | { status: "updated"; profile: IntegratedProfile }
  | { status: "skipped_no_update" }
  | { status: "skipped_no_data" };

export async function updateProfile(
  studentId: string,
  opts: UpdateProfileOptions = {},
): Promise<UpdateProfileResult> {
  const supabase = opts.supabase ?? createAdminClient();
  const checker = opts.checker ?? new DbUpdateChecker(supabase);

  if (!opts.force && !(await checker.hasUpdate(studentId))) {
    return { status: "skipped_no_update" };
  }

  const data = await fetchUserData(supabase, studentId);
  if (!hasMeaningfulData(data)) {
    return { status: "skipped_no_data" };
  }

  const profile = await generateProfile(data);
  await saveProfile(supabase, studentId, profile);
  return { status: "updated", profile };
}

// --- バッチ実行 ---

// 連続呼び出しでレート制限に引っかかりにくくするための、リクエスト間の最小待ち時間。
// Claude API の RPM 上限はティアによって変動するので、保守的な値を採用しつつ
// 環境変数で上書きできるようにしておく。0 を指定すれば無効化できる。
const DEFAULT_BATCH_REQUEST_INTERVAL_MS = 500;

function resolveBatchRequestIntervalMs(): number {
  const raw = process.env.PROFILE_BATCH_REQUEST_INTERVAL_MS;
  if (!raw) return DEFAULT_BATCH_REQUEST_INTERVAL_MS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return DEFAULT_BATCH_REQUEST_INTERVAL_MS;
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BatchStats = {
  processed: number;
  skippedNoUpdate: number;
  skippedNoData: number;
  errors: number;
  // 失敗した学生 ID。再実行用にログだけでなく構造化して返す
  // （/api/sync/profile 呼び出し元が ID を絞って再走できるようにするため）。
  failedStudentIds: string[];
};

export type RunBatchOptions = UpdateProfileOptions & {
  // テスト用フック。本番では未指定のままで OK。
  sleepMs?: number;
};

export async function runBatch(opts: RunBatchOptions = {}): Promise<BatchStats> {
  const supabase = opts.supabase ?? createAdminClient();
  const checker = opts.checker ?? new DbUpdateChecker(supabase);
  const intervalMs = opts.sleepMs ?? resolveBatchRequestIntervalMs();

  const { data: students } = await supabase.from("students").select("id");
  const stats: BatchStats = {
    processed: 0,
    skippedNoUpdate: 0,
    skippedNoData: 0,
    errors: 0,
    failedStudentIds: [],
  };

  const list = (students ?? []) as { id: string }[];
  for (let i = 0; i < list.length; i++) {
    const student = list[i];
    try {
      const result = await updateProfile(student.id, { checker, supabase });
      if (result.status === "updated") stats.processed++;
      else if (result.status === "skipped_no_data") stats.skippedNoData++;
      else stats.skippedNoUpdate++;
    } catch (err) {
      // cron 経由で全件失敗しても調査できるよう、最低限の情報を stderr に残す
      console.error(`[runBatch] profile sync failed for student=${student.id}:`, err);
      stats.errors++;
      stats.failedStudentIds.push(student.id);
    }
    // 最終要素の後ろではスリープしない（戻り値の遅延を避ける）
    if (intervalMs > 0 && i < list.length - 1) {
      await sleep(intervalMs);
    }
  }
  return stats;
}
