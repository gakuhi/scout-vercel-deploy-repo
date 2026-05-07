import { redirect } from "next/navigation";

/**
 * `/student` 単体には実体ページが無いため、ホーム (/student/dashboard) へ
 * 強制リダイレクトする。サイドバーの「ホーム」リンク（href=/student）や
 * 古いブックマーク経由の流入を 404 にしないための受け皿。
 *
 * 未ログイン時は middleware が先に効いて /student/login へ飛ぶので、ここに
 * 到達するのは認証済みかつ学生ロールのユーザーのみ。
 */
export default function StudentRoot() {
  redirect("/student/dashboard");
}
