import { redirect } from "next/navigation";
import { type AdminPanelRole, getSession } from "@/lib/auth-helpers";
import { getAvailableYears } from "@/lib/services/camp-service";
import { AdminNav } from "./components/admin-nav";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const availableYears = await getAvailableYears();

  return (
    <div className="flex min-h-screen">
      <AdminNav
        availableYears={availableYears}
        userRole={session.user.role as AdminPanelRole}
      />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
