import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-helpers";
import { parseYearParam } from "../utils";
import { getCampsForAdmin } from "./actions";
import { CampsList } from "./components/camps-list";

interface CampsYearPageProps {
  params: Promise<{ year: string }>;
}

export default async function CampsYearPage({ params }: CampsYearPageProps) {
  // Admin-only access check
  const session = await getSession();
  if (session?.user.role !== "admin") {
    redirect("/");
  }

  const { year: yearParam } = await params;

  // Parse year from path param
  const validYear = parseYearParam(yearParam);

  // Fetch camps for the admin (includes admin check)
  const camps = await getCampsForAdmin(validYear);

  return <CampsList camps={camps} year={validYear} />;
}
