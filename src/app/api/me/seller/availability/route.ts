import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import type { Session } from 'next-auth'
import { db } from '@/lib/db'
import { sellerAvailability, sellers } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a seller or has both roles
    if (session.user.role !== 'seller' && session.user.role !== 'both') {
      return NextResponse.json({ error: 'Seller access required' }, { status: 403 })
    }

    // Get seller ID from sellers table
    const [seller] = await db
      .select()
      .from(sellers)
      .where(eq(sellers.userId, session.user.id))
      .limit(1)

    if (!seller) {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })
    }

    // Fetch availability for this seller
    const availability = await db
      .select()
      .from(sellerAvailability)
      .where(eq(sellerAvailability.sellerId, seller.id))
      .orderBy(sellerAvailability.dayOfWeek)

    return NextResponse.json({
      success: true,
      availability,
      timezone: seller.timezone || 'UTC'
    })

  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a seller or has both roles
    if (session.user.role !== 'seller' && session.user.role !== 'both') {
      return NextResponse.json({ error: 'Seller access required' }, { status: 403 })
    }

    const { availability, timezone } = await request.json()

    if (!Array.isArray(availability)) {
      return NextResponse.json({ error: 'Invalid availability data' }, { status: 400 })
    }

    // Get seller ID from sellers table
    let [seller] = await db
      .select()
      .from(sellers)
      .where(eq(sellers.userId, session.user.id))
      .limit(1)

    // Create seller profile if it doesn't exist
    if (!seller) {
      [seller] = await db
        .insert(sellers)
        .values({
          userId: session.user.id,
          timezone: timezone || 'UTC',
        })
        .returning()
    } else {
      // Update timezone if provided
      if (timezone) {
        await db
          .update(sellers)
          .set({ timezone, updatedAt: new Date() })
          .where(eq(sellers.id, seller.id))
      }
    }

    // Delete existing availability
    await db
      .delete(sellerAvailability)
      .where(eq(sellerAvailability.sellerId, seller.id))

    // Insert new availability records
    const availabilityRecords = []
    for (const dayData of availability) {
      if (dayData.isAvailable && dayData.timeSlots && dayData.timeSlots.length > 0) {
        for (const slot of dayData.timeSlots) {
          availabilityRecords.push({
            sellerId: seller.id,
            dayOfWeek: dayData.dayOfWeek,
            startTime: slot.start,
            endTime: slot.end,
            isAvailable: true,
          })
        }
      } else {
        // Add unavailable record for tracking
        availabilityRecords.push({
          sellerId: seller.id,
          dayOfWeek: dayData.dayOfWeek,
          startTime: '00:00',
          endTime: '00:00',
          isAvailable: false,
        })
      }
    }

    if (availabilityRecords.length > 0) {
      await db
        .insert(sellerAvailability)
        .values(availabilityRecords)
    }

    return NextResponse.json({
      success: true,
      message: 'Availability saved successfully'
    })

  } catch (error) {
    console.error('Error saving availability:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

