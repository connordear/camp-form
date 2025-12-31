import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  clerkId: text("clerk_id").unique().notNull(),
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
});

export const camps = pgTable("camps", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
});

export const campYears = pgTable(
  "camp_years",
  {
    year: integer().notNull(),
    campId: integer("camp_id")
      .references(() => camps.id)
      .notNull(),
    basePrice: integer("base_price").notNull().default(0),
    capacity: integer(),
    startDate: date("start_date"),
    endDate: date("end_date"),
  },
  (t) => [primaryKey({ columns: [t.campId, t.year] })],
);

export const campers = pgTable("campers", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  clientId: text("client_id").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  dateOfBirth: date("date_of_birth").notNull().default("2000-01-01"),
  swimmingLevel: text("swimming_level").default(""),
  gender: text().default(""),
  hasBeenToCamp: boolean("has_been_to_camp").default(false),
  shirtSize: text("shirt_size").default(""),
});

export const addresses = pgTable("addresses", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: text().notNull(),
  stateProv: text().notNull(),
  country: text().notNull(),
  postalZip: text().notNull(),
});

export const camperAddresses = pgTable(
  "camper_addresses",
  {
    camperId: integer("camper_id")
      .notNull()
      .references(() => campers.id),
    addressId: integer("address_id")
      .notNull()
      .references(() => addresses.id),
  },
  (t) => [primaryKey({ columns: [t.camperId, t.addressId] })],
);

export const registrations = pgTable(
  "registrations",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    clientId: text("client_id").notNull(),
    campId: integer("camp_id").notNull(),
    campYear: integer("camp_year").notNull(),
    camperId: integer("camper_id").references(() => campers.id, {
      onDelete: "cascade",
    }),
    pricePaid: integer("price_paid"),
    status: text("status", {
      enum: ["draft", "registered", "refunded"],
    })
      .notNull()
      .default("draft"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeSessionId: text("stripe_session_id"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    foreignKey({
      columns: [t.campId, t.campYear],
      foreignColumns: [campYears.campId, campYears.year],
    }).onDelete("cascade"),
    unique().on(t.camperId, t.campId, t.campYear),
  ],
);

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
}));

export const addressesRelations = relations(addresses, ({ many, one }) => ({
  camperAddresses: many(camperAddresses),
  users: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const campersRelations = relations(campers, ({ one, many }) => ({
  user: one(users, { fields: [campers.userId], references: [users.id] }),
  registrations: many(registrations),
  address: one(camperAddresses, {
    fields: [campers.id],
    references: [camperAddresses.camperId],
  }),
}));

export const camperAddressesRelations = relations(
  camperAddresses,
  ({ one, many }) => ({
    addresses: many(addresses),
    campers: one(campers, {
      fields: [camperAddresses.camperId],
      references: [campers.id],
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
}));
