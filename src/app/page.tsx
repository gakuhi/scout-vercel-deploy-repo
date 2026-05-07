import type { Metadata } from "next";
import { LandingPage } from "@/features/student/landing/components/landing-page";

export const metadata: Metadata = {
  title: "Scout Link ｜ あなたの就活履歴が、企業との出会いになる",
  description:
    "履歴書じゃなくて、就活履歴で。面接練習 AI ・スマート ES ・企業分析 AI ・すごい就活と連携、LINE で企業からスカウトが届く新しい就活サービス。",
  openGraph: {
    title: "Scout Link ｜ あなたの就活履歴が、企業との出会いになる",
    description:
      "履歴書じゃなくて、就活履歴で。面接練習 AI ・スマート ES ・企業分析 AI ・すごい就活と連携、LINE で企業からスカウトが届く新しい就活サービス。",
    type: "website",
  },
};

export default function Home() {
  return <LandingPage />;
}
