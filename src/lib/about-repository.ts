import { DEFAULT_ABOUT_CONTENT, type AboutContent, type AboutPerson } from "@/lib/about-content";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Row = Record<string, any>;

export async function getAboutContent(): Promise<AboutContent> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return DEFAULT_ABOUT_CONTENT;

  const [contentResult, peopleResult] = await Promise.all([
    supabase.from("about_content").select("*").eq("id", "main").maybeSingle(),
    supabase.from("about_people").select("*").eq("active", true).order("display_order", { ascending: true })
  ]);

  if (contentResult.error || peopleResult.error) return DEFAULT_ABOUT_CONTENT;

  const row = contentResult.data as Row | null;
  const people = (peopleResult.data ?? []).map(mapPersonRow);

  if (!row) {
    return {
      ...DEFAULT_ABOUT_CONTENT,
      people: people.length ? people : DEFAULT_ABOUT_CONTENT.people
    };
  }

  return {
    title: String(row.title ?? DEFAULT_ABOUT_CONTENT.title),
    intro: String(row.intro ?? DEFAULT_ABOUT_CONTENT.intro),
    composition: String(row.composition ?? DEFAULT_ABOUT_CONTENT.composition),
    creator: String(row.creator_note ?? DEFAULT_ABOUT_CONTENT.creator),
    people: people.length ? people : DEFAULT_ABOUT_CONTENT.people
  };
}

function mapPersonRow(row: Row): AboutPerson {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    role: String(row.role ?? ""),
    bio: String(row.bio ?? ""),
    photoUrl: row.photo_url ? String(row.photo_url) : undefined
  };
}
