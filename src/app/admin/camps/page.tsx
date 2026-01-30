import { CampsList } from "@/components/admin/camps-list";
import { getCampsForYear } from "@/lib/services/camp-service";

interface CampsPageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function CampsPage({ searchParams }: CampsPageProps) {
  const params = await searchParams;
  const yearParam = params.year;
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  // Validate year
  const validYear =
    !isNaN(year) && year >= 2000 ? year : new Date().getFullYear();

  const camps = await getCampsForYear(validYear);

  return <CampsList camps={camps} year={validYear} />;
}
