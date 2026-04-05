import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { user } = session;

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, image: user.image }}
    >
      {children}
    </DashboardShell>
  );
}
