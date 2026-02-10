import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If signed in, redirect to registration
  if (session) {
    redirect("/registration/overview");
  }

  // Show landing page for signed out users
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{siteConfig.name}</CardTitle>
          <CardDescription>{siteConfig.tagline}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button className="w-full" asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
