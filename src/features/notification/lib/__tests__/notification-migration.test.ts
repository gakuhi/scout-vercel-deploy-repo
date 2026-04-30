import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * 通知基盤のマイグレーション / RLS の静的サニティチェック。
 *
 * 実 DB に対する e2e 検証は supabase/tests/rls_tests.sql で行う（セクション 7・13）。
 * ここはマイグレ SQL の内容を静的スキャンして、今後の変更で必要な定義が
 * 壊されないことを保証する。
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

describe("通知基盤 migration sanity", () => {
  const sql = readAllMigrations();

  describe("RLS（INSERT / UPDATE 制御）", () => {
    it("notifications テーブルに RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER TABLE notifications ENABLE ROW LEVEL SECURITY/,
      );
    });

    it("notifications_select は user_id = auth.uid() で絞られる", () => {
      expect(sql).toMatch(
        /CREATE POLICY notifications_select[\s\S]+user_id = auth\.uid\(\)/,
      );
    });

    it("notifications の UPDATE は is_read / read_at のみ GRANT されている", () => {
      expect(sql).toMatch(/REVOKE UPDATE ON notifications FROM authenticated/);
      expect(sql).toMatch(
        /GRANT UPDATE \(is_read, read_at\) ON notifications TO authenticated/,
      );
    });

    it("notifications に INSERT policy が無い（Service Role 限定）", () => {
      // \b で単語境界を置き、student_notification_settings 等を誤マッチしない。
      // 同一文中（セミコロンまで）に "ON notifications" と "FOR INSERT" がこの順で含まれるか検査。
      expect(sql).not.toMatch(
        /ON\s+notifications\b[^;]*?\bFOR\s+INSERT\b/,
      );
    });

    it("student_notification_settings / company_notification_settings に RLS が有効", () => {
      expect(sql).toMatch(
        /ALTER TABLE student_notification_settings ENABLE ROW LEVEL SECURITY/,
      );
      expect(sql).toMatch(
        /ALTER TABLE company_notification_settings ENABLE ROW LEVEL SECURITY/,
      );
    });
  });

});
