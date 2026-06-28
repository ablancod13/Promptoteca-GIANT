import { DeveloperPanel } from "@/components/DeveloperPanel";

export default function DeveloperPage() {
  return (
    <main className="page">
      <div className="section-head">
        <div>
          <span className="eyebrow">Desarrollador</span>
          <h1>Control avanzado</h1>
          <p className="lead">Usuarios, bloqueos temporales y ajustes de puntos.</p>
        </div>
      </div>
      <DeveloperPanel />
    </main>
  );
}
