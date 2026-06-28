import { NextResponse } from "next/server";
import { createEmbedding } from "@/lib/openai/embeddings";
import { applyPromptFilters } from "@/lib/prompt-utils";
import { seedPrompts } from "@/lib/seed-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PromptFilters } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as PromptFilters & { semantic?: boolean };
  const query = body.query?.trim() ?? "";

  if (body.semantic && query) {
    const embedding = await createEmbedding(query);
    const supabase = createSupabaseAdminClient();

    if (embedding && supabase) {
      const { data, error } = await supabase.rpc("match_prompts_semantic", {
        query_embedding: embedding.embedding,
        match_count: 24,
        filter_category: body.category || null,
        filter_language: body.language || null
      });

      if (!error && data) {
        const bySlug = new Map(seedPrompts.map((prompt) => [prompt.slug, prompt]));
        const orderedPrompts = (data as Array<{ slug: string }>)
          .map((row) => bySlug.get(row.slug))
          .filter((prompt): prompt is (typeof seedPrompts)[number] => Boolean(prompt));

        if (orderedPrompts.length) {
          const filteredPrompts = orderedPrompts.filter(
            (prompt) => applyPromptFilters([prompt], { ...body, query: "", sort: undefined }).length > 0
          );
          return NextResponse.json({ mode: "semantic", prompts: filteredPrompts, model: embedding.model });
        }
      }
    }
  }

  return NextResponse.json({
    mode: "text-fallback",
    prompts: applyPromptFilters(seedPrompts, body),
    model: null
  });
}
