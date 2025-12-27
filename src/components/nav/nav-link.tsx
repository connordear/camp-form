"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  console.log(pathname, href, isActive);

  return (
    <Button
      variant={isActive ? "default" : "secondary"}
      asChild
      data-active={isActive}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}
