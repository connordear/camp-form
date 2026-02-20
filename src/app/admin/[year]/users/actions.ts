"use server";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { adminAction } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { campers, registrations, user } from "@/lib/data/schema";
import type { User, UserRole } from "./schema";

export interface GetUsersParams {
  year: number;
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export interface GetUsersResult {
  users: User[];
  totalCount: number;
  totalPages: number;
}

export const getUsersForAdmin = adminAction(
  async (params: GetUsersParams): Promise<GetUsersResult> => {
    const { year, search, role, page = 1, pageSize = 10 } = params;

    const conditions = [];

    if (role && role !== "all") {
      conditions.push(eq(user.role, role as UserRole));
    }

    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      conditions.push(
        or(ilike(user.name, searchPattern), ilike(user.email, searchPattern)),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const usersWithCount = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        registrationCount: sql<number>`COALESCE((
          SELECT COUNT(*) 
          FROM ${registrations} r
          JOIN ${campers} c ON r.camper_id = c.id
          WHERE c.user_id = "user"."id" AND r.camp_year = ${year}
        ), 0)`.as("registrationCount"),
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ total }] = await db
      .select({ total: count() })
      .from(user)
      .where(whereClause);

    const totalCount = total;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      users: usersWithCount as User[],
      totalCount,
      totalPages,
    };
  },
);

export interface UpdateUserRoleParams {
  userId: string;
  newRole: UserRole;
  confirmedName: string;
}

export interface UpdateUserRoleResult {
  success: boolean;
  error?: string;
}

export const updateUserRole = adminAction(
  async (params: UpdateUserRoleParams): Promise<UpdateUserRoleResult> => {
    const { userId, newRole, confirmedName } = params;

    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: {
        id: true,
        name: true,
      },
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    if (targetUser.name !== confirmedName) {
      return {
        success: false,
        error: "Name confirmation does not match",
      };
    }

    await db
      .update(user)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(user.id, userId));

    return { success: true };
  },
);
