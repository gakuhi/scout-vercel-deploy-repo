import { redirect } from "next/navigation";
import { getScoutInbox } from "@/features/scout/actions";
import {
  ScoutView,
  type FilterKey,
} from "@/features/scout/components/scout-view";
import { MOCK_SCOUTS } from "@/features/scout/mock";

export const dynamic = "force-dynamic";

const VALID_FILTERS: ReadonlySet<FilterKey> = new Set([
  "all",
  "unread",
  "read",
  "accepted",
  "favorite",
]);

export default async function StudentScoutPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const useMock = params.mock === "1";
  const initialFilter: FilterKey =
    params.filter && VALID_FILTERS.has(params.filter as FilterKey)
      ? (params.filter as FilterKey)
      : "all";

  const real = useMock ? null : await getScoutInbox();

  if (!useMock && real === null) {
    redirect("/student/login");
  }

  // モックは ?mock=1 の明示指定時のみ。
  // dev で実データが空でもモックには勝手にフォールバックしない（実 DB の空状態を
  // 観測できなくなるため）。プレビュー用途は ?mock=1 で開く運用に統一する。
  const scouts = useMock ? MOCK_SCOUTS : (real ?? []);

  return <ScoutView scouts={scouts} initialFilter={initialFilter} />;
}
