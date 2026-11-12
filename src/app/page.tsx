import { TentIcon, UsersIcon } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { formatStayRange } from "@/lib/campground/booking";
import {
  getUpcomingCampYear,
  getUserCampgroundStatus,
  getUserCampStatus,
  type UserCampgroundStatus,
  type UserCampStatus,
} from "@/lib/services/home-service";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function campStatus(status: UserCampStatus): string | null {
  if (status.camperCount === 0) return null;
  const parts = [plural(status.camperCount, "camper", "campers")];
  if (status.registeredCount > 0) {
    parts.push(`${status.registeredCount} registered for ${status.year}`);
  }
  if (status.inProgressCount > 0) {
    parts.push(`${status.inProgressCount} not paid yet`);
  }
  return parts.join(" · ");
}

function campgroundStatus(status: UserCampgroundStatus): string | null {
  if (!status.next) return null;
  const { siteName, checkIn, checkOut } = status.next;
  const more =
    status.upcomingCount > 1 ? ` (+${status.upcomingCount - 1} more)` : "";
  return `Your next stay: ${formatStayRange(checkIn, checkOut)}, ${siteName}${more}`;
}

interface EntryCardProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  status: string | null;
  primary: { href: string; label: string };
}

/**
 * The whole card opens its action: the link's ::after covers the card.
 */
function EntryCard({
  icon: Icon,
  title,
  description,
  status,
  primary,
}: EntryCardProps) {
  return (
    <div className="group relative flex flex-col gap-6 rounded-xl border bg-card p-6 sm:p-8 shadow-sm transition-colors hover:border-foreground/40 hover:shadow-lg focus-within:border-foreground/40">
      {/* Camp green tile, cream icon: reads clearly in both themes. */}
      <span className="inline-flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground dark:ring-1 dark:ring-white/15">
        <Icon className="size-7" aria-hidden />
      </span>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
        {status && <p className="text-sm font-medium">{status}</p>}
      </div>
      <div className="mt-auto flex flex-col gap-2 sm:flex-row">
        {/* Camp green with white text. In dark mode a faint ring keeps the
            button's edge visible against the card. */}
        <Button
          size="lg"
          className="sm:flex-1 text-white dark:ring-1 dark:ring-white/20"
          asChild
        >
          <Link
            href={primary.href}
            className="after:absolute after:inset-0 after:rounded-xl"
          >
            {primary.label}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const campYear = await getUpcomingCampYear();
  const [myCamp, myCampground] = session
    ? await Promise.all([
        getUserCampStatus(session.user.id, campYear),
        getUserCampgroundStatus(session.user.id),
      ])
    : [null, null];

  const firstName = session?.user.name?.split(" ")[0];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center gap-10 p-4 py-10 md:p-8">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          {firstName ? `Welcome back, ${firstName}` : "Welcome"}
        </h1>
        <p className="text-lg text-muted-foreground">
          Register your campers for summer camp, or book a stay at our
          campground.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <EntryCard
          icon={UsersIcon}
          title="Summer camp"
          description="Register campers for summer programs, or look back at past registrations."
          status={myCamp ? campStatus(myCamp) : null}
          primary={{
            href: "/registration/overview",
            label: "Register campers",
          }}
        />
        <EntryCard
          icon={TentIcon}
          title="Campground"
          description="Book a stay at our campground, or check on the stays you've booked."
          status={myCampground ? campgroundStatus(myCampground) : null}
          primary={{ href: "/campground", label: "Book a stay" }}
        />
      </div>

      {!session && (
        <p className="text-center text-muted-foreground">
          You'll need an account to register or book.{" "}
          <Link href="/sign-up" className="underline hover:text-foreground">
            Create one
          </Link>{" "}
          or{" "}
          <Link href="/sign-in" className="underline hover:text-foreground">
            sign in
          </Link>
          .
        </p>
      )}
    </div>
  );
}
