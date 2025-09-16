import { pgTable, text, timestamp, boolean, integer, uuid, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';



// Users table - stores both buyers and sellers
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture'),
  role: text('role', { enum: ['buyer', 'seller', 'both', 'notdefined'] }).notNull().default('notdefined'), // User role
  calendarIntegrated: boolean('calendar_integrated').default(false), // Calendar integration status for all users
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  googleIdIdx: index('users_google_id_idx').on(table.googleId),
  emailIdx: index('users_email_idx').on(table.email),
}));


// Seller profiles - additional data for sellers
export const sellers = pgTable('sellers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title'),
  description: text('description'),
  timezone: text('timezone').notNull().default('UTC'),
  isActive: boolean('is_active').default(true),
  calendarIntegrated: boolean('calendar_integrated').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sellers_user_id_idx').on(table.userId),
  activeIdx: index('sellers_active_idx').on(table.isActive),
}));

// Google OAuth tokens - securely store refresh tokens
export const userTokens = pgTable('user_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: text('provider').notNull().default('google'),
  accessToken: text('access_token'), // This will be refreshed frequently
  refreshToken: text('refresh_token').notNull(), // This should be encrypted
  expiresAt: timestamp('expires_at'),
  scope: text('scope'), // Store granted scopes
  tokenType: text('token_type').default('Bearer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userProviderIdx: unique('user_tokens_user_provider_unique').on(table.userId, table.provider),
  userIdIdx: index('user_tokens_user_id_idx').on(table.userId),
}));


// Seller availability rules (optional feature for custom availability)
export const sellerAvailability = pgTable('seller_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').references(() => sellers.id, { onDelete: 'cascade' }).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: text('start_time').notNull(), // Format: "09:00"
  endTime: text('end_time').notNull(), // Format: "17:00"
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sellerDayIdx: index('seller_availability_seller_day_idx').on(table.sellerId, table.dayOfWeek),
}));



// Appointments table
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').references(() => sellers.id, { onDelete: 'cascade' }).notNull(),
  buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  // date: timestamp('date').notNull(), // Appointment date
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  timezone: text('timezone').notNull(),
  status: text('status', {
    enum: ['pending', 'confirmed', 'cancelled', 'completed']
  }).notNull().default('confirmed'),

  // Google Calendar integration
  sellerEventId: text('seller_event_id'), // Google Calendar event ID in seller's calendar
  buyerEventId: text('buyer_event_id'), // Google Calendar event ID in buyer's calendar
  meetingLink: text('meeting_link'), // Google Meet or other meeting link

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sellerIdx: index('appointments_seller_idx').on(table.sellerId),
  buyerIdx: index('appointments_buyer_idx').on(table.buyerId),
  startTimeIdx: index('appointments_start_time_idx').on(table.startTime),
  statusIdx: index('appointments_status_idx').on(table.status),
}));



// export const bookings = pgTable('bookings', {
//   id: uuid('id').primaryKey().defaultRandom(),
//   sellerId: uuid('seller_id').references(() => sellers.id, { onDelete: 'cascade' }).notNull(),
//   buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
//   date: date('date').notNull(),
//   timeSlot: text('time_slot').notNull(), // e.g., "14:30"
//   duration: integer('duration').notNull(), // in minutes
//   price: decimal('price', { precision: 10, scale: 2 }).notNull(),
//   status: text('status').notNull().default('confirmed'), // confirmed, cancelled, completed
//   notes: text('notes'),
//   calendarEventId: text('calendar_event_id'),
//   meetLink: text('meet_link'),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
//   updatedAt: timestamp('updated_at').defaultNow().notNull(),
// })


// Define relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  seller: one(sellers, {
    fields: [users.id],
    references: [sellers.userId],
  }),
  tokens: many(userTokens),
  buyerAppointments: many(appointments, {
    relationName: 'buyerAppointments',
  }),
}));

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  user: one(users, {
    fields: [sellers.userId],
    references: [users.id],
  }),
  availability: many(sellerAvailability),
  appointments: many(appointments),
}));

export const userTokensRelations = relations(userTokens, ({ one }) => ({
  user: one(users, {
    fields: [userTokens.userId],
    references: [users.id],
  }),
}));

export const sellerAvailabilityRelations = relations(sellerAvailability, ({ one }) => ({
  seller: one(sellers, {
    fields: [sellerAvailability.sellerId],
    references: [sellers.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  seller: one(sellers, {
    fields: [appointments.sellerId],
    references: [sellers.id],
  }),
  buyer: one(users, {
    fields: [appointments.buyerId],
    references: [users.id],
  }),
}));



// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Seller = typeof sellers.$inferSelect;
export type NewSeller = typeof sellers.$inferInsert;
export type UserToken = typeof userTokens.$inferSelect;
export type NewUserToken = typeof userTokens.$inferInsert;
export type SellerAvailability = typeof sellerAvailability.$inferSelect;
export type NewSellerAvailability = typeof sellerAvailability.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
