// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScoutListView } from "@/features/company/app/scouts/components/scout-list-view";
import type { ScoutListItem } from "@/features/company/app/scouts/schemas";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams("")),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

function makeScout(overrides: Partial<ScoutListItem> = {}): ScoutListItem {
  return {
    id: "s1",
    subject: "エンジニア募集",
    message: "ぜひご応募ください",
    status: "sent",
    sentAt: "2026-04-24T10:30:00.000Z",
    readAt: null,
    respondedAt: null,
    expiresAt: null,
    studentId: "student-1",
    studentUniversity: "東京大学",
    studentFaculty: "工学部",
    studentName: null,
    jobPostingTitle: "26卒 エンジニア職",
    ...overrides,
  };
}

describe("ScoutListView", () => {
  it("スカウトがない場合は空メッセージを表示する", () => {
    render(<ScoutListView scouts={[]} sentThisMonth={0} />);
    expect(screen.getByText("スカウトがまだ送信されていません")).toBeInTheDocument();
  });

  it("スカウト一覧がバッチとして表示される", () => {
    render(
      <ScoutListView
        scouts={[makeScout(), makeScout({ id: "s2" })]}
        sentThisMonth={2}
      />,
    );
    expect(screen.getByText("エンジニア募集")).toBeInTheDocument();
    expect(screen.getByText("2人に送信")).toBeInTheDocument();
  });

  it("highlight パラメータがある場合は該当バッチが自動展開されハイライトクラスが付与される", async () => {
    const { useSearchParams } = await import("next/navigation");
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("highlight=s2") as ReturnType<typeof useSearchParams>,
    );

    const { container } = render(
      <ScoutListView
        scouts={[
          makeScout({ id: "s1" }),
          makeScout({ id: "s2", status: "declined" }),
        ]}
        sentThisMonth={2}
      />,
    );

    // バッチが自動展開されて送信先一覧が見える
    expect(screen.getByText(/送信先/)).toBeInTheDocument();

    // ハイライトされた行がある
    const highlightedRow = container.querySelector(".animate-highlight-fade");
    expect(highlightedRow).toBeInTheDocument();

    // scrollIntoView が呼ばれた
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("highlight パラメータがない場合はバッチが閉じた状態", () => {
    const { container } = render(
      <ScoutListView
        scouts={[makeScout()]}
        sentThisMonth={1}
      />,
    );

    // 送信先一覧は見えない（バッチが閉じている）
    expect(screen.queryByText(/送信先/)).not.toBeInTheDocument();
    expect(container.querySelector(".animate-highlight-fade")).not.toBeInTheDocument();
  });

  it("バッチをクリックすると展開される", () => {
    render(
      <ScoutListView
        scouts={[makeScout()]}
        sentThisMonth={1}
      />,
    );

    // 最初は閉じている
    expect(screen.queryByText(/送信先/)).not.toBeInTheDocument();

    // バッチヘッダーをクリック
    fireEvent.click(screen.getByText("エンジニア募集"));

    // 展開されて送信先が見える
    expect(screen.getByText(/送信先/)).toBeInTheDocument();
  });
});
