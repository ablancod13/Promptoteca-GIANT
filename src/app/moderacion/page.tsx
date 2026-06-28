import { CategoryManager } from "@/components/CategoryManager";
import { ModerationGate } from "@/components/ModerationGate";
import { ModerationBoard } from "@/components/ModerationBoard";
import { INITIAL_CATEGORIES } from "@/lib/constants";
import { listPrompts } from "@/lib/repository";

export default async function ModerationPage() {
  const [prompts, allPrompts] = await Promise.all([listPrompts({ pendingOnly: true }), listPrompts()]);

  return (
    <ModerationGate>
      <main className="page">
        <div className="section-head">
          <div>
            <span className="eyebrow">Moderación GIANT</span>
            <h1>Cola de revisión</h1>
            <p className="lead">Revisa, edita, aprueba, oculta o valida prompts.</p>
          </div>
        </div>
        <div className="stack">
          <CategoryManager initialCategories={[...INITIAL_CATEGORIES].sort((a, b) => a.localeCompare(b, "es"))} />
          <ModerationBoard prompts={prompts} allPrompts={allPrompts} />
        </div>
      </main>
    </ModerationGate>
  );
}
