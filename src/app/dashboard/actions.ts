'use server'

import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { Camper } from "@/lib/types/camper-types";
import { CampFormUser } from "@/lib/types/user-types";
import { User } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

async function getUserByClerkId(clerkId: string) {
	return await db.query.users.findFirst({
		where: eq(users.clerkId, clerkId)
	})
}


export async function getUser(clerkUser: User) {
	// check if the user exists
	const user = await getUserByClerkId(clerkUser.id);

	if (!user) {
		// add them to the db
		await db.insert(users).values({
			clerkId: clerkUser.id,
			email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
		})
		return getUserByClerkId(clerkUser.id)
	}
	return user;
}

export async function getRegistrationsForUser(clerkId: string): Promise<CampFormUser | undefined> {
	return await db.query.users.findFirst({
		where: eq(users.clerkId, clerkId),
		with: {
			campers: {
				with: { registrations: true }
			}
		}
	})
}


