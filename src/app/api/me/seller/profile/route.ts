import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import type { Session } from 'next-auth'
import { db } from '@/lib/db'
import { sellers } from '@/db/schema'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description } = await request.json()

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({
        error: 'Title and description are required'
      }, { status: 400 })
    }

    // Create seller profile
    const [sellerProfile] = await db
      .insert(sellers)
      .values({
        userId: session.user.id,
        title: title.trim(),
        description: description.trim(),
        timezone: 'UTC', // Default timezone
        isActive: true,
        calendarIntegrated: false,
      })
      .returning()

    return NextResponse.json({
      success: true,
      seller: sellerProfile,
    })
  } catch (error) {
    console.error('Error creating seller profile:', error)
    return NextResponse.json(
      { error: 'Failed to create seller profile' },
      { status: 500 }
    )
  }
}
