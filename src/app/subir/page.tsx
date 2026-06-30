import { SubmissionForm } from "@/components/SubmissionForm";
import { listPopularTags, listSubmissionOptions } from "@/lib/repository";

export default async function SubmitPromptPage() {
  const [options, tags] = await Promise.all([listSubmissionOptions(), listPopularTags()]);

  return (
    <main className="page page-narrow">
      <SubmissionForm
        initialCategories={options.categories}
        initialTools={options.tools}
        initialModels={options.models}
        initialModelOptions={options.modelOptions}
        popularTags={tags}
      />
    </main>
  );
}
