"use server";

import { revalidatePath } from "next/cache";
import { withUserErrors } from "@/lib/action-result";
import { adminAction } from "@/lib/auth-helpers";
import { sortTiers } from "@/lib/campground/policy";
import { db } from "@/lib/data/db";
import { campgroundSettings } from "@/lib/data/schema";
import { CAMPGROUND_SETTINGS_ID } from "@/lib/services/campground-service";
import { campgroundSettingsFormSchema } from "@/lib/types/campground-schemas";

export const updateCampgroundSettings = adminAction(
  withUserErrors(async (data: unknown) => {
    const validated = campgroundSettingsFormSchema.parse(data);
    const values = {
      ...validated,
      cancellationTiers: sortTiers(validated.cancellationTiers),
      policyText: validated.policyText?.trim() || null,
    };

    const [settings] = await db
      .insert(campgroundSettings)
      .values({ id: CAMPGROUND_SETTINGS_ID, ...values })
      .onConflictDoUpdate({ target: campgroundSettings.id, set: values })
      .returning();

    revalidatePath("/admin/campground/settings");
    revalidatePath("/campground");
    return settings;
  }),
);
