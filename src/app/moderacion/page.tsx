import { CategoryManager } from "@/components/CategoryManager";
import { ModerationGate } from "@/components/ModerationGate";
import { ModerationBoard } from "@/components/ModerationBoard";
import { listOpenReportsAction } from "@/app/moderacion/actions";
import { listTaxonomyAction } from "@/app/moderacion/taxonomy-actions";
import { listPrompts } from "@/lib/repository";

export default async function ModerationPage() {
  const [prompts, reports, taxonomy] = await Promise.all([
    listPrompts({ pendingOnly: true }),
    listOpenReportsAction(),
    listTaxonomyAction()
  ]);

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
          <CategoryManager initialState={taxonomy} />
          <ModerationBoard prompts={prompts} reports={reports} />
        </div>
      </main>
    </ModerationGate>
  );
}
