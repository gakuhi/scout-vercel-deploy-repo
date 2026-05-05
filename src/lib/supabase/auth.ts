import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * 同一 React レンダー内での `supabase.auth.getUser()` 重複呼び出しを排除する。
 * layout / page / 内部の getProfile 等、複数箇所が user を必要としても
 * Supabase Auth への HTTP 往復は 1 回に集約される。
 *
 * 注意: middleware は別実行コンテキストのため cache の対象外。middleware 側の
 * `updateSession` は引き続き 1 回 getUser を呼ぶ必要がある。
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
