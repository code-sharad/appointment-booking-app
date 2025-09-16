import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import type { Session } from 'next-auth'
import { DatabaseQueries } from '@/lib/db/queries'

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user info
    const user = await DatabaseQueries.getUserById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has tokens with calendar permissions
    const tokens = await DatabaseQueries.getUserTokens(session.user.id)
    const hasCalendarPermissions = tokens?.scope?.includes('https://www.googleapis.com/auth/calendar.events') || false

    return NextResponse.json({
      success: true,
      calendarIntegrated: user.calendarIntegrated,
      hasCalendarPermissions,
      needsCalendarSetup: !user.calendarIntegrated || !hasCalendarPermissions
    })

  } catch (error) {
    console.error('Error checking calendar status:', error)
    return NextResponse.json(
      { error: 'Failed to check calendar status' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions) as Session

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark user as having completed calendar integration
    await DatabaseQueries.updateUserCalendarIntegration(session.user.id, true)

    return NextResponse.json({
      success: true,
      message: 'Calendar integration status updated'
    })

  } catch (error) {
    console.error('Error updating calendar status:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar status' },
      { status: 500 }
    )
  }
}
