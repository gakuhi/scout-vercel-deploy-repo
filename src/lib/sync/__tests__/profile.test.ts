import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateChecker } from "@/lib/sync/profile";
import { PRODUCTS, runBatch, updateProfile } from "@/lib/sync/profile";

// --- モック ---

vi.mock("@/lib/anthropic/client", () => ({
  getAnthropic: vi.fn(),
}));

vi.mock("@/lib/gemini/client", () => ({
  getGemini: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// --- モックヘルパー ---

class MockChecker implements UpdateChecker {
  constructor(private updates: Partial<Record<(typeof PRODUCTS)[number], boolean>> = {}) {}

  async check(product: (typeof PRODUCTS)[number], studentId: string): Promise<boolean> {
    void studentId;
    return this.updates[product] ?? false;
  }

  async hasUpdate(studentId: string): Promise<boolean> {
    void studentId;
    return PRODUCTS.some((p) => this.updates[p]);
  }
}

type MockSupabase = {
  from: ReturnType<typeof vi.fn>;
};

function makeMockSupabase(
  responses: Record<string, { data: unknown; error?: unknown }>,
): MockSupabase {
  return {
    from: vi.fn((table: string) => {
      const response = responses[table] ?? { data: null, error: null };
      const chain: Record<string, unknown> = {};
      const methods = ["select", "eq", "order", "limit", "upsert", "insert"];
      for (const m of methods) chain[m] = vi.fn(() => chain);
      chain.single = vi.fn(() => Promise.resolve(response));
      chain.maybeSingle = vi.fn(() => Promise.resolve(response));
      chain.then = (resolve: (value: unknown) => void) => resolve(response);
      return chain;
    }),
  };
}

function mockAnthropicText(text: string) {
  return {
    content: [{ type: "text", text }],
  };
}

const validProfileJson = JSON.stringify({
  summary: "IT業界志望の行動力のある学生",
  strengths: ["リーダーシップ", "課題解決力"],
  skills: ["チームマネジメント"],
  scores: {
    growth_stability: 78,
    specialist_generalist: 55,
    individual_team: 65,
    autonomy_guidance: 60,
    logical_thinking: 62,
    communication: 58,
    writing_skill: 64,
    leadership: 70,
    activity_volume: 40,
  },
  interested_industries: ["it_software"],
  interested_job_types: ["engineer_it"],
  score_confidence: 35,
});

function makeSmartesPerson() {
  return {
    smartes_motivations: {
      data: [{ generated_text: "IT業界で挑戦したい。", regenerated_count: 3 }],
    },
    smartes_gakuchika: {
      data: [
        { generated_text: "学生団体でリーダーを経験した。", regenerated_count: 2 },
      ],
    },
    smartes_es: {
      data: [{ generated_text: "私の強みは課題解決力です。", regenerated_count: 1 }],
    },
  };
}

function buildSmartesSupabase(person = makeSmartesPerson()) {
  return makeMockSupabase({
    student_product_links: {
      data: [{ product: "smartes", external_user_id: "ext-001" }],
    },
    synced_smartes_motivations: person.smartes_motivations,
    synced_smartes_gakuchika: person.smartes_gakuchika,
    synced_smartes_generated_es: person.smartes_es,
    student_integrated_profiles: { data: null },
  }) as unknown as import("@supabase/supabase-js").SupabaseClient;
}

const originalEnv = process.env.LLM_PROVIDER;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.LLM_PROVIDER;
});

afterEach(() => {
  if (originalEnv === undefined) delete process.env.LLM_PROVIDER;
  else process.env.LLM_PROVIDER = originalEnv;
});

// --- MockChecker ---

describe("MockChecker", () => {
  it("全プロダクトで更新なし → hasUpdate = false", async () => {
    const checker = new MockChecker({});
    expect(await checker.hasUpdate("s1")).toBe(false);
  });

  it("smartes のみ更新あり → hasUpdate = true", async () => {
    const checker = new MockChecker({ smartes: true });
    expect(await checker.hasUpdate("s1")).toBe(true);
  });

  it("check はプロダクト単位で判定", async () => {
    const checker = new MockChecker({ compai: true });
    expect(await checker.check("compai", "s1")).toBe(true);
    expect(await checker.check("smartes", "s1")).toBe(false);
  });
});

// --- updateProfile ---

describe("updateProfile", () => {
  const studentId = "11111111-1111-1111-1111-111111111111";

  it("更新なしの場合 skipped_no_update を返し LLM を呼ばない", async () => {
    const checker = new MockChecker({});
    const { getAnthropic } = await import("@/lib/anthropic/client");
    const mockCreate = vi.fn();
    vi.mocked(getAnthropic).mockReturnValue({ messages: { create: mockCreate } } as never);

    const supabase = makeMockSupabase({}) as unknown as import("@supabase/supabase-js").SupabaseClient;
    const result = await updateProfile(studentId, { checker, supabase });

    expect(result.status).toBe("skipped_no_update");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("force=true で更新チェックをスキップしデータ不足なら skipped_no_data を返す", async () => {
    const checker = new MockChecker({});
    const { getAnthropic } = await import("@/lib/anthropic/client");
    const mockCreate = vi.fn();
    vi.mocked(getAnthropic).mockReturnValue({ messages: { create: mockCreate } } as never);

    const supabase = makeMockSupabase({
      student_product_links: { data: [] },
    }) as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await updateProfile(studentId, { checker, supabase, force: true });
    expect(result.status).toBe("skipped_no_data");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("更新ありで意味のあるデータがある場合、LLM を呼び updated を返す", async () => {
    const checker = new MockChecker({ smartes: true });

    const { getAnthropic } = await import("@/lib/anthropic/client");
    const mockCreate = vi.fn().mockResolvedValue(mockAnthropicText(validProfileJson));
    vi.mocked(getAnthropic).mockReturnValue({ messages: { create: mockCreate } } as never);

    const supabase = buildSmartesSupabase();

    const result = await updateProfile(studentId, { checker, supabase });

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.profile.summary).toContain("IT業界志望");
    }
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(supabase.from).toHaveBeenCalledWith("student_integrated_profiles");
  });

  it("プロダクトリンクがないユーザーは skipped_no_data を返す", async () => {
    const checker = new MockChecker({ smartes: true });
    const { getAnthropic } = await import("@/lib/anthropic/client");
    const mockCreate = vi.fn();
    vi.mocked(getAnthropic).mockReturnValue({ messages: { create: mockCreate } } as never);

    const supabase = makeMockSupabase({
      student_product_links: { data: [] },
    }) as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await updateProfile(studentId, { checker, supabase });
    expect(result.status).toBe("skipped_no_data");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// --- Anthropic エラー経路 ---

describe("generateProfile (Anthropic) error paths", () => {
  const studentId = "11111111-1111-1111-1111-111111111111";

  it("stop_reason = refusal はエラーを投げる", async () => {
    const checker = new MockChecker({ smartes: true });
    const { getAnthropic } = await import("@/lib/anthropic/client");
    vi.mocked(getAnthropic).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({
          stop_reason: "refusal",
          content: [{ type: "text", text: "" }],
        }),
      },
    } as never);

    await expect(
      updateProfile(studentId, { checker, supabase: buildSmartesSupabase() }),
    ).rejects.toThrow(/安全上の理由/);
  });

  it("stop_reason = max_tokens はエラーを投げる", async () => {
    const checker = new MockChecker({ smartes: true });
    const { getAnthropic } = await import("@/lib/anthropic/client");
    vi.mocked(getAnthropic).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({
          stop_reason: "max_tokens",
          content: [{ type: "text", text: "{" }],
        }),
      },
    } as never);

    await expect(
      updateProfile(studentId, { checker, supabase: buildSmartesSupabase() }),
    ).rejects.toThrow(/max_tokens/);
  });

  it("不正な JSON は明示的なエラーメッセージでラップされる", async () => {
    const checker = new MockChecker({ smartes: true });
    const { getAnthropic } = await import("@/lib/anthropic/client");
    vi.mocked(getAnthropic).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue(mockAnthropicText("これは JSON ではない")),
      },
    } as never);

    await expect(
      updateProfile(studentId, { checker, supabase: buildSmartesSupabase() }),
    ).rejects.toThrow(/JSON パースに失敗/);
  });
});

