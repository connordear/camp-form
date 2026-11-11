// Accounts created by `bun run db:seed:users`.
export const USERS = {
  admin: { email: "admin@test.com", password: "admin123" },
  hcp: { email: "hcp@test.com", password: "hcp123" },
  staff: { email: "staff@test.com", password: "staff123" },
  user: { email: "user@test.com", password: "user123" },
} as const;

export type Role = keyof typeof USERS;

export const authFile = (role: Role) => `e2e/.auth/${role}.json`;
