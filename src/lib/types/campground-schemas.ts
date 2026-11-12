import {
  ArrowRightLeft,
  Droplet,
  FlameKindling,
  type LucideIcon,
  PlugZap,
  Toilet,
  Trees,
  Utensils,
  Waves,
} from "lucide-react";
import { z } from "zod";
import { isDateString } from "@/lib/campground/dates";
import { validateTiers } from "@/lib/campground/policy";
import { CAMPSITE_FEATURES, type CampsiteFeature } from "@/lib/data/schema";

export const CAMPSITE_FEATURE_LABELS: Record<CampsiteFeature, string> = {
  power: "Power",
  water: "Water",
  sewer: "Sewer",
  fire_pit: "Fire pit",
  picnic_table: "Picnic table",
  pull_through: "Pull-through",
  shade: "Shade",
  waterfront: "Waterfront",
};

// Lucide has no picnic table icon, so Utensils stands in for it.
export const CAMPSITE_FEATURE_ICONS: Record<CampsiteFeature, LucideIcon> = {
  power: PlugZap,
  water: Droplet,
  sewer: Toilet,
  fire_pit: FlameKindling,
  picnic_table: Utensils,
  pull_through: ArrowRightLeft,
  shade: Trees,
  waterfront: Waves,
};

export const campsiteFormSchema = z.object({
  name: z.string().trim().min(1, "Site name is required"),
  features: z
    .array(z.enum(CAMPSITE_FEATURES))
    // Store each feature once, in catalogue order.
    .transform((list) => CAMPSITE_FEATURES.filter((f) => list.includes(f))),
  nightlyRate: z
    .number({ error: "Enter a rate in dollars, e.g. 45.00" })
    .int("Rate must be in whole cents")
    .min(0, "Rate cannot be negative"),
  maxOccupancy: z
    .number({ error: "Enter a number" })
    .int("Must be a whole number")
    .min(1, "At least 1 person"),
  description: z.string().nullable(),
  sortOrder: z.number({ error: "Enter a number" }).int(),
  isActive: z.boolean(),
});

export const campsiteUpdateSchema = campsiteFormSchema.extend({
  id: z.string().min(1),
});

export type CampsiteFormData = z.infer<typeof campsiteFormSchema>;
export type CampsiteUpdateData = z.infer<typeof campsiteUpdateSchema>;

const dateString = z
  .string()
  .refine(isDateString, "Must be a valid date (YYYY-MM-DD)");

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM, e.g. 14:00");

// Range and ordering rules live in validateTiers, applied below.
export const cancellationTierSchema = z.object({
  minDaysBefore: z.number({ error: "Days must be a number" }),
  refundPercent: z.number({ error: "Refund percentage must be a number" }),
});

export const campgroundSettingsFormSchema = z
  .object({
    isBookingOpen: z.boolean(),
    seasonStart: dateString.nullable(),
    seasonEnd: dateString.nullable(),
    minNights: z
      .number({ error: "Enter a number" })
      .int()
      .min(1, "At least 1 night"),
    maxNights: z
      .number({ error: "Enter a number" })
      .int()
      .min(1, "At least 1 night"),
    maxAdvanceDays: z
      .number({ error: "Enter a number" })
      .int()
      .min(1, "At least 1 day"),
    checkInTime: timeString,
    checkOutTime: timeString,
    cancellationTiers: z.array(cancellationTierSchema),
    policyText: z.string().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.maxNights < data.minNights) {
      ctx.addIssue({
        code: "custom",
        path: ["maxNights"],
        message: "Maximum stay must be at least the minimum stay",
      });
    }
    if (
      data.seasonStart &&
      data.seasonEnd &&
      data.seasonEnd <= data.seasonStart
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["seasonEnd"],
        message: "Season end must be after season start",
      });
    }
    for (const message of validateTiers(data.cancellationTiers)) {
      ctx.addIssue({ code: "custom", path: ["cancellationTiers"], message });
    }
  });

export type CampgroundSettingsFormData = z.infer<
  typeof campgroundSettingsFormSchema
>;

// Guest details for a new online booking. Stay and party-size rules that
// depend on settings or the site are checked by createHold.
export const bookingGuestSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(1, "Enter the name the booking is under")
    .max(100, "Keep the name under 100 characters"),
  guestPhone: z
    .string()
    .trim()
    .regex(
      /^[+()\-.\s\d]{7,25}$/,
      "Enter a phone number we can reach you at, e.g. 780-555-0123",
    )
    .refine(
      (v) => v.replace(/\D/g, "").length >= 7,
      "Enter a phone number we can reach you at, e.g. 780-555-0123",
    ),
  partySize: z
    .number({ error: "Enter the number of people" })
    .int("Must be a whole number")
    .min(1, "At least 1 person"),
  notes: z
    .string()
    .trim()
    .max(1000, "Keep notes under 1000 characters")
    .nullable()
    .transform((v) => (v ? v : null)),
});

export const bookingRequestSchema = bookingGuestSchema.extend({
  siteId: z.string().min(1),
  checkIn: dateString,
  checkOut: dateString,
});

export type BookingGuestData = z.input<typeof bookingGuestSchema>;
export type BookingRequestData = z.input<typeof bookingRequestSchema>;
