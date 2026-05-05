// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  CulturePhotoGrid,
  JobHeroBanner,
} from "@/features/scout/components/scout-view";
import type { ScoutItem } from "@/features/scout/schema";

const PHOTO = (n: number) => ({
  url: `https://example.test/photo-${n}.jpg`,
  caption: `caption-${n}`,
});

function baseCompany(): ScoutItem["company"] {
  return {
    name: "Test Co.",
    logoUrl: null,
    industry: null,
    description: null,
    culture: null,
    employeeCountRange: null,
    websiteUrl: null,
  };
}

function baseJob(overrides: Partial<ScoutItem["job"]> = {}): ScoutItem["job"] {
  return {
    title: "Engineer",
    description: null,
    requirements: null,
    benefits: null,
    ...overrides,
  };
}

describe("CulturePhotoGrid", () => {
  it("photos が空配列なら何も描画しない（セクション非表示）", () => {
    const { container } = render(<CulturePhotoGrid photos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("photos が 1 枚のとき、矢印・ドットを描画しない", () => {
    render(<CulturePhotoGrid photos={[PHOTO(1)]} />);

    expect(screen.getByAltText("caption-1")).toBeInTheDocument();
    expect(screen.getByText("caption-1")).toBeInTheDocument();
    expect(screen.queryByLabelText("前の写真")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("次の写真")).not.toBeInTheDocument();
    // ドットは aria-label "N 枚目を表示" 形式で出る
    expect(screen.queryByLabelText(/枚目を表示/)).not.toBeInTheDocument();
  });

  it("photos が 2 枚以上のとき、矢印・ドットを描画する", () => {
    render(<CulturePhotoGrid photos={[PHOTO(1), PHOTO(2), PHOTO(3)]} />);

    expect(screen.getByLabelText("前の写真")).toBeInTheDocument();
    expect(screen.getByLabelText("次の写真")).toBeInTheDocument();
    expect(screen.getByLabelText("1 枚目を表示")).toBeInTheDocument();
    expect(screen.getByLabelText("2 枚目を表示")).toBeInTheDocument();
    expect(screen.getByLabelText("3 枚目を表示")).toBeInTheDocument();
  });

  it("初期表示は先頭画像（index 0）", () => {
    render(<CulturePhotoGrid photos={[PHOTO(1), PHOTO(2)]} />);

    // 表示中の画像は alt と caption text の両方に出る
    expect(screen.getByAltText("caption-1")).toBeInTheDocument();
    expect(screen.queryByAltText("caption-2")).not.toBeInTheDocument();
    // 先頭ドットが aria-current
    const firstDot = screen.getByLabelText("1 枚目を表示");
    expect(firstDot).toHaveAttribute("aria-current", "true");
  });
});

describe("JobHeroBanner", () => {
  it("job.heroImageUrl が undefined / null / 空文字のときグラデーション背景で描画する", () => {
    const company = { ...baseCompany(), industry: "コンサル", name: "Acme" };
    const cases = [undefined, null, ""];
    for (const value of cases) {
      const { container, unmount } = render(
        <JobHeroBanner company={company} job={baseJob({ heroImageUrl: value })} />,
      );
      // バナー本体は描画される
      expect(container.firstChild).not.toBeNull();
      // <img> は出ない
      expect(container.querySelector("img")).toBeNull();
      // 企業名・業界はオーバーレイに表示される
      expect(container.textContent).toContain("Acme");
      expect(container.textContent).toContain("コンサル");
      unmount();
    }
  });

  it("job.heroImageUrl があるときバナー画像と会社名を描画する", () => {
    const company = { ...baseCompany(), industry: "コンサル", name: "Acme" };
    render(
      <JobHeroBanner
        company={company}
        job={baseJob({ heroImageUrl: "https://example.test/hero.jpg" })}
      />,
    );

    const img = screen.getByAltText("Acme のバナー");
    expect(img).toHaveAttribute("src", "https://example.test/hero.jpg");
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("コンサル")).toBeInTheDocument();
  });

  it("industry が null のときオーバーレイは「企業情報」フォールバック", () => {
    render(
      <JobHeroBanner
        company={baseCompany()}
        job={baseJob({ heroImageUrl: "https://example.test/hero.jpg" })}
      />,
    );
    expect(screen.getByText("企業情報")).toBeInTheDocument();
  });
});
