import { UserButton } from "@clerk/nextjs";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

type NavSignedInProps = {
	role: string
}

export default function NavSignedIn({ role }: NavSignedInProps) {
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
				{role === "admin" && (
					<Button>
						Admin
					</Button>
				)}
				<UserButton />
			</div>
		</header>
	)
}

