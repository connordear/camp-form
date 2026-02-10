import { XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerificationErrorPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Link Expired</CardTitle>
          <CardDescription>
            This verification link has expired or is invalid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/sign-in">
            <Button>Go to Sign In</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
