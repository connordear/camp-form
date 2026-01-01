import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
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
  id: id(),
  clerkId: text("clerk_id").unique().notNull(),
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  ...timestamps,
});

export const camps = pgTable("camps", {
  id: id(),
  name: text().notNull(),
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
    capacity: integer(),
    startDate: date("start_date"),
    endDate: date("end_date"),
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
    camperId: text("camper_id").references(() => campers.id, {
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
  campers: many(campers),
  users: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const campersRelations = relations(campers, ({ one, many }) => ({
  user: one(users, { fields: [campers.userId], references: [users.id] }),
  registrations: many(registrations),
  address: one(addresses, {
    fields: [campers.addressId],
    references: [addresses.id],
  }),
}));

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
