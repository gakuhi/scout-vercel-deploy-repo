import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { error } = await supabase.from("connection_test").select("*").limit(1);

  // テーブルが存在しないエラー = 接続自体は成功している
  const isConnected =
    !error || error.message.includes("Could not find") || error.code === "PGRST205";

  return (
    <main className="flex min-h-screen items-center justify-center">
      {isConnected ? (
        <h1 className="text-2xl font-bold">Supabase接続OK!!!!</h1>
      ) : (
        <h1 className="text-2xl text-red-500">
          接続失敗: {error.message} <br />
          エラーコード: {error.code}
        </h1>
      )}
    </main>
  );
}
