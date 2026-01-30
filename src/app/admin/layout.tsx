import { AdminNav } from "@/components/admin/admin-nav";
import { getAvailableYears } from "@/lib/services/camp-service";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const availableYears = await getAvailableYears();

  return (
    <div className="flex min-h-screen">
      <AdminNav availableYears={availableYears} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
