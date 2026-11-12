import { CampgroundTabs } from "./campground-tabs";

export default function CampgroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 md:flex md:gap-4 md:pt-0">
      <CampgroundTabs />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
