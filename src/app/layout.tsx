import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scout - スカウトサービス",
  description: "企業と学生をつなぐスカウトプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
