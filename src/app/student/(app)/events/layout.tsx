import { ApplyStatusProvider } from "@/features/student/events/components/apply-status";
import { listMyActiveRegistrationEventIds } from "@/features/student/events/lib/queries";
import { createClient } from "@/lib/supabase/server";

export default async function StudentEventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialAppliedIds = user
    ? await listMyActiveRegistrationEventIds(supabase).catch(() => [] as string[])
    : [];

  return (
    <ApplyStatusProvider initialAppliedIds={initialAppliedIds}>
      {children}
    </ApplyStatusProvider>
  );
}
