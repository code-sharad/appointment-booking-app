import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import type { Session } from 'next-auth'
import { db } from '@/lib/db'
import { users, sellers } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, sellerProfile } = await request.json()

    if (!role || !['buyer', 'seller', 'both'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // For sellers, validate profile data
    if (role === 'seller') {
      if (!sellerProfile?.title?.trim() || !sellerProfile?.description?.trim()) {
        return NextResponse.json({
          error: 'Title and description are required for sellers'
        }, { status: 400 })
      }
    }

    // Start a transaction to update user role and create seller profile if needed
    // Note: neon-http driver doesn't support transactions, so we'll do sequential operations
    // Update user role first
    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date()
      })
      .where(eq(users.id, session.user.id))
      .returning()

    let sellerData = null

    // Create seller profile if role is seller
    if (role === 'seller') {
      try {
        const [seller] = await db
          .insert(sellers)
          .values({
            userId: session.user.id,
            title: sellerProfile.title.trim(),
            description: sellerProfile.description.trim(),
            timezone: 'UTC', // Default timezone
            isActive: true,
            calendarIntegrated: false,
          })
          .returning()

        sellerData = seller
      } catch (sellerError) {
        // If seller creation fails, we should revert the user role update
        console.error('Error creating seller profile:', sellerError)

        // Revert user role update
        await db
          .update(users)
          .set({
            role: 'notdefined',
            updatedAt: new Date()
          })
          .where(eq(users.id, session.user.id))

        throw new Error('Failed to create seller profile')
      }
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      seller: sellerData,
    })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
