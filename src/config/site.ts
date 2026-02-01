/**
 * Site configuration - loaded from environment variables
 *
 * Future: This can be extended to load from database for admin-editable branding
 * by creating a getSiteConfig() async function that checks DB first, falls back to env vars
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Camp Registration",
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE ?? "Register for camp today",
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? "Camp registration portal",
  // Future additions:
  // logoUrl: process.env.NEXT_PUBLIC_LOGO_URL,
  // primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR,
};
