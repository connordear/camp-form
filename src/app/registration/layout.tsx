import NavLink from "@/components/nav/nav-link";
import { ButtonGroup } from "@/components/ui/button-group";

export default function RegistrationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <ButtonGroup>
        <NavLink href="/registration/overview">Overview</NavLink>
        <NavLink href="/registration/camper">Camper Info</NavLink>
        <NavLink href="/registration/camp">Camp Info</NavLink>
        <NavLink href="/registration/medical-info">Medical Info</NavLink>
        <NavLink href="/registration/emergency-contact">
          Emergency Contacts
        </NavLink>
        <NavLink href="/registration/checkout">Payment</NavLink>
      </ButtonGroup>
      <div className="flex-1 w-full pb-4 relative">{children}</div>
    </div>
  );
}
