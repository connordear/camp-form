import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Re-export auth schema tables
export {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  verification,
} from "./auth-schema";

// Import auth tables for references
import { account, session, user } from "./auth-schema";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

const timestamps = {
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

export const camps = pgTable("camps", {
  id: id(),
  name: text().notNull(),
  description: text(),
  ...timestamps,
});

export const campYears = pgTable(
  "camp_years",
  {
    year: integer().notNull(),
    campId: text("camp_id")
      .references(() => camps.id)
      .notNull(),
    capacity: integer(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.campId, t.year] })],
);

export const campYearPrices = pgTable(
  "camp_year_prices",
  {
    id: id(),
    name: text().notNull(),
    campId: text("camp_id").notNull(),
    year: integer("year").notNull(),
    price: integer("base_price").notNull().default(0),
    isDayPrice: boolean("is_day_price").notNull().default(false),
  },
  (t) => [
    foreignKey({
      columns: [t.campId, t.year],
      foreignColumns: [campYears.campId, campYears.year],
    }),
    // create a unique composite index so it can be referenced by registrations
    unique().on(t.id, t.campId, t.year),
  ],
);

export const campers = pgTable("campers", {
  id: id(),
  userId: text("user_id")
    .references(() => user.id)
    .notNull(),
  addressId: text("address_id").references(() => addresses.id),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  dateOfBirth: date("date_of_birth").notNull().default("2000-01-01"),
  swimmingLevel: text("swimming_level").default(""),
  gender: text().default(""),
  hasBeenToCamp: boolean("has_been_to_camp").default(false),
  shirtSize: text("shirt_size").default(""),
  arePhotosAllowed: boolean("are_photos_allowed").notNull().default(false),
  dietaryRestrictions: text("dietary_restrictions"),
  ...timestamps,
});

export const addresses = pgTable(
  "addresses",
  {
    id: id(),
    userId: text("user_id")
      .references(() => user.id)
      .notNull(),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    city: text().notNull(),
    stateProv: text().notNull(),
    country: text().notNull(),
    postalZip: text().notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    ...timestamps,
  },
  (table) => {
    return {
      oneDefaultPerUser: uniqueIndex("one_default_per_user_index")
        .on(table.userId)
        .where(sql`${table.isDefault} = true`),
    };
  },
);

export const registrations = pgTable(
  "registrations",
  {
    id: id(),
    campId: text("camp_id").notNull(),
    campYear: integer("camp_year").notNull(),
    priceId: text("price_id").notNull(),
    camperId: text("camper_id")
      .references(() => campers.id, {
        onDelete: "cascade",
      })
      .notNull(),
    numDays: integer("num_days"),
    pricePaid: integer("price_paid"),
    status: text("status", {
      enum: ["draft", "registered", "refunded"],
    })
      .notNull()
      .default("draft"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeSessionId: text("stripe_session_id"),
    refundedAt: timestamp("refunded_at"),
    refundAmount: integer("refund_amount"),
    refundReason: text("refund_reason"),
    stripeRefundId: text("stripe_refund_id"),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      name: "fk_reg_camp_year",
      columns: [t.campId, t.campYear],
      foreignColumns: [campYears.campId, campYears.year],
    }).onDelete("cascade"),
    unique().on(t.camperId, t.campId, t.campYear),
    foreignKey({
      name: "fk_reg_price",
      columns: [t.priceId, t.campId, t.campYear],
      foreignColumns: [
        campYearPrices.id,
        campYearPrices.campId,
        campYearPrices.year,
      ],
    }).onDelete("restrict"),
  ],
);

export const registrationDetails = pgTable("registration_details", {
  registrationId: text("registration_id")
    .primaryKey()
    .references(() => registrations.id, { onDelete: "cascade" }),
  cabinRequest: text("cabin_request"),
  parentSignature: text("parent_signature"),
  additionalInfo: text("additional_info"),
});

