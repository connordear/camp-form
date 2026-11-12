import { ZodError } from "zod";

/**
 * What a server action returns when it has messages meant for the person
 * using the app. Next.js replaces the message of an error thrown from a
 * server action with a generic one in production builds, so a message the
 * user should read has to be returned, not thrown.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** An error whose message is safe and useful to show to the user. */
export class UserError extends Error {}

/**
 * Wrap a server action so `UserError`s and validation errors come back as
 * `{ ok: false, error }`. Anything else is still thrown (and masked by Next).
 */
export function withUserErrors<T, R>(
  action: (data: T) => Promise<R>,
): (data: T) => Promise<ActionResult<R>> {
  return async (data: T) => {
    try {
      return { ok: true, data: await action(data) };
    } catch (err) {
      if (err instanceof UserError) {
        return { ok: false, error: err.message };
      }
      if (err instanceof ZodError) {
        return { ok: false, error: err.issues[0]?.message ?? "Invalid input" };
      }
      throw err;
    }
  };
}

/**
 * For actions that must always return a result: a `UserError` keeps its
 * message, anything else is logged and replaced with `fallback`.
 */
export function failure(
  err: unknown,
  fallback: string,
): { ok: false; error: string } {
  if (err instanceof UserError) return { ok: false, error: err.message };
  console.error(fallback, err);
  return { ok: false, error: fallback };
}
