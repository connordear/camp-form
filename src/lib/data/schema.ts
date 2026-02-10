import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
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
