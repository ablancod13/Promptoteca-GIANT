import { LibraryClient } from "@/components/LibraryClient";
import { listPrompts } from "@/lib/repository";

export default async function LibraryPage() {
  const prompts = await listPrompts();

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <span className="eyebrow">Espacio privado</span>
          <h1>Biblioteca personal</h1>
          <p className="lead">Tus favoritos, carpetas, notas privadas y versiones personalizadas.</p>
        </div>
      </div>
      <LibraryClient prompts={prompts} />
    </main>
  );
}
