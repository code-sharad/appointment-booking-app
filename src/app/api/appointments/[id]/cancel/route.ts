import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import type { Session } from 'next-auth'
import { db } from '@/lib/db'
import { appointments, sellers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { deleteCalendarEvent } from '@/lib/google-calendar'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: appointmentId } = await params

    // Get the appointment with seller user info to check ownership and get calendar event ID
    const [appointmentData] = await db
      .select({
        appointment: appointments,
        sellerUserId: sellers.userId,
      })
      .from(appointments)
      .leftJoin(sellers, eq(appointments.sellerId, sellers.id))
      .where(eq(appointments.id, appointmentId))
      .limit(1)

    if (!appointmentData) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const appointment = appointmentData.appointment
    const sellerUserId = appointmentData.sellerUserId

    // Check if user is authorized to cancel this appointment
    if (appointment.buyerId !== session.user.id && sellerUserId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized to cancel this appointment' }, { status: 403 })
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ error: 'Appointment is already cancelled' }, { status: 400 })
    }

    // Update appointment status to cancelled
    await db
      .update(appointments)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(appointments.id, appointmentId))
      .returning()

    // Cancel Google Calendar events if they exist
    let calendarCancelled = false
    const calendarResults = []

    // Cancel seller's calendar event
    if (appointment.sellerEventId && sellerUserId) {
      try {
        const result = await deleteCalendarEvent(sellerUserId, appointment.sellerEventId)
        if (result.success) {
          calendarResults.push('seller')
        } else {
          console.warn(`Seller calendar event not cancelled: ${result.reason}`)
        }
      } catch (calendarError) {
        console.error('Failed to cancel seller calendar event:', calendarError)
      }
    }

    // Cancel buyer's calendar event
    if (appointment.buyerEventId) {
      try {
        const result = await deleteCalendarEvent(appointment.buyerId, appointment.buyerEventId)
        if (result.success) {
          calendarResults.push('buyer')
        } else {
          console.warn(`Buyer calendar event not cancelled: ${result.reason}`)
        }
      } catch (calendarError) {
        console.error('Failed to cancel buyer calendar event:', calendarError)
      }
    }

    calendarCancelled = calendarResults.length > 0

    return Response.json({
      success: true,
      message: 'Appointment cancelled successfully',
      calendarCancelled,
      calendarResults
    })
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    )
  }
}
