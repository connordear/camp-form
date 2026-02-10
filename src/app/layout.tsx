import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import Script from "next/script";
import NavSignedIn from "@/components/nav/signed-in";
import NavSignedOut from "@/components/nav/signed-out";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { FormRegistryProvider } from "@/contexts/form-registry-context";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          async
          src={process.env.NEXT_PUBLIC_UMAMI_URL}
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_ID}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <nav className="sticky top-0 z-50">
            {session ? (
              <NavSignedIn initialSession={session} />
            ) : (
              <NavSignedOut />
            )}
          </nav>
          <main>
            <FormRegistryProvider>{children}</FormRegistryProvider>
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