// --- プロバイダ切替 ---

describe("LLM_PROVIDER dispatch", () => {
  const studentId = "11111111-1111-1111-1111-111111111111";

  it("LLM_PROVIDER=gemini で Gemini クライアントが呼ばれる", async () => {
    process.env.LLM_PROVIDER = "gemini";

    const checker = new MockChecker({ smartes: true });
    const { getAnthropic } = await import("@/lib/anthropic/client");
    const { getGemini } = await import("@/lib/gemini/client");
    const mockAnthropicCreate = vi.fn();
    vi.mocked(getAnthropic).mockReturnValue({ messages: { create: mockAnthropicCreate } } as never);
    const mockGeminiGenerate = vi.fn().mockResolvedValue({ text: validProfileJson });
    vi.mocked(getGemini).mockReturnValue({
      models: { generateContent: mockGeminiGenerate },
    } as never);

    const result = await updateProfile(studentId, { checker, supabase: buildSmartesSupabase() });

    expect(result.status).toBe("updated");
    expect(mockGeminiGenerate).toHaveBeenCalledOnce();
    expect(mockAnthropicCreate).not.toHaveBeenCalled();
  });

  it("LLM_PROVIDER が未知の値のときは明示的エラー", async () => {
    process.env.LLM_PROVIDER = "openai";

    const checker = new MockChecker({ smartes: true });
    const { getAnthropic } = await import("@/lib/anthropic/client");
    vi.mocked(getAnthropic).mockReturnValue({ messages: { create: vi.fn() } } as never);

    await expect(
      updateProfile(studentId, { checker, supabase: buildSmartesSupabase() }),
    ).rejects.toThrow(/未知の LLM_PROVIDER/);
  });
});

