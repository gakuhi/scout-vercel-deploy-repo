// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfilePreview } from "@/features/student/profile/components/profile-preview";
import type { ProfileMock } from "@/features/student/profile/mock";

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
    bio: "大学時代はデータ分析に注力しました。",
    isProfilePublic: true,
    mbtiTypeCode: "INTJ",
    mbtiTypeName: "建築家",
    integratedProfile: {
      summary: "論理性が高く長期的な成長を重視する学生。",
      strengths: ["論理的思考", "リーダーシップ"],
      skills: ["Python", "SQL"],
      growthStabilityScore: null,
      specialistGeneralistScore: null,
      individualTeamScore: null,
      autonomyGuidanceScore: null,
      logicalThinkingScore: null,
      communicationScore: null,
      writingSkillScore: null,
      leadershipScore: null,
      activityVolumeScore: null,
      activityLevel: null,
      interestedIndustries: [],
      interestedJobTypes: [],
      scoreConfidence: 0,
    },
    productCounts: [],
    scoutSettings: [],
    verifiedAt: "",
    ...overrides,
  };
}

describe("ProfilePreview 非公開時", () => {
  it("isProfilePublic = false の場合は非公開メッセージを表示する", () => {
    render(<ProfilePreview data={baseProfile({ isProfilePublic: false })} />);
    expect(screen.getByText("プロフィールは非公開です")).toBeInTheDocument();
  });

  it("非公開時は「プロフィール編集へ」リンクを表示する", () => {
    render(<ProfilePreview data={baseProfile({ isProfilePublic: false })} />);
    const link = screen.getByRole("link", { name: /プロフィール編集へ/ });
    expect(link).toHaveAttribute("href", "/student/profile/edit");
  });

  it("非公開時は名前など本体コンテンツが表示されない", () => {
    render(<ProfilePreview data={baseProfile({ isProfilePublic: false })} />);
    expect(screen.queryByText("佐藤 健太")).not.toBeInTheDocument();
    expect(screen.queryByText("専門スキル")).not.toBeInTheDocument();
  });
});

describe("ProfilePreview 公開時の表示", () => {
  it("ヘッダーには氏名と卒業年度のみ表示し、大学・学部は書かない", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(screen.getByRole("heading", { name: "佐藤 健太" })).toBeInTheDocument();
    expect(screen.getByText("2026年卒")).toBeInTheDocument();
    expect(screen.queryByText(/2026年卒業予定/)).not.toBeInTheDocument();
  });

  it("情報欄に大学名・学部・学科・都道府県・性格タイプを表示する", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(screen.getByText("東京未来大学")).toBeInTheDocument();
    expect(screen.getByText("経済学部 / 経済学科")).toBeInTheDocument();
    expect(screen.getByText("東京都")).toBeInTheDocument();
    expect(screen.getByText("性格タイプ：INTJ（建築家）")).toBeInTheDocument();
  });

  it("卒業年度が未設定の場合は「卒業年度未設定」と表示する", () => {
    render(<ProfilePreview data={baseProfile({ graduationYear: null })} />);
    expect(screen.getByText("卒業年度未設定")).toBeInTheDocument();
  });

  it("MBTI が未設定の場合は「性格タイプ：未設定」と表示する", () => {
    render(
      <ProfilePreview data={baseProfile({ mbtiTypeCode: null, mbtiTypeName: null })} />,
    );
    expect(screen.getByText("性格タイプ：未設定")).toBeInTheDocument();
  });

  it("プロフィール画像がない場合は avatarInitials を表示する", () => {
    render(<ProfilePreview data={baseProfile({ profileImageUrl: null })} />);
    expect(screen.getByText("SK")).toBeInTheDocument();
  });

  it("連絡先（email / phone）を表示する", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(screen.getByText("k.sato@example.com")).toBeInTheDocument();
    expect(screen.getByText("080-1234-5678")).toBeInTheDocument();
  });

  it("AI 人物要約カードに summary を表示する", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(
      screen.getByText("論理性が高く長期的な成長を重視する学生。"),
    ).toBeInTheDocument();
  });

  it("自己PR カードに bio を表示する", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(
      screen.getByText("大学時代はデータ分析に注力しました。"),
    ).toBeInTheDocument();
  });

  it("strengths と skills を表示する", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(screen.getByText("論理的思考")).toBeInTheDocument();
    // 「リーダーシップ」は能力スコアの軸ラベルにも出るため件数で検証
    expect(screen.getAllByText("リーダーシップ").length).toBeGreaterThan(0);
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("SQL")).toBeInTheDocument();
  });

  it("strengths / skills が空の場合は未生成メッセージを表示する", () => {
    const data = baseProfile({
      integratedProfile: {
        ...baseProfile().integratedProfile,
        strengths: [],
        skills: [],
      },
    });
    render(<ProfilePreview data={data} />);
    expect(
      screen.getByText(/4プロダクト連携後に自動生成されます/),
    ).toBeInTheDocument();
  });

  it("「プレビューを終了」ボタンが /student/profile に戻すリンクになっている", () => {
    render(<ProfilePreview data={baseProfile()} />);
    const link = screen.getByRole("link", { name: /プレビューを終了/ });
    expect(link).toHaveAttribute("href", "/student/profile");
  });
});