export const OTC_MEDICATIONS_LIST = [
  "Acetaminophen (Tylenol)",
  "Ibuprofen (Advil)",
  "Antacids (Tums, Rolaids)",
  "Antihistamines (Benadryl)",
  "Antibiotic Cream",
  "Sting Relief/Cream",
  "Insect Repellent",
  "Sunscreen",
  "Sunburn Spray (Solarcaine)",
  "Sudafed (Decongestant)",
] as const;

export const emergencyContacts = pgTable("emergency_contacts", {
  id: id(),
  userId: text("user_id")
    .references(() => user.id)
    .notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  relationship: text("relationship").notNull(), // "parent", "guardian", "relative", "caregiver", "other"
  relationshipOther: text("relationship_other"), // For "other" type
  ...timestamps,
});

// schema.ts

export const camperEmergencyContacts = pgTable(
  "camper_emergency_contacts",
  {
    camperId: text("camper_id").notNull(),

    emergencyContactId: text("emergency_contact_id").notNull(),

    priority: integer("priority").notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.camperId, t.emergencyContactId] }),

    foreignKey({
      name: "fk_cec_camper", // "cec" = camper_emergency_contacts
      columns: [t.camperId],
      foreignColumns: [campers.id],
    }).onDelete("cascade"),

    foreignKey({
      name: "fk_cec_contact",
      columns: [t.emergencyContactId],
      foreignColumns: [emergencyContacts.id],
    }).onDelete("restrict"),
  ],
);

export const RELATIONSHIP_OPTIONS = [
  { value: "parent", name: "Parent" },
  { value: "guardian", name: "Guardian" },
  { value: "relative", name: "Relative" },
  { value: "caregiver", name: "Caregiver" },
  { value: "other", name: "Other" },
] as const;

// Discount condition types - determines when a discount applies
export const DISCOUNT_CONDITION_TYPES = [
  "deadline", // Applies if checkout is before a specific date
  "sibling", // Applies if multiple campers in same checkout
] as const;

export type DiscountConditionType = (typeof DISCOUNT_CONDITION_TYPES)[number];

// Discount types - how the discount is calculated
export const DISCOUNT_TYPES = ["percentage", "fixed"] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const discounts = pgTable("discounts", {
  id: id(),
  name: text().notNull(), // e.g., "Early Bird 2026", "Sibling Discount"
  description: text(), // Optional description for admin reference

  // Discount value
  type: text({ enum: DISCOUNT_TYPES }).notNull(), // "percentage" or "fixed"
  amount: integer().notNull(), // 10 for 10%, or 2500 for $25.00 off (in cents)

  // Stripe integration
  stripeCouponId: text("stripe_coupon_id"), // Synced Stripe coupon ID

  // Condition configuration
  conditionType: text("condition_type", {
    enum: DISCOUNT_CONDITION_TYPES,
  }).notNull(),
  deadlineDate: date("deadline_date"), // For deadline-based discounts
  minCampers: integer("min_campers"), // For sibling-based discounts (e.g., 2)

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  autoApply: boolean("auto_apply").default(false).notNull(),

  ...timestamps,
});

export const medicalInfo = pgTable("medical_info", {
  camperId: text("camper_id")
    .primaryKey()
    .references(() => campers.id, { onDelete: "cascade" }),

  healthCareNumber: text("health_care_number").notNull(),
  familyDoctor: text("family_doctor").notNull(),
  doctorPhone: text("doctor_phone").notNull(),

  height: text("height"),
  weight: text("weight"),

  hasAllergies: boolean("has_allergies").default(false).notNull(),
  allergiesDetails: text("allergies_details"),

  usesEpiPen: boolean("uses_epi_pen").default(false).notNull(),

  hasMedicationsAtCamp: boolean("has_medications_at_camp")
    .default(false)
    .notNull(),
  medicationsAtCampDetails: text("medications_at_camp_details"),

  hasMedicationsNotAtCamp: boolean("has_medications_not_at_camp")
    .default(false)
    .notNull(),
  medicationsNotAtCampDetails: text("medications_not_at_camp_details"),

  otcPermissions: jsonb("otc_permissions").$type<string[]>().default([]),

  hasMedicalConditions: boolean("has_medical_conditions")
    .default(false)
    .notNull(),
  medicalConditionsDetails: text("medical_conditions_details"),

  additionalInfo: text("additional_info"),
});

