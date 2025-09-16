// lib/db/queries.ts - Common database queries
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { db } from './index';
import { users, sellers, appointments, userTokens, sellerAvailability } from '@/db/schema';

export class DatabaseQueries {
  // User queries
  static async getUserByGoogleId(googleId: string) {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0] || null;
  }

  static async getUserByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  static async getUserById(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  }

  static async createUser(userData: typeof users.$inferInsert) {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  static async updateUser(email: string, updateData: Partial<typeof users.$inferInsert>) {
    const result = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();
    return result[0];
  }

  static async updateUserCalendarIntegration(userId: string, calendarIntegrated: boolean) {
    const result = await db
      .update(users)
      .set({
        calendarIntegrated,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // Seller queries
  static async getSellerByUserId(userId: string) {
    const result = await db.select().from(sellers).where(eq(sellers.userId, userId)).limit(1);
    return result[0] || null;
  }

  static async getAllActiveSellers() {
    return await db
      .select({
        seller: sellers,
        user: users,
      })
      .from(sellers)
      .innerJoin(users, eq(sellers.userId, users.id))
      .where(eq(sellers.isActive, true))
      .orderBy(asc(users.name));
  }

  static async createSeller(sellerData: typeof sellers.$inferInsert) {
    const result = await db.insert(sellers).values(sellerData).returning();
    return result[0];
  }

  // Token queries
  static async getUserTokens(userId: string, provider: string = 'google') {
    const result = await db
      .select()
      .from(userTokens)
      .where(and(eq(userTokens.userId, userId), eq(userTokens.provider, provider)))
      .limit(1);
    return result[0] || null;
  }

  static async upsertUserTokens(tokenData: typeof userTokens.$inferInsert) {
    const existing = await this.getUserTokens(tokenData.userId, tokenData.provider);

    if (existing) {
      const result = await db
        .update(userTokens)
        .set({
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          expiresAt: tokenData.expiresAt,
          scope: tokenData.scope,
          updatedAt: new Date(),
        })
        .where(eq(userTokens.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(userTokens).values(tokenData).returning();
      return result[0];
    }
  }

  // Appointment queries
  static async createAppointment(appointmentData: typeof appointments.$inferInsert) {
    const result = await db.insert(appointments).values(appointmentData).returning();
    return result[0];
  }

  static async getAppointmentsByUser(userId: string, role: 'buyer' | 'seller' = 'buyer') {
    if (role === 'buyer') {
      return await db
        .select({
          appointment: appointments,
          seller: sellers,
          sellerUser: users,
        })
        .from(appointments)
        .innerJoin(sellers, eq(appointments.sellerId, sellers.id))
        .innerJoin(users, eq(sellers.userId, users.id))
        .where(eq(appointments.buyerId, userId))
        .orderBy(desc(appointments.startTime));
    } else {
      // For sellers, get appointments where they are the seller
      const seller = await this.getSellerByUserId(userId);
      if (!seller) return [];

      return await db
        .select({
          appointment: appointments,
          buyer: users,
        })
        .from(appointments)
        .innerJoin(users, eq(appointments.buyerId, users.id))
        .where(eq(appointments.sellerId, seller.id))
        .orderBy(desc(appointments.startTime));
    }
  }

  static async getSellerAvailability(sellerId: string) {
    return await db
      .select()
      .from(sellerAvailability)
      .where(eq(sellerAvailability.sellerId, sellerId))
      .orderBy(asc(sellerAvailability.dayOfWeek), asc(sellerAvailability.startTime));
  }

  static async getSellerAppointments(sellerId: string, startDate: Date, endDate: Date) {
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.sellerId, sellerId),
          gte(appointments.startTime, startDate),
          lte(appointments.startTime, endDate)
        )
      )
      .orderBy(asc(appointments.startTime));
  }

  static async createAvailability(availabilityData: typeof sellerAvailability.$inferInsert) {
    const result = await db.insert(sellerAvailability).values(availabilityData).returning();
    return result[0];
  }
}