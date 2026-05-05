import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth";
import { EventForm } from "@/features/company/app/events/components/event-form";
import { updateEventAction } from "@/features/company/app/events/actions/save";
import {
  getCompanyMembership,
  getEventById,
} from "@/features/company/app/events/queries";

export const metadata = {
  title: "イベント編集 | ScoutLink",
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getAuthUser();
  if (!user) redirect("/company/login");

  const membership = await getCompanyMembership(user.id);
  if (!membership) redirect("/company/login");
  if (membership.role !== "owner" && membership.role !== "admin") {
    redirect("/company/events");
  }

  const event = await getEventById(id, membership.companyId);
  if (!event) notFound();

  return <EventForm event={event} action={updateEventAction} />;
}
