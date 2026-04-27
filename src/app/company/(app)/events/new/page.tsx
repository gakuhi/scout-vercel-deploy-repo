import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "@/features/company/app/events/components/event-form";
import { createEventAction } from "@/features/company/app/events/actions/save";
import { getCompanyMembership } from "@/features/company/app/events/queries";

export const metadata = {
  title: "新規イベント作成 | Executive Monograph",
};

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");
  if (membership.role !== "owner" && membership.role !== "admin") {
    redirect("/company/events");
  }

  return <EventForm action={createEventAction} />;
}
