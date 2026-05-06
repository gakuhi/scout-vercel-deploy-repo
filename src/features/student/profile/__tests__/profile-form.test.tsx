// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ProfileForm,
  type StudentProfile,
} from "@/features/student/profile/components/profile-form";
import { getGraduationYearOptions } from "@/features/student/profile/constants";

vi.mock("@/features/student/profile/actions", () => ({
  createProfile: vi.fn(async () => ({})),
  updateProfile: vi.fn(async () => ({})),
}));

const mbtiTypes = [
  { id: "mbti-1", type_code: "INTJ", name_ja: "建築家" },
  { id: "mbti-2", type_code: "ENFP", name_ja: "運動家" },
];

// LINE callback 直後の students 行を模した、ほぼ空のプロフィール
function emptyProfile(email = "user@example.com"): StudentProfile {
  return {
    last_name: null,
    first_name: null,
    last_name_kana: null,
    first_name_kana: null,
    email,
    phone: null,
    birthdate: null,
    gender: null,
    university: null,
    faculty: null,
    department: null,
    academic_type: null,
    graduation_year: null,
    postal_code: null,
    prefecture: null,
    city: null,
    street: null,
    building: null,
    bio: null,
    is_profile_public: null,
    profile_image_url: null,
    mbti_types: null,
  };
}

describe("ProfileForm (mode=create) 初期表示", () => {
  it("見出しと導入文を表示する", () => {
    render(<ProfileForm mode="create" profile={emptyProfile("user@example.com")} mbtiTypes={mbtiTypes} />);
    expect(screen.getByRole("heading", { name: "プロフィール作成" })).toBeInTheDocument();
    expect(
      screen.getByText(/はじめまして！まずはあなたの基本情報を登録しましょう/),
    ).toBeInTheDocument();
  });

  it("email に初期値が設定されている", () => {
    render(<ProfileForm mode="create" profile={emptyProfile("user@example.com")} mbtiTypes={mbtiTypes} />);
    const emailInput = screen.getByLabelText(/メールアドレス/) as HTMLInputElement;
    expect(emailInput.value).toBe("user@example.com");
  });

  it("必須項目の姓名・カナ・電話・生年月日・住所・自己紹介が存在する", () => {
    render(<ProfileForm mode="create" profile={emptyProfile("u@example.com")} mbtiTypes={mbtiTypes} />);
    expect(screen.getByLabelText(/^姓/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/セイ（カタカナ）/)).toBeInTheDocument();
    expect(screen.getByLabelText(/メイ（カタカナ）/)).toBeInTheDocument();
    expect(screen.getByLabelText(/電話番号/)).toBeInTheDocument();
    // jsdom 環境では useIsMobile が初期値 false → DatePicker (PC 用) のみ描画される。
    expect(screen.getByLabelText(/生年月日/)).toBeInTheDocument();
    expect(screen.getByLabelText(/郵便番号/)).toBeInTheDocument();
    expect(screen.getByLabelText(/都道府県/)).toBeInTheDocument();
    expect(screen.getByLabelText(/市区町村/)).toBeInTheDocument();
    expect(screen.getByLabelText(/町名・番地/)).toBeInTheDocument();
    expect(screen.getByLabelText(/建物名・部屋番号/)).toBeInTheDocument();
    expect(screen.getByLabelText(/自己紹介/)).toBeInTheDocument();
  });

  it("初期状態では登録ボタンは表示されない（全必須未入力のため）", () => {
    render(<ProfileForm mode="create" profile={emptyProfile("u@example.com")} mbtiTypes={mbtiTypes} />);
    expect(screen.queryByRole("button", { name: /プロフィールを登録/ })).not.toBeInTheDocument();
  });
});

describe("ProfileForm (mode=create) 卒業予定年", () => {
  it("現在年を基準とした 9 件の選択肢が存在する", () => {
    render(<ProfileForm mode="create" profile={emptyProfile("u@example.com")} mbtiTypes={mbtiTypes} />);
    const select = screen.getByLabelText(/卒業予定年/) as HTMLSelectElement;
    // 先頭の「選択してください」+ 9 件
    expect(select.options).toHaveLength(10);
    const expected = getGraduationYearOptions();
    for (const year of expected) {
      expect(select.querySelector(`option[value="${year}"]`)).not.toBeNull();
    }
  });
});

describe("ProfileForm (mode=create) 公開トグル", () => {
  it("プロフィール公開トグルは初期オフ", () => {
    const { container } = render(
      <ProfileForm mode="create" profile={emptyProfile("u@example.com")} mbtiTypes={mbtiTypes} />,
    );
    const toggle = container.querySelector<HTMLInputElement>("#is_profile_public");
    expect(toggle).not.toBeNull();
    expect(toggle).not.toBeChecked();
  });

  it("ラベルと説明文が表示される", () => {
    render(<ProfileForm mode="create" profile={emptyProfile("u@example.com")} mbtiTypes={mbtiTypes} />);
    expect(screen.getByText("プロフィールを企業に公開")).toBeInTheDocument();
    expect(
      screen.getByText(/ON にすると企業に公開され、スカウト受信されます/),
    ).toBeInTheDocument();
  });
});

describe("ProfileForm (mode=create) MBTI", () => {
  it("渡された MBTI タイプが選択肢に含まれる", () => {
    render(<ProfileForm mode="create" profile={emptyProfile("u@example.com")} mbtiTypes={mbtiTypes} />);
    const select = screen.getByLabelText(/性格タイプ/) as HTMLSelectElement;
    expect(select.querySelector('option[value="INTJ"]')).not.toBeNull();
    expect(select.querySelector('option[value="ENFP"]')).not.toBeNull();
  });

  it("mbtiTypes が空でも「選択してください」のみで描画される", () => {
    render(<ProfileForm mode="create" profile={emptyProfile("u@example.com")} mbtiTypes={[]} />);
    const select = screen.getByLabelText(/性格タイプ/) as HTMLSelectElement;
    expect(select.options).toHaveLength(1);
  });
});
