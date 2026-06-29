import { PromptExplorer } from "@/components/PromptExplorer";
import { getCategorySummary, listPrompts, listSubmissionOptions } from "@/lib/repository";

export default async function PromptsPage({
  searchParams
}: {
  searchParams?: Promise<{ autor?: string; author?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const [prompts, categories, options] = await Promise.all([listPrompts(), getCategorySummary(), listSubmissionOptions()]);

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <span className="eyebrow">Repositorio</span>
          <h1>Explorar prompts</h1>
          <p className="lead">Búsqueda + semántica + categoría</p>
        </div>
      </div>
      <PromptExplorer
        prompts={prompts}
        categories={categories.map((category) => category.name)}
        tools={options.tools}
        initialAuthor={params.autor ?? params.author ?? ""}
      />
    </main>
  );
}
