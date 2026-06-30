"use server";

import { formatBadgeCriterion, parseBadgeCriterion, type BadgeCriterion } from "@/lib/badge-rules";
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

export interface EarnedBadgeView {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  criterionLabel: string;
  shareable: boolean;
  earnedAt: string;
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

export async function listMyEarnedBadgesAction(): Promise<EarnedBadgeView[]> {
  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) return [];

  const { data: authData } = await server.auth.getUser();
  if (!authData.user) return [];

  const { data: badges, error } = await admin
    .from("badges")
    .select("id,name,description,image_url,image_alt,criterion,shareable")
    .order("name", { ascending: true });

  if (error || !badges?.length) return [];

  const metrics = await getUserBadgeMetrics(admin, authData.user.id);
  const earned = badges
    .map((badge) => ({ badge, criterion: parseBadgeCriterion(badge.criterion) }))
    .filter(({ criterion }) => metricValue(metrics, criterion) >= criterion.threshold);

  if (earned.length) {
    await admin.from("user_badges").upsert(
      earned.map(({ badge }) => ({
        user_id: authData.user.id,
        badge_id: badge.id
      })),
      { onConflict: "user_id,badge_id" }
    );
  }

  const earnedIds = earned.map(({ badge }) => String(badge.id));
  const { data: earnedRows } = earnedIds.length
    ? await admin.from("user_badges").select("badge_id,earned_at").eq("user_id", authData.user.id).in("badge_id", earnedIds)
    : { data: [] };
  const earnedAtByBadge = new Map((earnedRows ?? []).map((row) => [String(row.badge_id), String(row.earned_at)]));

  return earned.map(({ badge, criterion }) => ({
    id: String(badge.id),
    name: String(badge.name ?? ""),
    description: String(badge.description ?? ""),
    imageUrl: String(badge.image_url ?? ""),
    imageAlt: String(badge.image_alt ?? ""),
    criterionLabel: formatBadgeCriterion(criterion),
    shareable: badge.shareable !== false,
    earnedAt: earnedAtByBadge.get(String(badge.id)) ?? new Date().toISOString()
  }));
}

async function getUserBadgeMetrics(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userId: string) {
  const [prompts, likesGiven, favoritesGiven, moderationsDone, reportsMade, validatedPrompts] = await Promise.all([
    admin.from("prompts").select("likes_count,favorites_count").eq("author_id", userId),
    countRows(admin, "likes", "user_id", userId),
    countRows(admin, "favorites", "user_id", userId),
    countRows(admin, "moderation_actions", "moderator_id", userId),
    countRows(admin, "reports", "reporter_id", userId),
    countRows(admin, "prompts", "author_id", userId, (query) => query.eq("validated_by_giant", true))
  ]);

  const promptRows = prompts.data ?? [];
  return {
    prompts_shared: promptRows.length,
    likes_given: likesGiven,
    likes_received: promptRows.reduce((sum, prompt) => sum + Number(prompt.likes_count ?? 0), 0),
    favorites_given: favoritesGiven,
    favorites_received: promptRows.reduce((sum, prompt) => sum + Number(prompt.favorites_count ?? 0), 0),
    moderations_done: moderationsDone,
    reports_made: reportsMade,
    giant_validations_received: validatedPrompts
  };
}

function metricValue(metrics: Awaited<ReturnType<typeof getUserBadgeMetrics>>, criterion: BadgeCriterion) {
  return Number(metrics[criterion.rule] ?? 0);
}

async function countRows(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  table: "likes" | "favorites" | "moderation_actions" | "reports" | "prompts",
  column: string,
  value: string,
  refine?: (query: any) => any
) {
  const baseQuery = admin.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  const query = refine ? refine(baseQuery) : baseQuery;
  const { count } = await query;
  return count ?? 0;
}