// Define Relations
export const medicalInfoRelations = relations(medicalInfo, ({ one }) => ({
  camper: one(campers, {
    fields: [medicalInfo.camperId],
    references: [campers.id],
  }),
}));

export const campYearRelations = relations(campYears, ({ one, many }) => ({
  camp: one(camps, {
    fields: [campYears.campId],
    references: [camps.id],
  }),
  registrations: many(registrations),
  prices: many(campYearPrices),
}));

export const campYearPricesRelations = relations(campYearPrices, ({ one }) => ({
  campYear: one(campYears, {
    fields: [campYearPrices.campId, campYearPrices.year],
    references: [campYears.campId, campYears.year],
  }),
}));

export const campRelations = relations(camps, ({ many }) => ({
  campYears: many(campYears),
}));

export const userRelations = relations(user, ({ many }) => ({
  // Auth relations
  sessions: many(session),
  accounts: many(account),
  // App relations
  campers: many(campers),
  addresses: many(addresses),
  emergencyContacts: many(emergencyContacts),
  bookings: many(bookings),
}));

export const addressesRelations = relations(addresses, ({ many, one }) => ({
  campers: many(campers),
  user: one(user, { fields: [addresses.userId], references: [user.id] }),
}));

export const campersRelations = relations(campers, ({ one, many }) => ({
  user: one(user, { fields: [campers.userId], references: [user.id] }),
  registrations: many(registrations),
  medicalInfo: one(medicalInfo, {
    fields: [campers.id],
    references: [medicalInfo.camperId],
  }),
  address: one(addresses, {
    fields: [campers.addressId],
    references: [addresses.id],
  }),
  emergencyContacts: many(camperEmergencyContacts),
}));

export const emergencyContactsRelations = relations(
  emergencyContacts,
  ({ one, many }) => ({
    user: one(user, {
      fields: [emergencyContacts.userId],
      references: [user.id],
    }),
    camperAssignments: many(camperEmergencyContacts),
  }),
);

export const camperEmergencyContactsRelations = relations(
  camperEmergencyContacts,
  ({ one }) => ({
    camper: one(campers, {
      fields: [camperEmergencyContacts.camperId],
      references: [campers.id],
    }),
    emergencyContact: one(emergencyContacts, {
      fields: [camperEmergencyContacts.emergencyContactId],
      references: [emergencyContacts.id],
    }),
  }),
);

export const registrationsRelations = relations(registrations, ({ one }) => ({
  camper: one(campers, {
    fields: [registrations.camperId],
    references: [campers.id],
  }),
  campYear: one(campYears, {
    fields: [registrations.campId, registrations.campYear],
    references: [campYears.campId, campYears.year],
  }),
  price: one(campYearPrices, {
    fields: [registrations.priceId],
    references: [campYearPrices.id],
  }),
  details: one(registrationDetails, {
    fields: [registrations.id],
    references: [registrationDetails.registrationId],
  }),
}));

// ---------------------------------------------------------------------------
// Campground
// ---------------------------------------------------------------------------

