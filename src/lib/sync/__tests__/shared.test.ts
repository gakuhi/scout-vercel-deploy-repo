import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isValidCronRequest,
  requireCronAuth,
  runSyncUser,
  type SyncUserResult,
} from "../shared";
import * as smartesMod from "../smartes";
import * as interviewaiMod from "../interviewai";
import * as compaiMod from "../compai";
import * as sugoshuMod from "../sugoshu";

// runSyncUser は shared.ts 内で dynamic import するが、vi.mock はモジュール解決層で
// 適用されるため動的 import でも同じモックが返る。各プロダクトの syncUser を丸ごと差し替える。
vi.mock("../smartes", () => ({ syncUser: vi.fn() }));
vi.mock("../interviewai", () => ({ syncUser: vi.fn() }));
vi.mock("../compai", () => ({ syncUser: vi.fn() }));
vi.mock("../sugoshu", () => ({ syncUser: vi.fn() }));

function buildResult(
  product: SyncUserResult["product"],
  externalUserId: string,
): SyncUserResult {
  return {
    product,
    externalUserId,
    ok: true,
    upserted: {},
    errors: [],
  };
}

describe("lib/sync/shared", () => {
  describe("isValidCronRequest", () => {
    beforeEach(() => {
      vi.stubEnv("CRON_SECRET", "correct-secret");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("正しい Bearer トークンで true を返す", () => {
      const headers = new Headers({
        authorization: "Bearer correct-secret",
      });
      expect(isValidCronRequest(headers)).toBe(true);
    });

    it("Authorization ヘッダがない場合 false", () => {
      const headers = new Headers();
      expect(isValidCronRequest(headers)).toBe(false);
    });

    it("Bearer 以外のスキームだと false", () => {
      const headers = new Headers({
        authorization: "Basic correct-secret",
      });
      expect(isValidCronRequest(headers)).toBe(false);
    });

    it("Bearer だが secret が一致しないと false", () => {
      const headers = new Headers({
        authorization: "Bearer wrong-secret",
      });
      expect(isValidCronRequest(headers)).toBe(false);
    });

    it("CRON_SECRET 環境変数が未設定なら常に false（一致 string があっても許さない）", () => {
      vi.stubEnv("CRON_SECRET", "");
      const headers = new Headers({
        authorization: "Bearer ",
      });
      expect(isValidCronRequest(headers)).toBe(false);
    });

    it("大文字小文字の表記ゆれ (Authorization / authorization) はどちらも受け付ける", () => {
      // Headers は HTTP 仕様どおり case-insensitive に扱う
      const h1 = new Headers({ authorization: "Bearer correct-secret" });
      const h2 = new Headers({ Authorization: "Bearer correct-secret" });
      expect(isValidCronRequest(h1)).toBe(true);
      expect(isValidCronRequest(h2)).toBe(true);
    });
  });

  describe("requireCronAuth", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("CRON_SECRET 未設定時は 500 を返す（fail-closed）", async () => {
      vi.stubEnv("CRON_SECRET", "");
      const headers = new Headers({ authorization: "Bearer anything" });

      const res = requireCronAuth(headers);

      expect(res).not.toBeNull();
      expect(res!.status).toBe(500);
      const body = await res!.json();
      expect(body.error).toMatch(/CRON_SECRET/);
    });

    it("認証失敗時は 401 を返す", async () => {
      vi.stubEnv("CRON_SECRET", "correct-secret");
      const headers = new Headers({ authorization: "Bearer wrong-secret" });

      const res = requireCronAuth(headers);

      expect(res).not.toBeNull();
      expect(res!.status).toBe(401);
    });

    it("認証成功時は null を返す", () => {
      vi.stubEnv("CRON_SECRET", "correct-secret");
      const headers = new Headers({ authorization: "Bearer correct-secret" });

      expect(requireCronAuth(headers)).toBeNull();
    });
  });

  describe("runSyncUser", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(smartesMod.syncUser).mockResolvedValue(
        buildResult("smartes", ""),
      );
      vi.mocked(interviewaiMod.syncUser).mockResolvedValue(
        buildResult("interviewai", ""),
      );
      vi.mocked(compaiMod.syncUser).mockResolvedValue(
        buildResult("compai", ""),
      );
      vi.mocked(sugoshuMod.syncUser).mockResolvedValue(
        buildResult("sugoshu", ""),
      );
    });

    it("smartes を受け取ったら ../smartes.syncUser を呼び、他は呼ばない", async () => {
      vi.mocked(smartesMod.syncUser).mockResolvedValue(
        buildResult("smartes", "u-smartes"),
      );

      const result = await runSyncUser("smartes", "u-smartes");

      expect(smartesMod.syncUser).toHaveBeenCalledTimes(1);
      expect(smartesMod.syncUser).toHaveBeenCalledWith("u-smartes");
      expect(interviewaiMod.syncUser).not.toHaveBeenCalled();
      expect(compaiMod.syncUser).not.toHaveBeenCalled();
      expect(sugoshuMod.syncUser).not.toHaveBeenCalled();
      expect(result.product).toBe("smartes");
      expect(result.externalUserId).toBe("u-smartes");
    });

    it("interviewai を受け取ったら ../interviewai.syncUser を呼び、他は呼ばない", async () => {
      vi.mocked(interviewaiMod.syncUser).mockResolvedValue(
        buildResult("interviewai", "u-iai"),
      );

      const result = await runSyncUser("interviewai", "u-iai");

      expect(interviewaiMod.syncUser).toHaveBeenCalledTimes(1);
      expect(interviewaiMod.syncUser).toHaveBeenCalledWith("u-iai");
      expect(smartesMod.syncUser).not.toHaveBeenCalled();
      expect(compaiMod.syncUser).not.toHaveBeenCalled();
      expect(sugoshuMod.syncUser).not.toHaveBeenCalled();
      expect(result.product).toBe("interviewai");
      expect(result.externalUserId).toBe("u-iai");
    });

    it("compai を受け取ったら ../compai.syncUser を呼び、他は呼ばない", async () => {
      vi.mocked(compaiMod.syncUser).mockResolvedValue(
        buildResult("compai", "u-compai"),
      );

      const result = await runSyncUser("compai", "u-compai");

      expect(compaiMod.syncUser).toHaveBeenCalledTimes(1);
      expect(compaiMod.syncUser).toHaveBeenCalledWith("u-compai");
      expect(smartesMod.syncUser).not.toHaveBeenCalled();
      expect(interviewaiMod.syncUser).not.toHaveBeenCalled();
      expect(sugoshuMod.syncUser).not.toHaveBeenCalled();
      expect(result.product).toBe("compai");
      expect(result.externalUserId).toBe("u-compai");
    });

    it("sugoshu を受け取ったら ../sugoshu.syncUser を呼び、他は呼ばない", async () => {
      vi.mocked(sugoshuMod.syncUser).mockResolvedValue(
        buildResult("sugoshu", "u-sugoshu"),
      );

      const result = await runSyncUser("sugoshu", "u-sugoshu");

      expect(sugoshuMod.syncUser).toHaveBeenCalledTimes(1);
      expect(sugoshuMod.syncUser).toHaveBeenCalledWith("u-sugoshu");
      expect(smartesMod.syncUser).not.toHaveBeenCalled();
      expect(interviewaiMod.syncUser).not.toHaveBeenCalled();
      expect(compaiMod.syncUser).not.toHaveBeenCalled();
      expect(result.product).toBe("sugoshu");
      expect(result.externalUserId).toBe("u-sugoshu");
    });

    it("モジュール側の結果（ok=false / errors あり）をそのまま返す", async () => {
      const errorResult: SyncUserResult = {
        product: "smartes",
        externalUserId: "u-1",
        ok: false,
        upserted: { synced_smartes_users: 1 },
        errors: ["synced_smartes_generated_es upsert: boom"],
      };
      vi.mocked(smartesMod.syncUser).mockResolvedValue(errorResult);

      const result = await runSyncUser("smartes", "u-1");

      expect(result).toEqual(errorResult);
    });
  });
});
