import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
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

export default async function Home() {
  const { userId } = await auth();

  // If signed in, redirect to registration
  if (userId) {
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
          <SignUpButton mode="modal">
            <Button className="w-full">Sign Up</Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button variant="outline" className="w-full">
              Sign In
            </Button>
          </SignInButton>
        </CardContent>
      </Card>
    </div>
  );
}
