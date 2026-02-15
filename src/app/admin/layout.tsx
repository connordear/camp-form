import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
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

  const userRole = session.user.role ?? "user";
  const allowedRoles = ["admin", "hcp", "staff"];
  if (!allowedRoles.includes(userRole)) {
    redirect("/");
  }

  const availableYears = await getAvailableYears();

  return (
    <div className="flex min-h-screen">
      <AdminNav availableYears={availableYears} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
