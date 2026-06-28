import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LegalDocument } from "@/components/LegalDocument";

export default function PrivacyPage() {
  const content = readFileSync(join(process.cwd(), "src/content/legal/privacidad.md"), "utf8");

  return (
    <main className="page page-narrow">
      <LegalDocument content={content} />
    </main>
  );
}
