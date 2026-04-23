import { describe, it, expect } from "vitest";
import {
  buildResumeContent,
  toIsoOrNull,
  type BubbleResumeDraft,
} from "../sugoshu";

function makeDraft(overrides: Partial<BubbleResumeDraft> = {}): BubbleResumeDraft {
  return {
    _id: "resume-1",
    ...overrides,
  };
}

describe("lib/sync/sugoshu", () => {
  describe("buildResumeContent", () => {
    it("全フィールドが埋まっていればラベル付きで連結する", () => {
      const d = makeDraft({
        self_pr: "私は粘り強い性格です",
        motivation: "御社のビジョンに共感しました",
        hobby_skill: "バスケ",
        personal_request: "リモート希望",
      });
      expect(buildResumeContent(d)).toBe(
        [
          "【自己PR】\n私は粘り強い性格です",
          "【志望動機】\n御社のビジョンに共感しました",
          "【趣味・特技】\nバスケ",
          "【その他要望】\nリモート希望",
        ].join("\n\n"),
      );
    });

    it("一部のフィールドだけ埋まっている場合は存在する分だけ含める", () => {
      const d = makeDraft({ self_pr: "自己PR のみ" });
      expect(buildResumeContent(d)).toBe("【自己PR】\n自己PR のみ");
    });

    it("全フィールドが空 / undefined の場合は null を返す", () => {
      expect(buildResumeContent(makeDraft())).toBeNull();
    });

    it("空文字のフィールド（空白のみを含む）は無視する", () => {
      const d = makeDraft({
        self_pr: "   ",
        motivation: "\n\n",
        hobby_skill: "",
      });
      expect(buildResumeContent(d)).toBeNull();
    });

    it("前後の空白は trim される", () => {
      const d = makeDraft({ self_pr: "  本文  " });
      expect(buildResumeContent(d)).toBe("【自己PR】\n本文");
    });
  });

  describe("toIsoOrNull", () => {
    it("有効な ISO 文字列は正規化した ISO 文字列を返す", () => {
      expect(toIsoOrNull("2026-04-22T05:15:56.000Z")).toBe(
        "2026-04-22T05:15:56.000Z",
      );
    });

    it("有効な datetime 文字列（非 ISO）も ISO に変換する", () => {
      // Bubble が Date 文字列を返すときの代表フォーマット
      const result = toIsoOrNull("2026-04-22T05:15:56Z");
      expect(result).toMatch(/^2026-04-22T05:15:56(?:\.\d+)?Z$/);
    });

    it("文字列でない値は null", () => {
      expect(toIsoOrNull(null)).toBeNull();
      expect(toIsoOrNull(undefined)).toBeNull();
      expect(toIsoOrNull(123)).toBeNull();
      expect(toIsoOrNull(new Date())).toBeNull(); // Date インスタンスは受け付けない仕様
    });

    it("不正な日付文字列は null", () => {
      expect(toIsoOrNull("not-a-date")).toBeNull();
      expect(toIsoOrNull("")).toBeNull();
    });
  });
});
