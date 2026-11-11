import { adminPage } from "@/lib/auth-helpers";
import { getCampgroundSettings } from "@/lib/services/campground-service";
import { SettingsForm } from "./components/settings-form";

async function CampgroundSettingsPage() {
  const settings = await getCampgroundSettings();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Campground settings</h1>
        <p className="text-muted-foreground">
          Booking season, stay limits and cancellation policy. Changes to the
          cancellation policy apply to new bookings only; existing bookings keep
          the terms they were booked under.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}

export default adminPage(CampgroundSettingsPage);
