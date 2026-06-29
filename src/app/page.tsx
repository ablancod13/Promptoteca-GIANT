import Link from "next/link";
import { ArrowRight, Award, BookOpen, Heart, Sparkles, TrendingUp, UsersRound } from "lucide-react";
import { AboutContentClient } from "@/components/AboutContentClient";
import { HomeRankingGrid } from "@/components/HomeRankingGrid";
import { MetricStrip } from "@/components/MetricStrip";
import { getAboutContent } from "@/lib/about-repository";
import { getCategorySummary, getHomeStats, listPrompts } from "@/lib/repository";

export default async function HomePage() {
  const [stats, categories, prompts, aboutContent] = await Promise.all([
    getHomeStats(),
    getCategorySummary(),
    listPrompts(),
    getAboutContent()
  ]);

  return (
    <main className="page">
      <section className="hero">
        <div className="stack">
          <span className="eyebrow">Promptoteca GIANT</span>
          <h1>Tu biblioteca de prompts listos para usar.</h1>
          <p className="lead">
            Consulta, adapta y guarda prompts útiles para investigación, docencia, laboratorio, PROA, productividad en el
            laboratorio y todo lo que necesitas en Enfermedades Infecciosas y Microbiología Clínica.
          </p>
          <div className="action-row">
            <Link className="button primary" href="/prompts">
              <BookOpen size={17} /> Explorar prompts
            </Link>
            <Link className="button accent" href="/subir">
              <Sparkles size={17} /> Compartir prompt
            </Link>
          </div>
        </div>
        <div className="side-panel stack">
          <span className="badge teal">Comunidad GIANT-SEIMC</span>
          <h2>Prompts curados por especialistas</h2>
          <p className="muted">Una biblioteca viva: los mejores aportes ganan visibilidad, puntos y reconocimiento.</p>
          <div className="progress-bar">
            <span style={{ width: "72%" }} />
          </div>
          <span className="muted">Minimalista, colaborativa y pensada para uso profesional.</span>
        </div>
      </section>

      <section className="section">
        <MetricStrip
          metrics={[
            { label: "Prompts publicados", value: stats.totalPrompts },
            { label: "Validados GIANT", value: stats.validatedByGiant },
            { label: "Usos registrados", value: stats.totalCopies },
            { label: "Favoritos guardados", value: stats.totalFavorites }
          ]}
        />
      </section>

      <AboutContentClient content={aboutContent} variant="home" />

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Cómo funciona</span>
            <h2>Una biblioteca que mejora con cada contribución</h2>
          </div>
        </div>
        <div className="grid four feature-grid">
          <Link className="side-panel stack" href="/prompts">
            <BookOpen size={24} />
            <h3>Encuentra</h3>
            <p className="muted">Busca prompts por categoría, herramienta, idioma o necesidad clínica.</p>
          </Link>
          <Link className="side-panel stack" href="/subir">
            <UsersRound size={24} />
            <h3>Contribuye</h3>
            <p className="muted">Comparte prompts útiles y recibe reconocimiento por su impacto real.</p>
          </Link>
          <Link className="side-panel stack" href="/perfil">
            <Award size={24} />
            <h3>Progresa</h3>
            <p className="muted">Gana experiencia, badges y visibilidad dentro de la comunidad.</p>
          </Link>
          <Link className="side-panel stack" href="/perfil">
            <Heart size={24} />
            <h3>Reconocimiento</h3>
            <p className="muted">Los mejores contribuidores podrán acceder a privilegios y premios futuros.</p>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Exploración</span>
            <h2>Categorías activas</h2>
          </div>
          <Link className="button secondary" href="/prompts">
            Ver todo <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid three">
          {categories.slice(0, 9).map((category) => (
            <Link className="card side-panel stack" href={`/categorias/${encodeURIComponent(category.name)}`} key={category.name}>
              <span className="badge teal">{category.count} prompts</span>
              <h3>{category.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Comunidad</span>
            <h2>Top prompts de la semana</h2>
          </div>
          <span className="badge">
            <TrendingUp size={14} /> Ranking por likes
          </span>
        </div>
        <HomeRankingGrid prompts={prompts} />
      </section>
    </main>
  );
}
