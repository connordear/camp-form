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

export const users = pgTable("users", {
  id: id(), // should be the clerk id
  email: text("email").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  ...timestamps,
});

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
    basePrice: integer("base_price").notNull().default(0),
    dayPrice: integer("day_price"),
    capacity: integer(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.campId, t.year] })],
);

export const campers = pgTable("campers", {
  id: id(),
  userId: text("user_id")
    .references(() => users.id)
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
      .references(() => users.id)
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
    campId: text("camp_id")
      .notNull()
      .references(() => camps.id, {
        onDelete: "restrict",
      }),
    campYear: integer("camp_year").notNull(),
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
      columns: [t.campId, t.campYear],
      foreignColumns: [campYears.campId, campYears.year],
    }).onDelete("cascade"),
    unique().on(t.camperId, t.campId, t.campYear),
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
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  relationship: text("relationship").notNull(), // "parent", "guardian", "relative", "caregiver", "other"
  relationshipOther: text("relationship_other"), // For "other" type
  ...timestamps,
});

export const camperEmergencyContacts = pgTable(
  "camper_emergency_contacts",
  {
    camperId: text("camper_id")
      .references(() => campers.id, { onDelete: "cascade" })
      .notNull(),
    emergencyContactId: text("emergency_contact_id")
      .references(() => emergencyContacts.id, { onDelete: "restrict" })
      .notNull(),
    priority: integer("priority").notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.camperId, t.emergencyContactId] })],
);

export const RELATIONSHIP_OPTIONS = [
  { value: "parent", name: "Parent" },
  { value: "guardian", name: "Guardian" },
  { value: "relative", name: "Relative" },
  { value: "caregiver", name: "Caregiver" },
  { value: "other", name: "Other" },
] as const;

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
}));

export const campRelations = relations(camps, ({ many }) => ({
  campYears: many(campYears),
}));

export const userRelations = relations(users, ({ many }) => ({
  campers: many(campers),
  addresses: many(addresses),
  emergencyContacts: many(emergencyContacts),
}));

export const addressesRelations = relations(addresses, ({ many, one }) => ({
  campers: many(campers),
  users: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const campersRelations = relations(campers, ({ one, many }) => ({
  user: one(users, { fields: [campers.userId], references: [users.id] }),
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
    user: one(users, {
      fields: [emergencyContacts.userId],
      references: [users.id],
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
  details: one(registrationDetails, {
    fields: [registrations.id],
    references: [registrationDetails.registrationId],
  }),
}));