// --- マルチプロダクト連携 ---

describe("fetchUserData (multi-product)", () => {
  const studentId = "11111111-1111-1111-1111-111111111111";

  function setupAnthropicCapture() {
    const create = vi.fn().mockResolvedValue(mockAnthropicText(validProfileJson));
    return create;
  }

  async function mountAnthropic(create: ReturnType<typeof vi.fn>) {
    const { getAnthropic } = await import("@/lib/anthropic/client");
    vi.mocked(getAnthropic).mockReturnValue({ messages: { create } } as never);
  }

  function userPromptOf(create: ReturnType<typeof vi.fn>): string {
    const args = create.mock.calls[0]?.[0] as
      | { messages: { content: string }[] }
      | undefined;
    return args?.messages?.[0]?.content ?? "";
  }

  it("compai のみのユーザー: 企業分析AIセクションが LLM プロンプトに入り updated になる", async () => {
    const checker = new MockChecker({ compai: true });
    const create = setupAnthropicCapture();
    await mountAnthropic(create);

    const supabase = makeMockSupabase({
      student_product_links: {
        data: [{ product: "compai", external_user_id: "ext-c" }],
      },
      synced_compai_researches: {
        data: [
          { title: "メルカリ研究", content: "BizDev 募集要項", is_bookmarked: true },
          { title: "リクルート研究", content: null, is_bookmarked: false },
        ],
      },
      synced_compai_messages: {
        data: [{ content: "成長環境について教えて", sender_type: "user" }],
      },
      student_integrated_profiles: { data: null },
    }) as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await updateProfile(studentId, { checker, supabase });
    expect(result.status).toBe("updated");

    const prompt = userPromptOf(create);
    expect(prompt).toContain("企業分析AI");
    expect(prompt).toContain("メルカリ研究");
    expect(prompt).toContain("ブックマーク済み");
    expect(prompt).toContain("成長環境について教えて");
    // smartes 連携がないので smartes セクションは出ない
    expect(prompt).not.toContain("スマートES — ガクチカ");
  });

  it("interviewai のみのユーザー: 面接練習AIセクションが LLM プロンプトに入る", async () => {
    const checker = new MockChecker({ interviewai: true });
    const create = setupAnthropicCapture();
    await mountAnthropic(create);

    const supabase = makeMockSupabase({
      student_product_links: {
        data: [{ product: "interviewai", external_user_id: "ext-i" }],
      },
      synced_interviewai_sessions: {
        data: [
          {
            company_name: "サイバーエージェント",
            industry: "IT",
            overall_score: 78,
            skill_scores: { logical: 80 },
            strengths: ["論理性"],
            areas_for_improvement: ["話速"],
            growth_hint: "結論ファーストを意識",
          },
        ],
      },
      synced_interviewai_searches: {
        data: [{ company_name: "メルカリ" }, { company_name: "DeNA" }],
      },
      student_integrated_profiles: { data: null },
    }) as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await updateProfile(studentId, { checker, supabase });
    expect(result.status).toBe("updated");

    const prompt = userPromptOf(create);
    expect(prompt).toContain("面接練習AI");
    expect(prompt).toContain("サイバーエージェント");
    expect(prompt).toContain("総合スコア: 78");
    expect(prompt).toContain("結論ファーストを意識");
    expect(prompt).toContain("メルカリ");
    expect(prompt).toContain("DeNA");
  });

  it("sugoshu のみのユーザー: すごい就活セクションが LLM プロンプトに入る", async () => {
    const checker = new MockChecker({ sugoshu: true });
    const create = setupAnthropicCapture();
    await mountAnthropic(create);

    const supabase = makeMockSupabase({
      student_product_links: {
        data: [{ product: "sugoshu", external_user_id: "ext-s" }],
      },
      synced_sugoshu_diagnoses: {
        data: [{ diagnosis_data: { type: "リーダー型", score: 80 } }],
      },
      synced_sugoshu_resumes: {
        data: [{ content: "学生団体でリーダーを務めた経験があります。" }],
      },
      student_integrated_profiles: { data: null },
    }) as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await updateProfile(studentId, { checker, supabase });
    expect(result.status).toBe("updated");

    const prompt = userPromptOf(create);
    expect(prompt).toContain("すごい就活");
    expect(prompt).toContain("リーダー型");
    expect(prompt).toContain("学生団体でリーダーを務めた");
  });

  it("1 プロダクトのフェッチが例外でも他プロダクトのデータで updated になる", async () => {
    const checker = new MockChecker({ smartes: true, compai: true });
    const create = setupAnthropicCapture();
    await mountAnthropic(create);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // synced_compai_researches だけ from() 時点で例外を投げる supabase モック
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "synced_compai_researches") {
          throw new Error("simulated compai DB outage");
        }
        const responses: Record<string, { data: unknown }> = {
          student_product_links: {
            data: [
              { product: "smartes", external_user_id: "ext-sm" },
              { product: "compai", external_user_id: "ext-c" },
            ],
          },
          synced_smartes_motivations: {
            data: [{ generated_text: "IT業界で挑戦したい。", regenerated_count: 2 }],
          },
          synced_smartes_gakuchika: { data: [] },
          synced_smartes_generated_es: { data: [] },
          synced_compai_messages: { data: [] },
          student_integrated_profiles: { data: null },
        };
        const response = responses[table] ?? { data: null };
        const chain: Record<string, unknown> = {};
        const methods = ["select", "eq", "order", "limit", "upsert", "insert"];
        for (const m of methods) chain[m] = vi.fn(() => chain);
        chain.maybeSingle = vi.fn(() => Promise.resolve(response));
        chain.then = (resolve: (v: unknown) => void) => resolve(response);
        return chain;
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await updateProfile(studentId, { checker, supabase });
    expect(result.status).toBe("updated");

    // 失敗した compai は欠落しても smartes は LLM プロンプトに乗る
    const prompt = userPromptOf(create);
    expect(prompt).toContain("スマートES — 志望動機");
    // compai は失敗したのでセクションは出ない
    expect(prompt).not.toContain("企業分析AI — リサーチ");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("compai fetch failed"),
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("smartes が大量データでも 1 プロダクトあたりの上限で sugoshu セクションが残る", async () => {
    const checker = new MockChecker({ smartes: true, sugoshu: true });
    const create = setupAnthropicCapture();
    await mountAnthropic(create);

    // smartes: 各種 generated_text は formatter 側で 400-500 字に slice されるので、
    //          1 件あたり 500 字相当 × 25 件 ≒ 12500 字 → 7500 字でカットされる前提を作る
    const longText = "あ".repeat(2000);
    const supabase = makeMockSupabase({
      student_product_links: {
        data: [
          { product: "smartes", external_user_id: "ext-sm" },
          { product: "sugoshu", external_user_id: "ext-su" },
        ],
      },
      synced_smartes_motivations: {
        data: Array.from({ length: 10 }, () => ({
          generated_text: longText,
          regenerated_count: 1,
        })),
      },
      synced_smartes_gakuchika: {
        data: Array.from({ length: 5 }, () => ({
          generated_text: longText,
          regenerated_count: 1,
        })),
      },
      synced_smartes_generated_es: {
        data: Array.from({ length: 10 }, () => ({
          generated_text: longText,
          regenerated_count: 1,
        })),
      },
      synced_sugoshu_diagnoses: {
        data: [{ diagnosis_data: { type: "リーダー型" } }],
      },
      synced_sugoshu_resumes: {
        data: [{ content: "学生団体での活動内容" }],
      },
      student_integrated_profiles: { data: null },
    }) as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await updateProfile(studentId, { checker, supabase });
    expect(result.status).toBe("updated");

    const prompt = userPromptOf(create);
    // smartes セクションは存在するが上限で打ち切られている
    expect(prompt).toContain("スマートES");
    expect(prompt).toContain("...（省略）");
    // 重要: 末尾切り捨ての旧実装では消えていた sugoshu が今回は残る
    expect(prompt).toContain("すごい就活 — 自己診断");
    expect(prompt).toContain("リーダー型");
    expect(prompt).toContain("学生団体での活動内容");
  });

  it("compai のみのユーザーで researches/messages が空配列なら skipped_no_data", async () => {
    const checker = new MockChecker({ compai: true });
    const create = setupAnthropicCapture();
    await mountAnthropic(create);

    const supabase = makeMockSupabase({
      student_product_links: {
        data: [{ product: "compai", external_user_id: "ext-c" }],
      },
      synced_compai_researches: { data: [] },
      synced_compai_messages: { data: [] },
      student_integrated_profiles: { data: null },
    }) as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await updateProfile(studentId, { checker, supabase });
    expect(result.status).toBe("skipped_no_data");
    expect(create).not.toHaveBeenCalled();
  });
});

// --- runBatch ---

describe("runBatch", () => {
  it("更新あり/データ不足/更新なしの学生を正しく分類する", async () => {
    const students = [
      { id: "s-updated-1" },
      { id: "s-updated-2" },
      { id: "s-no-data" },
      { id: "s-no-update" },
    ];

    const checker: UpdateChecker = {
      check: vi.fn(async () => false),
      hasUpdate: vi.fn(async (id: string) => id !== "s-no-update"),
    };

    const { getAnthropic } = await import("@/lib/anthropic/client");
    vi.mocked(getAnthropic).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue(mockAnthropicText(validProfileJson)),
      },
    } as never);

    // 学生ごとに挙動を変える supabase モック
    const supabase = {
      from: vi.fn((table: string) => {
        const chain: Record<string, unknown> = {};
        const methods = ["select", "eq", "order", "limit", "upsert", "insert"];
        for (const m of methods) chain[m] = vi.fn(() => chain);
        chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null }));
        chain.single = vi.fn(() => Promise.resolve({ data: null }));
        // from("students") は全学生を返す
        if (table === "students") {
          chain.then = (resolve: (v: unknown) => void) => resolve({ data: students });
          return chain;
        }
        // from("student_product_links") は学生 ID で分岐できないので eq() で追跡
        const eqTracker: { studentId?: string } = {};
        chain.eq = vi.fn((_col: string, value: unknown) => {
          if (typeof value === "string" && value.startsWith("s-")) eqTracker.studentId = value;
          return chain;
        });
        chain.then = (resolve: (v: unknown) => void) => {
          if (table === "student_product_links") {
            // s-no-data はリンクなし、それ以外は smartes リンクあり
            if (eqTracker.studentId === "s-no-data") return resolve({ data: [] });
            return resolve({ data: [{ product: "smartes", external_user_id: "ext-001" }] });
          }
          if (
            table === "synced_smartes_motivations" ||
            table === "synced_smartes_gakuchika" ||
            table === "synced_smartes_generated_es"
          ) {
            return resolve({
              data: [{ generated_text: "サンプルテキスト", regenerated_count: 1 }],
            });
          }
          return resolve({ data: null });
        };
        return chain;
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const stats = await runBatch({ checker, supabase });

    expect(stats.processed).toBe(2); // s-updated-1, s-updated-2
    expect(stats.skippedNoData).toBe(1); // s-no-data
    expect(stats.skippedNoUpdate).toBe(1); // s-no-update
    expect(stats.errors).toBe(0);
  });

  it("LLM 例外は errors にカウントし他の学生は処理続行", async () => {
    const checker: UpdateChecker = {
      check: vi.fn(async () => true),
      hasUpdate: vi.fn(async () => true),
    };

    const { getAnthropic } = await import("@/lib/anthropic/client");
    let call = 0;
    vi.mocked(getAnthropic).mockReturnValue({
      messages: {
        create: vi.fn().mockImplementation(async () => {
          call++;
          if (call === 1) throw new Error("simulated LLM failure");
          return mockAnthropicText(validProfileJson);
        }),
      },
    } as never);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const supabase = makeMockSupabase({
      students: { data: [{ id: "s1" }, { id: "s2" }] },
      student_product_links: {
        data: [{ product: "smartes", external_user_id: "ext" }],
      },
      synced_smartes_motivations: {
        data: [{ generated_text: "テスト", regenerated_count: 0 }],
      },
      synced_smartes_gakuchika: {
        data: [{ generated_text: "テスト", regenerated_count: 0 }],
      },
      synced_smartes_generated_es: {
        data: [{ generated_text: "テスト", regenerated_count: 0 }],
      },
      student_integrated_profiles: { data: null },
    }) as unknown as import("@supabase/supabase-js").SupabaseClient;

    const stats = await runBatch({ checker, supabase });

    expect(stats.errors).toBe(1);
    expect(stats.processed).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/profile sync failed for student=s1/),
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
