import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * マイグレーション SQL 群を静的にスキャンして、連携テーブルの RLS が
 * 想定どおり設定されていることを検証する。
 *
 * これは running な Supabase を用意しない sanity check。真の RLS テストは
 * 実 DB に対する e2e で検証する必要がある（本ファイルでは扱わない）。
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function readAllMigrations(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf-8"))
    .join("\n\n");
}

describe("synced_* / student_product_links の RLS migration sanity", () => {
  const sql = readAllMigrations();

  describe("student_product_links", () => {
    it("ENABLE ROW LEVEL SECURITY されている", () => {
      expect(sql).toMatch(
        /ALTER TABLE student_product_links ENABLE ROW LEVEL SECURITY/,
      );
    });

    it("自分のリンクのみ SELECT 可能な policy がある", () => {
      // student_product_links_select という policy 名で auth.uid() = student_id を条件としている
      expect(sql).toMatch(/CREATE POLICY student_product_links_select/);
      // USING 節に auth.uid() = student_id が含まれる
      expect(sql).toMatch(
        /CREATE POLICY student_product_links_select[\s\S]+auth\.uid\(\) = student_id/,
      );
    });
  });

  describe("synced_*_users は RLS 有効 + policy で絞られる", () => {
    const tables = [
      "synced_interviewai_users",
      "synced_compai_users",
      "synced_smartes_users",
      "synced_sugoshu_users",
    ];

    for (const table of tables) {
      it(`${table} に ENABLE ROW LEVEL SECURITY がある`, () => {
        const re = new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
        expect(sql).toMatch(re);
      });

      it(`${table} の学生 SELECT policy が student_product_links 経由で絞られている`, () => {
        // 自分のリンクに紐づく external_user_id のみ SELECT 可能
        const re = new RegExp(
          `CREATE POLICY ${table}_select_student[\\s\\S]+student_product_links[\\s\\S]+auth\\.uid\\(\\)`,
        );
        expect(sql).toMatch(re);
      });
    }

    // 新しい migration 群（interviewai / compai / sugoshu）は defense in depth として
    // REVOKE ALL ON ... FROM anon も実施している。smartes は先行 migration の時点では
    // 明示的な REVOKE が無く、RLS enabled のみで防御している。
    it("interviewai / compai / sugoshu の users テーブルは anon に REVOKE されている", () => {
      for (const table of [
        "synced_interviewai_users",
        "synced_compai_users",
        "synced_sugoshu_users",
      ]) {
        const re = new RegExp(`REVOKE ALL ON ${table} FROM anon`);
        expect(sql).toMatch(re);
      }
    });
  });

  describe("synced_* 詳細テーブル: 各プロダクト代表テーブルの RLS", () => {
    const tables = [
      { table: "synced_interviewai_sessions", product: "interviewai" },
      { table: "synced_interviewai_searches", product: "interviewai" },
      { table: "synced_compai_researches", product: "compai" },
      { table: "synced_compai_messages", product: "compai" },
      { table: "synced_smartes_motivations", product: "smartes" },
      { table: "synced_smartes_gakuchika", product: "smartes" },
      { table: "synced_smartes_generated_es", product: "smartes" },
      { table: "synced_sugoshu_resumes", product: "sugoshu" },
      { table: "synced_sugoshu_diagnoses", product: "sugoshu" },
    ];

    for (const { table } of tables) {
      it(`${table} に ENABLE ROW LEVEL SECURITY がある`, () => {
        const re = new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
        expect(sql).toMatch(re);
      });

      it(`${table} の学生 SELECT policy が定義されている`, () => {
        const re = new RegExp(`CREATE POLICY ${table}_select_student`);
        expect(sql).toMatch(re);
      });
    }
  });

  describe("synced_* 詳細テーブル: UNIQUE 制約（UPSERT の onConflict 用）", () => {
    // PR #192 で追加したもの。sync の UPSERT が通る前提
    it("synced_interviewai_sessions.external_session_id に UNIQUE", () => {
      expect(sql).toMatch(
        /synced_interviewai_sessions[\s\S]+UNIQUE\s*\(\s*external_session_id\s*\)/,
      );
    });
    it("synced_interviewai_searches.external_search_id に UNIQUE", () => {
      expect(sql).toMatch(
        /synced_interviewai_searches[\s\S]+UNIQUE\s*\(\s*external_search_id\s*\)/,
      );
    });
    it("synced_compai_researches.external_research_id に UNIQUE", () => {
      expect(sql).toMatch(
        /synced_compai_researches[\s\S]+UNIQUE\s*\(\s*external_research_id\s*\)/,
      );
    });
    it("synced_compai_messages.external_message_id に UNIQUE", () => {
      expect(sql).toMatch(
        /synced_compai_messages[\s\S]+UNIQUE\s*\(\s*external_message_id\s*\)/,
      );
    });
    it("synced_sugoshu_resumes.external_resume_id に UNIQUE", () => {
      expect(sql).toMatch(
        /synced_sugoshu_resumes[\s\S]+UNIQUE\s*\(\s*external_resume_id\s*\)/,
      );
    });
    it("synced_sugoshu_diagnoses.external_diagnosis_id に UNIQUE", () => {
      expect(sql).toMatch(
        /synced_sugoshu_diagnoses[\s\S]+UNIQUE\s*\(\s*external_diagnosis_id\s*\)/,
      );
    });
  });

  describe("synced_*_users.email の nullable 化（PR #189 と整合）", () => {
    it("email に DROP NOT NULL を適用する migration が存在する", () => {
      expect(sql).toMatch(
        /ALTER TABLE synced_interviewai_users\s+ALTER COLUMN email DROP NOT NULL/,
      );
      expect(sql).toMatch(
        /ALTER TABLE synced_compai_users\s+ALTER COLUMN email DROP NOT NULL/,
      );
      expect(sql).toMatch(
        /ALTER TABLE synced_smartes_users\s+ALTER COLUMN email DROP NOT NULL/,
      );
      expect(sql).toMatch(
        /ALTER TABLE synced_sugoshu_users\s+ALTER COLUMN email DROP NOT NULL/,
      );
    });
  });
});
