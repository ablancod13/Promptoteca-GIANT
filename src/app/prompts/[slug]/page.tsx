import { notFound } from "next/navigation";
import { PromptDetailClient } from "@/components/PromptDetailClient";
import { getPromptBySlug } from "@/lib/repository";

export default async function PromptDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prompt = await getPromptBySlug(slug);

  if (!prompt) notFound();

  return (
    <main className="page">
      <PromptDetailClient prompt={prompt} />
    </main>
  );
}
