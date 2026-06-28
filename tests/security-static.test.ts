import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("security static checks", () => {
  it("does not expose service role key in public env example", () => {
    const envExample = readFileSync(join(root, ".env.example"), "utf8");

    expect(envExample).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(envExample).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
  });

  it("enables RLS on private user data tables", () => {
    const sql = readFileSync(join(root, "supabase", "migrations", "001_initial_schema.sql"), "utf8");

    for (const table of ["private_notes", "custom_prompt_versions", "favorites", "folders", "prompt_embeddings"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("keeps private user data out of OpenAI embedding code", () => {
    const embeddings = readFileSync(join(root, "src", "lib", "openai", "embeddings.ts"), "utf8");

    expect(embeddings).not.toContain("private_notes");
    expect(embeddings).not.toContain("custom_prompt_versions");
    expect(embeddings).not.toContain("profiles");
  });
});