// What a site has. Placeholder list until the owner confirms; add keys here
// (and a label in CAMPSITE_FEATURE_LABELS) to offer a new feature.
export const CAMPSITE_FEATURES = [
  "power",
  "water",
  "sewer",
  "fire_pit",
  "picnic_table",
  "pull_through",
  "shade",
  "waterfront",
] as const;
export type CampsiteFeature = (typeof CAMPSITE_FEATURES)[number];

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "expired",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_SOURCES = ["online", "admin"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export type CancellationTier = { minDaysBefore: number; refundPercent: number };

export const DEFAULT_CANCELLATION_TIERS: CancellationTier[] = [
  { minDaysBefore: 7, refundPercent: 100 },
  { minDaysBefore: 1, refundPercent: 50 },
];

export const campsites = pgTable("campsites", {
  id: id(),
  name: text().notNull(),
  features: text()
    .array()
    .$type<CampsiteFeature[]>()
    .notNull()
    .default(sql`'{}'::text[]`),
  nightlyRate: integer("nightly_rate").notNull(), // cents, before tax
  maxOccupancy: integer("max_occupancy").notNull().default(6),
  description: text(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

// Single row, id fixed to "default".
export const campgroundSettings = pgTable("campground_settings", {
  id: text().primaryKey().default("default"),
  isBookingOpen: boolean("is_booking_open").notNull().default(false),
  seasonStart: date("season_start"), // first bookable night
  seasonEnd: date("season_end"), // last bookable check-out date
  minNights: integer("min_nights").notNull().default(1),
  maxNights: integer("max_nights").notNull().default(14),
  maxAdvanceDays: integer("max_advance_days").notNull().default(365),
  checkInTime: text("check_in_time").notNull().default("14:00"),
  checkOutTime: text("check_out_time").notNull().default("11:00"),
  cancellationTiers: jsonb("cancellation_tiers")
    .$type<CancellationTier[]>()
    .notNull()
    .default(DEFAULT_CANCELLATION_TIERS),
  policyText: text("policy_text"), // optional extra wording shown to guests
  ...timestamps,
});

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    siteId: text("site_id")
      .references(() => campsites.id, { onDelete: "restrict" })
      .notNull(),
    userId: text("user_id").references(() => user.id), // null for admin-entered phone bookings
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email"),
    guestPhone: text("guest_phone").notNull(),
    partySize: integer("party_size").notNull(),
    notes: text(),
    adminNotes: text("admin_notes"),
    checkIn: date("check_in").notNull(), // first night
    checkOut: date("check_out").notNull(), // morning of departure, exclusive
    status: text({ enum: BOOKING_STATUSES }).notNull().default("pending"),
    source: text({ enum: BOOKING_SOURCES }).notNull().default("online"),
    holdExpiresAt: timestamp("hold_expires_at"),
    subtotal: integer().notNull(), // sum of night prices, before tax
    pricePaid: integer("price_paid"), // Stripe amount_total, tax included
    paidOffline: boolean("paid_offline").notNull().default(false),
    cancellationTiers: jsonb("cancellation_tiers")
      .$type<CancellationTier[]>()
      .notNull(), // snapshot at booking time
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    cancelledAt: timestamp("cancelled_at"),
    cancelledBy: text("cancelled_by", { enum: ["guest", "admin"] }),
    refundAmount: integer("refund_amount"),
    stripeRefundId: text("stripe_refund_id"),
    ...timestamps,
  },
  (t) => [
    index().on(t.userId),
    index().on(t.siteId, t.checkIn),
    index().on(t.status),
  ],
);

// One row per site per occupied night. The primary key is what prevents double booking.
export const bookingNights = pgTable(
  "booking_nights",
  {
    siteId: text("site_id")
      .references(() => campsites.id, { onDelete: "restrict" })
      .notNull(),
    night: date().notNull(),
    bookingId: text("booking_id").references(() => bookings.id, {
      onDelete: "cascade",
    }),
    price: integer().notNull().default(0), // nightly rate charged for this night
    blockReason: text("block_reason"), // set when an admin blocks the night, bookingId null
  },
  (t) => [
    primaryKey({ columns: [t.siteId, t.night] }),
    index().on(t.bookingId),
  ],
);

export const campsitesRelations = relations(campsites, ({ many }) => ({
  bookings: many(bookings),
  nights: many(bookingNights),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  site: one(campsites, {
    fields: [bookings.siteId],
    references: [campsites.id],
  }),
  user: one(user, { fields: [bookings.userId], references: [user.id] }),
  nights: many(bookingNights),
}));

export const bookingNightsRelations = relations(bookingNights, ({ one }) => ({
  site: one(campsites, {
    fields: [bookingNights.siteId],
    references: [campsites.id],
  }),
  booking: one(bookings, {
    fields: [bookingNights.bookingId],
    references: [bookings.id],
  }),
}));
