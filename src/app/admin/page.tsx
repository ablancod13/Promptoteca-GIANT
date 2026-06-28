import { Database, KeyRound, ServerCog, ShieldCheck } from "lucide-react";

export default function AdminPage() {
  return (
    <main className="page">
      <div className="section-head">
        <div>
          <span className="eyebrow">Administración</span>
          <h1>Panel técnico</h1>
          <p className="lead">Checklist de despliegue para pasar de modo local a Supabase y OpenAI.</p>
        </div>
      </div>
      <div className="grid two">
        <section className="side-panel stack">
          <span className="badge teal">
            <Database size={14} /> Supabase
          </span>
          <h2>Base de datos</h2>
          <p className="muted">Aplicar migraciones de `supabase/migrations`, activar RLS y cargar `supabase/seed.sql`.</p>
        </section>
        <section className="side-panel stack">
          <span className="badge blue">
            <KeyRound size={14} /> Variables
          </span>
          <h2>Entorno</h2>
          <p className="muted">Configurar URL, anon key, service role solo servidor, OpenAI key y región si aplica.</p>
        </section>
        <section className="side-panel stack">
          <span className="badge amber">
            <ServerCog size={14} /> Embeddings
          </span>
          <h2>Búsqueda semántica</h2>
          <p className="muted">Generar embeddings para prompts publicados y usar RPC `match_prompts_semantic` con pgvector.</p>
        </section>
        <section className="side-panel stack">
          <span className="badge rose">
            <ShieldCheck size={14} /> Legal
          </span>
          <h2>Apertura pública</h2>
          <p className="muted">Revisar términos, privacidad, consentimiento de investigación y política de datos antes de producción.</p>
        </section>
      </div>
    </main>
  );
}
