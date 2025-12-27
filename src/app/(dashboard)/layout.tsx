import { auth } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { getSentEmailsByTribeId, getTribeByUserId } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const tribe = await getTribeByUserId(session.user.id);
  const sentEmails = tribe ? await getSentEmailsByTribeId(tribe.id) : [];

  return (
    <Shell sentEmails={sentEmails.map(e => ({ id: e.id, subject: e.subject }))}>
      {children}
    </Shell>
  );
}
