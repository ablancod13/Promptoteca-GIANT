import { PromptExplorer } from "@/components/PromptExplorer";
import { getCategorySummary, getPromptsByCategory, listPrompts } from "@/lib/repository";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = decodeURIComponent(slug);
  const [categoryPrompts, allPrompts, categories] = await Promise.all([
    getPromptsByCategory(category),
    listPrompts(),
    getCategorySummary()
  ]);

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <span className="eyebrow">Categoría</span>
          <h1>{category}</h1>
          <p className="lead">{categoryPrompts.length} prompts encontrados en esta categoría o como categoría secundaria.</p>
        </div>
      </div>
      <PromptExplorer prompts={allPrompts} categories={categories.map((item) => item.name)} initialCategory={category} />
    </main>
  );
}
