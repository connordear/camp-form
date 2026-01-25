"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import NavLink from "./nav-link";

const navItems = [
  { href: "/registration/overview", label: "Overview" },
  { href: "/registration/camper", label: "Camper Info" },
  { href: "/registration/camp", label: "Camp Info" },
  { href: "/registration/medical-info", label: "Medical Info" },
  { href: "/registration/emergency-contact", label: "Emergency Contacts" },
  { href: "/registration/checkout", label: "Payment" },
];

export default function RegistrationNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const currentItem = navItems.find((item) => item.href === pathname);

  if (isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full max-w-xs justify-between">
            {currentItem?.label ?? "Navigate to..."}
            <ChevronDownIcon className="size-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          {navItems.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={pathname === item.href ? "font-medium" : ""}
              >
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <ButtonGroup>
      {navItems.map((item) => (
        <NavLink key={item.href} href={item.href}>
          {item.label}
        </NavLink>
      ))}
    </ButtonGroup>
  );
}
