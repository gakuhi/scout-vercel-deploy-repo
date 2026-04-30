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

  // 明示的にモック指定、または開発環境で実データが空なら mock を流し込む
  const shouldFallback =
    useMock ||
    (process.env.NODE_ENV === "development" && (real?.length ?? 0) === 0);

  const scouts = shouldFallback ? MOCK_SCOUTS : (real ?? []);

  return <ScoutView scouts={scouts} initialFilter={initialFilter} />;
}
