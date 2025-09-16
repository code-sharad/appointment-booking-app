import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sellers, users, sellerAvailability, type SellerAvailability } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    // Fetch all active sellers with their user info
    const sellersData = await db
      .select({
        seller: sellers,
        user: {
          name: users.name,
          email: users.email,
        }
      })
      .from(sellers)
      .innerJoin(users, eq(sellers.userId, users.id))
      .where(eq(sellers.isActive, true))

    // Fetch availability for all sellers
    const allAvailability = await db
      .select()
      .from(sellerAvailability)
      .orderBy(sellerAvailability.sellerId, sellerAvailability.dayOfWeek)

    // Group availability by seller
    const availabilityMap = new Map()
    allAvailability.forEach(record => {
      if (!availabilityMap.has(record.sellerId)) {
        availabilityMap.set(record.sellerId, [])
      }
      availabilityMap.get(record.sellerId).push(record)
    })

    // Transform data for frontend
    const sellersWithAvailability = sellersData.map(({ seller, user }) => {
      const sellerAvailabilityRecords = availabilityMap.get(seller.id) || []

      // Convert to the expected format
      const availability = Array.from({ length: 7 }, (_, dayOfWeek) => {
        const dayRecords = sellerAvailabilityRecords.filter(
          (record: SellerAvailability) => record.dayOfWeek === dayOfWeek && record.isAvailable
        )

        return {
          dayOfWeek,
          isAvailable: dayRecords.length > 0,
          timeSlots: dayRecords.map((record: SellerAvailability) => ({
            start: record.startTime,
            end: record.endTime
          }))
        }
      })

      return {
        id: seller.id,
        description: seller.description || '',
        location: null, // Add location field to schema if needed
        timezone: seller.timezone || 'UTC',
        rating: 4.8, // TODO: Calculate from reviews
        reviewCount: 0, // TODO: Count from reviews table
        isActive: seller.isActive,
        availability,
        services: [], // TODO: Fetch from services table
        user: {
          name: user.name || '',
          email: user.email || ''
        }
      }
    })

    return NextResponse.json({
      success: true,
      sellers: sellersWithAvailability
    })

  } catch (error) {
    console.error('Error fetching sellers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}