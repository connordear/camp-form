import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function NavSignedIn() {
  const clerkUser = await currentUser();
  const role = clerkUser?.publicMetadata.role as string;
  return (
    <header className="flex justify-between items-center p-4 gap-4 h-16 w-full">
      <NavigationMenu>
        <NavigationMenuList className="flex gap-4">
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link href="/">Home</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <div className="flex gap-4 items-center">
        <ThemeToggle />
        {role === "admin" && <Link href="/admin">Admin</Link>}
        <UserButton />
      </div>
    </header>
  );
}
