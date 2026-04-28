import { describe, expect, it } from "vitest";
import { deriveAvailability } from "../schema";

describe("deriveAvailability", () => {
  // 基準日時を JST 2026-04-25 12:00 に固定して境界判定を検証する
  const now = new Date("2026-04-25T12:00:00+09:00");

  it("締切が現在より過去なら closed (isBlocked=true)", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 50,
        applicationDeadline: "2026-04-20",
      },
      now,
    );
    expect(result.status).toBe("closed");
    expect(result.isBlocked).toBe(true);
    expect(result.deadlineLabel).toBe("2026.04.20");
  });

  it("締切日の 23:59:59 (JST) までは受付（同日は closed にならない）", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 50,
        applicationDeadline: "2026-04-25",
      },
      now,
    );
    expect(result.status).toBe("open");
    expect(result.isBlocked).toBe(false);
  });

  it("締切翌日の 00:00 (JST) を過ぎたら closed", () => {
    const justAfterDeadline = new Date("2026-04-26T00:00:01+09:00");
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 50,
        applicationDeadline: "2026-04-25",
      },
      justAfterDeadline,
    );
    expect(result.status).toBe("closed");
  });

  it("残席 0 なら full (isBlocked=true)", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 0,
        applicationDeadline: "2026-05-01",
      },
      now,
    );
    expect(result.status).toBe("full");
    expect(result.isBlocked).toBe(true);
    expect(result.remainingCapacity).toBe(0);
  });

  it("残席が負の値でも full に倒れる（境界）", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: -5,
        applicationDeadline: null,
      },
      now,
    );
    expect(result.status).toBe("full");
    // remainingCapacity は 0 に丸められる
    expect(result.remainingCapacity).toBe(0);
  });

  it("残席 ≤ 20% なら nearly_full (申込可能)", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 20,
        applicationDeadline: null,
      },
      now,
    );
    expect(result.status).toBe("nearly_full");
    expect(result.isBlocked).toBe(false);
  });

  it("残席 21% は open (nearly_full の境界)", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 21,
        applicationDeadline: null,
      },
      now,
    );
    expect(result.status).toBe("open");
  });

  it("締切 null + 残席十分なら open", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 50,
        applicationDeadline: null,
      },
      now,
    );
    expect(result.status).toBe("open");
    expect(result.deadlineLabel).toBeNull();
  });

  it("capacity が null なら定員制限なしとして残席計算をスキップ", () => {
    const result = deriveAvailability(
      {
        capacity: null,
        remainingCapacity: null,
        applicationDeadline: null,
      },
      now,
    );
    expect(result.status).toBe("open");
    expect(result.capacity).toBeNull();
  });

  it("締切過ぎは残席に関係なく closed (closed が full より優先)", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 0,
        applicationDeadline: "2026-04-20",
      },
      now,
    );
    expect(result.status).toBe("closed");
  });

  it("不正な applicationDeadline 文字列は実質的に無効化される", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 50,
        applicationDeadline: "not-a-date",
      },
      now,
    );
    expect(result.status).toBe("open");
  });

  it("deadlineLabel は YYYY.MM.DD 形式に整形される", () => {
    const result = deriveAvailability(
      {
        capacity: 100,
        remainingCapacity: 50,
        applicationDeadline: "2026-12-31",
      },
      now,
    );
    expect(result.deadlineLabel).toBe("2026.12.31");
  });
});
