import { expect, test as setup } from "@playwright/test";
import { authFile, type Role, USERS } from "./users";

// Sign in once per role through the better-auth API and save the cookies,
// so tests start already signed in.
for (const role of Object.keys(USERS) as Role[]) {
  setup(`sign in as ${role}`, async ({ request, baseURL }) => {
    const res = await request.post("/api/auth/sign-in/email", {
      data: USERS[role],
      headers: { origin: baseURL ?? "" },
    });
    expect(res.ok(), `sign-in failed for ${role}: ${await res.text()}`).toBe(
      true,
    );
    await request.storageState({ path: authFile(role) });
  });
}
