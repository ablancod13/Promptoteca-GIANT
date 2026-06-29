import { SubmissionForm } from "@/components/SubmissionForm";
import { listSubmissionOptions } from "@/lib/repository";

export default async function SubmitPromptPage() {
  const options = await listSubmissionOptions();

  return (
    <main className="page page-narrow">
      <SubmissionForm initialCategories={options.categories} initialTools={options.tools} initialModels={options.models} />
    </main>
  );
}
