import { SaveAndContinueButton } from "@/components/forms/save-and-continue-button";
import RegistrationNav from "@/components/nav/registration-nav";

export default function RegistrationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-2 items-center pt-2">
      <RegistrationNav />
      <div className="flex-1 w-full pb-20 relative mt-3 px-4">{children}</div>
      <SaveAndContinueButton />
    </div>
  );
}
