import RegistrationNav from "@/components/nav/registration-nav";

export default function RegistrationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <RegistrationNav />
      <div className="flex-1 w-full pb-4 relative mt-3">{children}</div>
    </div>
  );
}
