import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EventFormat } from "./schemas";

export type EventListItem = {
  id: string;
  title: string;
  eventType: string | null;
  format: EventFormat;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  isPublished: boolean;
  createdAt: string | null;
  registrationCount: number;
};

export type EventDetail = {
  id: string;
  title: string;
  eventType: string | null;
  format: EventFormat;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  onlineUrl: string | null;
  description: string | null;
  capacity: number | null;
  applicationDeadline: string | null;
  targetGraduationYear: number | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function getCompanyMembership(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    companyId: data.company_id,
    role: (data.role as string) ?? "member",
  };
}

export async function listEvents(companyId: string): Promise<EventListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, event_type, format, starts_at, ends_at, location, capacity, is_published, created_at",
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("starts_at", { ascending: false });

  if (error || !data) return [];

  // 参加登録数を取得
  const eventIds = data.map((e) => e.id);
  const { data: regData } = await supabase
    .from("event_registrations")
    .select("event_id")
    .in("event_id", eventIds.length > 0 ? eventIds : ["__none__"]);

  const regCountMap = new Map<string, number>();
  for (const reg of regData ?? []) {
    regCountMap.set(reg.event_id, (regCountMap.get(reg.event_id) ?? 0) + 1);
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    format: row.format as EventFormat,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    capacity: row.capacity,
    isPublished: row.is_published ?? false,
    createdAt: row.created_at,
    registrationCount: regCountMap.get(row.id) ?? 0,
  }));
}

export async function getEventById(
  eventId: string,
  companyId: string,
): Promise<EventDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    eventType: data.event_type,
    format: data.format as EventFormat,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    location: data.location,
    onlineUrl: data.online_url,
    description: data.description,
    capacity: data.capacity,
    applicationDeadline: data.application_deadline,
    targetGraduationYear: data.target_graduation_year,
    isPublished: data.is_published ?? false,
    publishedAt: data.published_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
