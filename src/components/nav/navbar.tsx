"use client";

import * as React from "react";
import Link from "next/link";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

export type NavItem = {
  title: string;
  href?: string;
};

export type NavBarItem = NavItem & {
  dropdownOptions?: NavItem[];
};

function NavBarRoot({ children }: React.PropsWithChildren) {
  const isMobile = useIsMobile();
  return (
    <NavigationMenu viewport={isMobile}>
      <NavigationMenuList className="flex-wrap">{children}</NavigationMenuList>
    </NavigationMenu>
  );
}

function NavBarItem({ title, href, dropdownOptions }: NavBarItem) {
  return (
    <NavigationMenuItem className="hidden md:block">
      <NavigationMenuTrigger>
        <Link href={href ?? "#"}>{title}</Link>
      </NavigationMenuTrigger>
      {!!dropdownOptions && (
        <NavigationMenuContent>
          <ul className="grid w-[200px] gap-4">
            <li>
              {dropdownOptions?.map((opt) => (
                <NavigationMenuLink asChild>
                  <Link href={opt.href ?? "#"}>{opt.title}</Link>
                </NavigationMenuLink>
              ))}
            </li>
          </ul>
        </NavigationMenuContent>
      )}
    </NavigationMenuItem>
  );
}

const NavBar = {
  Root: NavBarRoot,
  Item: NavBarItem,
};

export default NavBar;
