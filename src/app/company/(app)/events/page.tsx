import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventListView } from "@/features/company/app/events/components/event-list-view";
import {
  getCompanyMembership,
  listEvents,
} from "@/features/company/app/events/queries";

export const metadata = {
  title: "イベント管理 | ScoutLink",
};

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");

  const events = await listEvents(membership.companyId);
  const isEditable =
    membership.role === "owner" || membership.role === "admin";

  return <EventListView events={events} isEditable={isEditable} />;
}
