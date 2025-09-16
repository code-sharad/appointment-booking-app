import { sellerAvailability, sellers, users } from "@/db/schema"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    const sellerId = pathname.split("/")[3]

    // Fetch seller details
    const [seller] = await db
      .select({
        seller: sellers,
        user: {
          name: users.name,
          email: users.email,
        }
      })
      .from(sellers)
      .leftJoin(users, eq(sellers.userId, users.id))
      .where(eq(sellers.id, sellerId))
      .limit(1)

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Fetch basic availability info (days available) for the seller
    const availability = await db
      .select()
      .from(sellerAvailability)
      .where(eq(sellerAvailability.sellerId, sellerId))
      .orderBy(sellerAvailability.dayOfWeek)

    return NextResponse.json({
      success: true,
      seller,
      availability
    })

  } catch (error) {
    console.error('Error fetching seller details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}