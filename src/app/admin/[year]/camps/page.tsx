import { adminPage } from "@/lib/auth-helpers";
import { parseYearParam } from "../utils";
import { getCampsForAdmin } from "./actions";
import { CampsList } from "./components/camps-list";

interface CampsYearPageProps {
  params: Promise<{ year: string }>;
}

async function CampsYearPage({ params }: CampsYearPageProps) {
  const { year: yearParam } = await params;

  const validYear = parseYearParam(yearParam);

  const camps = await getCampsForAdmin(validYear);

  return <CampsList camps={camps} year={validYear} />;
}

export default adminPage(CampsYearPage);
