// Where to send someone after they sign in or sign up. Kept free of server
// imports so the proxy, client pages and unit tests can all use it.

export const DEFAULT_AFTER_SIGN_IN = "/registration/overview";

/**
 * Returns `param` if it is a safe same-site path, otherwise `fallback`.
 *
 * Only relative paths that start with a single "/" are accepted. "//host",
 * "/\host" and anything with a scheme ("https:", "javascript:") are rejected,
 * because browsers treat them as links to another site.
 */
export function getSafeRedirect(
  param: string | null | undefined,
  fallback: string = DEFAULT_AFTER_SIGN_IN,
): string {
  if (typeof param !== "string" || param.length === 0) return fallback;
  if (!param.startsWith("/")) return fallback;
  // Browsers treat a backslash like a slash, so "/\evil.com" is "//evil.com".
  if (param[1] === "/" || param[1] === "\\") return fallback;
  // Control characters (tabs, newlines) are stripped by browsers and can hide
  // a second slash, e.g. "/\t/evil.com".
  // biome-ignore lint/suspicious/noControlCharactersInRegex: that is the point
  if (/[\u0000-\u001f\u007f]/.test(param)) return fallback;

  // Final check: resolving against a dummy origin must stay on that origin.
  try {
    const base = "http://same-origin.invalid";
    const url = new URL(param, base);
    if (url.origin !== base) return fallback;
  } catch {
    return fallback;
  }
  return param;
}

/** A sign-in or sign-up link that returns to `destination` afterwards. */
export function authPathWithRedirect(
  page: "/sign-in" | "/sign-up",
  destination: string | null | undefined,
): string {
  const safe = getSafeRedirect(destination, "");
  if (!safe) return page;
  return `${page}?redirect=${encodeURIComponent(safe)}`;
}
