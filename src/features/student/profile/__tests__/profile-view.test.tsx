// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileView } from "@/features/student/profile/components/profile-view";
import type {
  ProfileMock,
  SyncedEsItem,
  SyncedInterviewItem,
  SyncedResearchItem,
  SyncedSugoshuItem,
} from "@/features/student/profile/mock";

function emptySyncedItems(): ProfileMock["syncedItems"] {
  return {
    es: [],
    researches: [],
    interviewSessions: [],
    sugoshu: [],
  };
}

function baseProfile(overrides: Partial<ProfileMock> = {}): ProfileMock {
  return {
    name: "佐藤 健太",
    university: "東京未来大学",
    faculty: "経済学部",
    department: "経済学科",
    prefecture: "東京都",
    graduationYear: 2026,
    avatarInitials: "SK",
    profileImageUrl: null,
    email: "k.sato@example.com",
    phone: "080-1234-5678",
    bio: "データ分析サークルで前年比150%の参加者増を達成。",
    isProfilePublic: true,
    mbtiTypeCode: "INTJ",
    mbtiTypeName: "建築家",
    integratedProfile: {
      summary: "論理性が高く長期的な成長を重視する学生。",
      strengths: ["論理的思考", "リーダーシップ"],
      skills: ["Python", "SQL"],
      growthStabilityScore: 80,
      specialistGeneralistScore: 60,
      individualTeamScore: 50,
      autonomyGuidanceScore: 70,
      logicalThinkingScore: 75,
      communicationScore: 68,
      writingSkillScore: 72,
      leadershipScore: 60,
      activityVolumeScore: 85,
      activityLevel: "high",
      interestedIndustries: ["it_software", "consulting"],
      interestedJobTypes: ["planning"],
      scoreConfidence: 75,
    },
    productCounts: [
      { label: "ESデータ", icon: "description", value: 12 },
      { label: "企業分析", icon: "analytics", value: 45 },
      { label: "面接練習", icon: "record_voice_over", value: 8 },
      { label: "すごい就活", icon: "description", value: 6 },
    ],
    syncedItems: emptySyncedItems(),
    scoutSettings: [],
    verifiedAt: "",
    ...overrides,
  };
}

// ─── Hero / 基本情報 ───

describe("ProfileView 基本情報", () => {
  it("氏名・大学・学部・卒業予定年を表示する", () => {
    render(<ProfileView data={baseProfile()} />);
    expect(screen.getByRole("heading", { name: "佐藤 健太" })).toBeInTheDocument();
    expect(
      screen.getByText(/東京未来大学 \/ 経済学部 \/ 2026/),
    ).toBeInTheDocument();
  });

  it("プロフィール画像がない場合は avatarInitials を表示する", () => {
    render(<ProfileView data={baseProfile()} />);
    expect(screen.getByText("SK")).toBeInTheDocument();
  });

  it("編集・プレビューボタンのリンクが正しい", () => {
    render(<ProfileView data={baseProfile()} />);
    const editLink = screen.getByRole("link", { name: /プロフィール編集/ });
    const previewLink = screen.getByRole("link", { name: /企業向けプレビュー/ });
    expect(editLink).toHaveAttribute("href", "/student/profile/edit");
    expect(previewLink).toHaveAttribute("href", "/student/profile/preview");
  });
});

// ─── AI統合プロフィール ───

