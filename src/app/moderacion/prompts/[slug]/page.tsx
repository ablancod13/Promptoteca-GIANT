import { notFound } from "next/navigation";
import { PromptEditForm } from "@/components/PromptEditForm";
import { getPromptBySlug } from "@/lib/repository";

export default async function ModeratePromptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prompt = await getPromptBySlug(slug);

  if (!prompt) notFound();

  return (
    <main className="page page-narrow">
      <PromptEditForm prompt={prompt} moderation />
    </main>
  );
}
