import { cache } from "react";
import { getProfile as actionGetProfile } from "./actions";

/**
 * 1 リクエスト内で重複呼び出しを deduplicate するキャッシュ版 getProfile。
 *
 * 同一リクエストの server component 階層（例: (student) layout → page）から
 * 複数回呼ばれても DB アクセスが 1 回に集約される。
 */
export const getProfile = cache(actionGetProfile);