describe("ProfileView AI統合プロフィール", () => {
  it("summary / strengths / skills を表示する", () => {
    render(<ProfileView data={baseProfile()} />);
    expect(
      screen.getByText("論理性が高く長期的な成長を重視する学生。"),
    ).toBeInTheDocument();
    expect(screen.getByText("論理的思考")).toBeInTheDocument();
    // 「リーダーシップ」は strengths と能力スコア軸の両方に出るため件数で検証
    expect(screen.getAllByText("リーダーシップ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("SQL")).toBeInTheDocument();
  });

  it("興味業界・興味職種を日本語ラベルで表示する", () => {
    render(<ProfileView data={baseProfile()} />);
    expect(
      screen.getByText(/IT・ソフトウェア/),
    ).toBeInTheDocument();
    expect(screen.getByText(/コンサル/)).toBeInTheDocument();
    expect(screen.getByText("企画・事業開発")).toBeInTheDocument();
  });
});

// ─── 各プロダクト同期データアコーディオン ───

describe("ProfileView ES アコーディオン", () => {
  it("件数ゼロ時はデータなし表示", () => {
    render(<ProfileView data={baseProfile({ syncedItems: emptySyncedItems() })} />);
    // 「ES データ」アコーディオン内にデータなしメッセージ
    expect(screen.getByText("ES データ")).toBeInTheDocument();
    expect(screen.getAllByText("データなし").length).toBeGreaterThan(0);
  });

  it("ES 最新 2 件が表示される", () => {
    const items: SyncedEsItem[] = [
      {
        id: "es-1",
        generatedText: "私の強みはデータ分析です。",
        generatedAt: "2026-03-15T10:00:00Z",
      },
      {
        id: "es-2",
        generatedText: "学生時代に力を入れたのはサークル活動。",
        generatedAt: "2026-03-10T10:00:00Z",
      },
    ];
    render(
      <ProfileView
        data={baseProfile({
          syncedItems: { ...emptySyncedItems(), es: items },
        })}
      />,
    );
    expect(screen.getByText("私の強みはデータ分析です。")).toBeInTheDocument();
    expect(
      screen.getByText("学生時代に力を入れたのはサークル活動。"),
    ).toBeInTheDocument();
  });
});

describe("ProfileView 企業分析アコーディオン", () => {
  it("タイトル・URL を表示する", () => {
    const items: SyncedResearchItem[] = [
      {
        id: "r-1",
        title: "トヨタの海外戦略",
        url: "https://example.com/toyota",
        originalCreatedAt: "2026-03-15T09:00:00Z",
      },
    ];
    render(
      <ProfileView
        data={baseProfile({
          syncedItems: { ...emptySyncedItems(), researches: items },
        })}
      />,
    );
    expect(screen.getByText("トヨタの海外戦略")).toBeInTheDocument();
    const urlLink = screen.getByRole("link", { name: /example\.com\/toyota/ });
    expect(urlLink).toHaveAttribute("href", "https://example.com/toyota");
    expect(urlLink).toHaveAttribute("target", "_blank");
  });
});

describe("ProfileView 面接練習アコーディオン", () => {
  it("企業名・session_type・overall_score を表示する", () => {
    const items: SyncedInterviewItem[] = [
      {
        id: "i-1",
        companyName: "株式会社サンプル",
        sessionType: "technical",
        overallScore: 82,
        startedAt: "2026-03-15T14:00:00Z",
      },
    ];
    render(
      <ProfileView
        data={baseProfile({
          syncedItems: { ...emptySyncedItems(), interviewSessions: items },
        })}
      />,
    );
    expect(screen.getByText("株式会社サンプル")).toBeInTheDocument();
    expect(screen.getByText("technical")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("overall_score が null なら「—」を表示する", () => {
    const items: SyncedInterviewItem[] = [
      {
        id: "i-1",
        companyName: "株式会社テスト",
        sessionType: "behavioral",
        overallScore: null,
        startedAt: "2026-03-10T14:00:00Z",
      },
    ];
    render(
      <ProfileView
        data={baseProfile({
          syncedItems: { ...emptySyncedItems(), interviewSessions: items },
        })}
      />,
    );
    expect(screen.getByText("株式会社テスト")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("ProfileView すごい就活アコーディオン", () => {
  it("履歴書と診断のバッジと本文抜粋を表示する", () => {
    const items: SyncedSugoshuItem[] = [
      {
        id: "s-1",
        kind: "resume",
        contentPreview: "東京未来大学 経済学部 在学中。",
        originalCreatedAt: "2026-03-20T11:00:00Z",
      },
      {
        id: "s-2",
        kind: "diagnosis",
        contentPreview: "成長志向・論理的思考",
        originalCreatedAt: "2026-02-28T11:00:00Z",
      },
    ];
    render(
      <ProfileView
        data={baseProfile({
          syncedItems: { ...emptySyncedItems(), sugoshu: items },
        })}
      />,
    );
    expect(screen.getByText("東京未来大学 経済学部 在学中。")).toBeInTheDocument();
    expect(screen.getByText("成長志向・論理的思考")).toBeInTheDocument();
    expect(screen.getByText("履歴書")).toBeInTheDocument();
    expect(screen.getByText("診断")).toBeInTheDocument();
  });
});

// ─── 件数カード ───

describe("ProfileView プロダクト件数カード", () => {
  it("各プロダクトの件数を 2 桁ゼロ埋めで表示する", () => {
    render(<ProfileView data={baseProfile()} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("08")).toBeInTheDocument();
    expect(screen.getByText("06")).toBeInTheDocument();
  });

  it("ラベルを表示する", () => {
    render(<ProfileView data={baseProfile()} />);
    // 件数カードのラベル。アコーディオンでも同じ文字列が出るので件数のみ検証
    expect(screen.getAllByText("ESデータ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("企業分析").length).toBeGreaterThan(0);
    expect(screen.getAllByText("面接練習").length).toBeGreaterThan(0);
    expect(screen.getAllByText("すごい就活").length).toBeGreaterThan(0);
  });
});

// ─── 自己紹介文 ───

describe("ProfileView 自己紹介文", () => {
  it("bio を表示する", () => {
    render(<ProfileView data={baseProfile()} />);
    expect(
      screen.getByText("データ分析サークルで前年比150%の参加者増を達成。"),
    ).toBeInTheDocument();
  });
});
