"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PromptContribution {
  id: string;
  slug: string;
  title: string;
  summary: string;
  reviewStatus: string;
  validatedByGiant: boolean;
  experimental: boolean;
  copies: number;
  favorites: number;
  likes: number;
  createdAt: string;
}

export async function listMyPromptContributionsAction(): Promise<PromptContribution[]> {
  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) return [];

  const { data: authData } = await server.auth.getUser();
  if (!authData.user) return [];

  const { data, error } = await admin
    .from("prompts")
    .select("id,slug,title,summary,review_status,validated_by_giant,experimental,copies_count,favorites_count,likes_count,created_at")
    .eq("author_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: String(row.summary),
    reviewStatus: String(row.review_status ?? "pending"),
    validatedByGiant: Boolean(row.validated_by_giant),
    experimental: Boolean(row.experimental),
    copies: Number(row.copies_count ?? 0),
    favorites: Number(row.favorites_count ?? 0),
    likes: Number(row.likes_count ?? 0),
    createdAt: String(row.created_at ?? "")
  }));
}
