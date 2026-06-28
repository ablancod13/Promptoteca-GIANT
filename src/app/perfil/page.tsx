import { ProfileClient } from "@/components/ProfileClient";
import { listPrompts } from "@/lib/repository";

export default async function ProfilePage() {
  const prompts = await listPrompts();

  return (
    <main className="page">
      <ProfileClient prompts={prompts} />
    </main>
  );
}
