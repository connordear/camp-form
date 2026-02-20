import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { user } from "@/lib/data/schema";

const baseUserSchema = createSelectSchema(user);

export const userSchema = baseUserSchema.pick({
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
});

export type User = z.infer<typeof userSchema> & {
  registrationCount: number;
};

export type UserRole = "user" | "staff" | "hcp" | "admin";

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "staff", label: "Staff" },
  { value: "hcp", label: "HCP" },
  { value: "admin", label: "Admin" },
];
