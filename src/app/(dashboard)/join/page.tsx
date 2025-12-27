import { getTribeSettings } from "@/lib/actions";
import { JoinPageClient } from "./client";

export default async function JoinPage() {
  const settings = await getTribeSettings();
  
  return <JoinPageClient settings={settings} />;
}
