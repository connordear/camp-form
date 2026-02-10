"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MessagePageProps {
  type: "success" | "error";
  title: string;
  description: string;
  redirectUrl?: string;
  redirectDelaySeconds?: number;
}

export default function MessagePage({
  type,
  title,
  description,
  redirectUrl,
  redirectDelaySeconds = 5,
}: MessagePageProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(redirectDelaySeconds);

  useEffect(() => {
    if (!redirectUrl) return;

    if (countdown <= 0) {
      router.push(redirectUrl);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, redirectUrl, router]);

  const Icon = type === "success" ? CheckCircle2 : XCircle;
  const bgColor =
    type === "success"
      ? "bg-green-100 dark:bg-green-900"
      : "bg-red-100 dark:bg-red-900";
  const iconColor =
    type === "success"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${bgColor}`}
          >
            <Icon className={`h-10 w-10 ${iconColor}`} />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {redirectUrl && (
          <CardContent>
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Redirecting in {countdown} second
                {countdown !== 1 ? "s" : ""}...
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
