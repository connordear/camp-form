import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
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
    basePrice: integer("base_price").default(0),
    capacity: integer(),
    startDate: date("start_date"),
    endDate: date("end_date"),
  },
  (t) => [primaryKey({ columns: [t.campId, t.year] })],
);

export const campers = pgTable("campers", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  clientId: text("client_id").notNull(),
  name: text().notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
});

export const registrations = pgTable(
  "registrations",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    clientId: text("client_id").notNull(),
    campId: integer("camp_id").references(() => camps.id, {
      onDelete: "cascade",
    }),
    camperId: integer("camper_id").references(() => campers.id, {
      onDelete: "cascade",
    }),
    isPaid: boolean("is_paid").default(false),
  },
  (t) => [unique().on(t.camperId, t.campId)],
);

export const campYearRelations = relations(campYears, ({ one }) => ({
  camp: one(camps, {
    fields: [campYears.campId],
    references: [camps.id],
  }),
}));

export const campRelations = relations(camps, ({ many }) => ({
  campYears: many(campYears),
}));

export const userRelations = relations(users, ({ many }) => ({
  campers: many(campers),
}));

export const campersRelations = relations(campers, ({ one, many }) => ({
  user: one(users, { fields: [campers.userId], references: [users.id] }),
  registrations: many(registrations),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  camper: one(campers, {
    fields: [registrations.camperId],
    references: [campers.id],
  }),
  camps: one(camps, {
    fields: [registrations.campId],
    references: [camps.id],
  }),
}));
