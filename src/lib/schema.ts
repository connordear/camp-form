import { relations } from 'drizzle-orm';
import { pgTable, serial, text, boolean, foreignKey, integer, } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
})

export const camps = pgTable('camps', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
})

export const campers = pgTable('campers', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  userId: integer('user_id').references(() => users.id).notNull()
})

export const registrations = pgTable('registrations', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  campId: integer('camp_id').references(() => camps.id, { onDelete: 'cascade' }),
  camperId: integer('camper_id').references(() => campers.id, { onDelete: 'cascade' }),
  isPaid: boolean('is_paid').default(false),
});



export const userRelations = relations(users, ({ many }) => ({
  campers: many(campers),
}))

export const campersRelations = relations(campers, ({ one, many }) => ({
  user: one(users, { fields: [campers.userId], references: [users.id] }),
  registrations: many(registrations),
}))

export const registrationsRelations = relations(registrations, ({ one }) => ({
  camper: one(campers, { fields: [registrations.camperId], references: [campers.id] }),
  camps: one(camps, { fields: [registrations.campId], references: [camps.id] })
}))
