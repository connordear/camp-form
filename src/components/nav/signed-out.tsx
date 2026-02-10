import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function NavSignedOut() {
  return (
    <header className="flex justify-between items-center p-4 gap-4 h-16 w-full bg-background border-b">
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
        <Button variant="outline" asChild>
          <Link href="/sign-in">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </div>
    </header>
  );
}
