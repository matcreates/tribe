import { auth } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { getSentEmailsByTribeId, getTribeByUserId } from "@/lib/db";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/lib/theme";

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

  const user = {
    name: tribe?.owner_name || session.user.name || "User",
    avatar: tribe?.owner_avatar || null,
  };

  return (
    <ThemeProvider>
      <Shell 
        sentEmails={sentEmails.map(e => ({ id: e.id, subject: e.subject }))}
        user={user}
      >
        {children}
      </Shell>
    </ThemeProvider>
  );
}
