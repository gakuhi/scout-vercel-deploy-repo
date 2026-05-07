import type { Metadata } from "next";
import { CompanyLandingPage } from "@/features/company/landing/components/landing-page";

export const metadata: Metadata = {
  title: "ScoutLink for Business — 本物の就活履歴で出会う、企業向けスカウト",
  description:
    "面接練習 AI・スマート ES・企業分析 AI・すごい就活の行動データを統合し、いま本気で動いている学生を可視化する企業向けスカウトプラットフォーム。月間 6,000 人以上の新規学生と出会えます。",
  openGraph: {
    title: "ScoutLink for Business",
    description:
      "本物の就活履歴で学生と出会う、企業向けスカウトプラットフォーム。",
    type: "website",
  },
};

export default function BusinessLanding() {
  return <CompanyLandingPage />;
}
