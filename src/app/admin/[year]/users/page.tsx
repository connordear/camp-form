import { adminPage } from "@/lib/auth-helpers";
import { parseYearParam } from "../utils";
import { getUsersForAdmin } from "./actions";
import { UsersList } from "./components/users-list";

interface UsersYearPageProps {
  params: Promise<{ year: string }>;
  searchParams: Promise<{
    search?: string;
    role?: string;
    page?: string;
  }>;
}

async function UsersYearPage({ params, searchParams }: UsersYearPageProps) {
  const { year: yearParam } = await params;
  const searchParamsData = await searchParams;

  const validYear = parseYearParam(yearParam);

  const search = searchParamsData.search || "";
  const role = searchParamsData.role || "all";
  const page = parseInt(searchParamsData.page || "1", 10);
  const validPage = Number.isNaN(page) || page < 1 ? 1 : page;

  const { users, totalCount, totalPages } = await getUsersForAdmin({
    year: validYear,
    search,
    role,
    page: validPage,
    pageSize: 10,
  });

  return (
    <UsersList
      users={users}
      year={validYear}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={validPage}
      currentSearch={search}
      currentRole={role}
    />
  );
}

export default adminPage(UsersYearPage);