describe("ProfilePreview 削除済みセクション", () => {
  it("「プロダクト連携」セクションは表示しない", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(screen.queryByText("プロダクト連携")).not.toBeInTheDocument();
  });

  it("「各プロダクト同期データ」セクションは表示しない", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(screen.queryByText("各プロダクト同期データ")).not.toBeInTheDocument();
  });
});

describe("ProfilePreview 欠損値", () => {
  it("bio が空の場合はプレースホルダを表示する", () => {
    render(<ProfilePreview data={baseProfile({ bio: "" })} />);
    expect(
      screen.getByText(/自己紹介文が未設定です/),
    ).toBeInTheDocument();
  });

  it("email が空の場合は「未設定」を表示する", () => {
    render(<ProfilePreview data={baseProfile({ email: "" })} />);
    expect(screen.getAllByText("未設定").length).toBeGreaterThan(0);
  });

  it("大学・学部・学科が全て空の場合、対応行は「未設定」表示になる", () => {
    render(
      <ProfilePreview
        data={baseProfile({ university: "", faculty: "", department: "" })}
      />,
    );
    expect(screen.getAllByText("未設定").length).toBeGreaterThanOrEqual(2);
  });
});

describe("ProfilePreview 能力スコア", () => {
  it("4 軸のラベルと値を表示する", () => {
    render(
      <ProfilePreview
        data={baseProfile({
          integratedProfile: {
            ...baseProfile().integratedProfile,
            strengths: [], // strengths タグと「リーダーシップ」が衝突しないよう空にする
            skills: [],
            logicalThinkingScore: 75,
            communicationScore: 68,
            writingSkillScore: 72,
            leadershipScore: 60,
          },
        })}
      />,
    );
    expect(screen.getByText("能力スコア")).toBeInTheDocument();
    expect(screen.getByText("論理的思考力")).toBeInTheDocument();
    expect(screen.getByText("コミュニケーション力")).toBeInTheDocument();
    expect(screen.getByText("文章表現力")).toBeInTheDocument();
    expect(screen.getByText("リーダーシップ")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
  });

  it("値が null の場合は「—」を表示する", () => {
    render(<ProfilePreview data={baseProfile()} />);
    // baseProfile はデフォルトで全スコア null
    expect(screen.getByText("能力スコア")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });
});

describe("ProfilePreview 志向・価値観", () => {
  it("4 軸の対立ラベルを表示する", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(screen.getByText("志向・価値観")).toBeInTheDocument();
    expect(screen.getByText("安定")).toBeInTheDocument();
    expect(screen.getByText("成長")).toBeInTheDocument();
    expect(screen.getByText("ゼネラリスト")).toBeInTheDocument();
    expect(screen.getByText("スペシャリスト")).toBeInTheDocument();
    expect(screen.getByText("個人")).toBeInTheDocument();
    expect(screen.getByText("チーム")).toBeInTheDocument();
    expect(screen.getByText("ルール重視")).toBeInTheDocument();
    expect(screen.getByText("裁量")).toBeInTheDocument();
  });

  it("値が設定されている場合は両端にスコアを表示する", () => {
    render(
      <ProfilePreview
        data={baseProfile({
          integratedProfile: {
            ...baseProfile().integratedProfile,
            growthStabilityScore: 80,
          },
        })}
      />,
    );
    // 80 = 右側 / 20 = 左側
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});

describe("ProfilePreview 興味・関心", () => {
  it("興味業界・興味職種をラベル名で表示する", () => {
    render(
      <ProfilePreview
        data={baseProfile({
          integratedProfile: {
            ...baseProfile().integratedProfile,
            interestedIndustries: ["it_software", "consulting"],
            interestedJobTypes: ["engineer_it"],
          },
        })}
      />,
    );
    expect(screen.getByText("興味・関心")).toBeInTheDocument();
    expect(screen.getByText("興味業界 Top5（関心度順）")).toBeInTheDocument();
    expect(screen.getByText("1. IT・ソフトウェア")).toBeInTheDocument();
    expect(screen.getByText("2. コンサル")).toBeInTheDocument();
    expect(screen.getByText("興味職種")).toBeInTheDocument();
    expect(screen.getByText("ITエンジニア")).toBeInTheDocument();
  });
});

describe("ProfilePreview 就活活動量", () => {
  it("activityVolumeScore = 85 の場合「85 / 100」で表示する", () => {
    render(
      <ProfilePreview
        data={baseProfile({
          integratedProfile: {
            ...baseProfile().integratedProfile,
            activityVolumeScore: 85,
          },
        })}
      />,
    );
    expect(screen.getByText("就活活動量")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it("activityVolumeScore = null の場合は「—」を表示し、/ 100 は出ない", () => {
    render(<ProfilePreview data={baseProfile()} />);
    expect(screen.getByText("就活活動量")).toBeInTheDocument();
    expect(screen.queryByText("/ 100")).not.toBeInTheDocument();
  });
});
