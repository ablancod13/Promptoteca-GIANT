import { AboutContentClient } from "@/components/AboutContentClient";
import { getAboutContent } from "@/lib/about-repository";

export default async function AboutPage() {
  const content = await getAboutContent();

  return (
    <main className="page">
      <AboutContentClient content={content} />
    </main>
  );
}
