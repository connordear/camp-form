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

// Upper bounds keep every value well inside a Postgres int4 column, so a typo
// with extra digits is a form error and not a failed insert.
const MAX_NIGHTLY_RATE_CENTS = 10_000_000; // $100,000
const MAX_OCCUPANCY = 1000;
const MAX_SORT_ORDER = 1_000_000;
const MAX_STAY_NIGHTS = 365;
const MAX_ADVANCE_DAYS = 3650;

export const campsiteFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Site name is required")
    .max(100, "Site name is too long"),
  features: z
    .array(z.enum(CAMPSITE_FEATURES))
    // Store each feature once, in catalogue order.
    .transform((list) => CAMPSITE_FEATURES.filter((f) => list.includes(f))),
  nightlyRate: z
    .number({ error: "Enter a rate in dollars, e.g. 45.00" })
    .int("Rate must be in whole cents")
    .min(0, "Rate cannot be negative")
    .max(MAX_NIGHTLY_RATE_CENTS, "Rate is too high"),
  maxOccupancy: z
    .number({ error: "Enter a number" })
    .int("Must be a whole number")
    .min(1, "At least 1 person")
    .max(MAX_OCCUPANCY, `At most ${MAX_OCCUPANCY} people`),
  description: z.string().nullable(),
  sortOrder: z
    .number({ error: "Enter a number" })
    .int("Must be a whole number")
    .min(-MAX_SORT_ORDER, "Number is too low")
    .max(MAX_SORT_ORDER, "Number is too high"),
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
      .int("Must be a whole number")
      .min(1, "At least 1 night")
      .max(MAX_STAY_NIGHTS, `At most ${MAX_STAY_NIGHTS} nights`),
    maxNights: z
      .number({ error: "Enter a number" })
      .int("Must be a whole number")
      .min(1, "At least 1 night")
      .max(MAX_STAY_NIGHTS, `At most ${MAX_STAY_NIGHTS} nights`),
    maxAdvanceDays: z
      .number({ error: "Enter a number" })
      .int("Must be a whole number")
      .min(1, "At least 1 day")
      .max(MAX_ADVANCE_DAYS, `At most ${MAX_ADVANCE_DAYS} days`),
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

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `Keep ${label} under ${max} characters`)
    .nullable()
    .transform((v) => (v ? v : null));

const pickDate = (message: string) =>
  z.string().min(1, message).refine(isDateString, message);

// A booking the office takes by phone or email and is paid for offline.
export const adminBookingSchema = bookingGuestSchema
  .extend({
    siteId: z.string().min(1, "Pick a site"),
    checkIn: pickDate("Pick a check-in date"),
    checkOut: pickDate("Pick a check-out date"),
    guestEmail: z
      .string()
      .trim()
      .nullable()
      .transform((v) => (v ? v : null))
      .pipe(z.email("Enter a valid email, or leave it blank").nullable()),
    notes: optionalText(1000, "notes"),
    adminNotes: optionalText(1000, "office notes"),
    pricePaid: z
      .number({ error: "Enter the amount paid in dollars, e.g. 94.50" })
      .int("Enter dollars and cents, e.g. 94.50")
      .min(0, "Cannot be negative"),
    sendConfirmation: z.boolean(),
  })
  .refine((d) => !d.checkIn || !d.checkOut || d.checkOut > d.checkIn, {
    path: ["checkOut"],
    message: "Check-out must be after check-in",
  });

export type AdminBookingData = z.input<typeof adminBookingSchema>;

// Nights taken off sale. `lastNight` is inclusive, as people think of it.
export const blockNightsSchema = z
  .object({
    siteIds: z
      .array(z.string().min(1))
      .min(1, "Pick at least one site")
      .transform((ids) => [...new Set(ids)]),
    firstNight: pickDate("Pick the first night"),
    lastNight: pickDate("Pick the last night"),
    reason: z
      .string()
      .trim()
      .min(1, "Say why, e.g. repairs or staff use")
      .max(200, "Keep the reason under 200 characters"),
  })
  .refine((d) => !d.firstNight || !d.lastNight || d.lastNight >= d.firstNight, {
    path: ["lastNight"],
    message: "The last night cannot be before the first",
  });

export type BlockNightsData = z.input<typeof blockNightsSchema>;
