import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sellerAvailability, appointments, sellers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    const { id } = await params
    const selectedDate = new Date(date)
    const dayOfWeek = selectedDate.getDay() + 1;

    // Get seller timezone

    const [seller] = await db
      .select()
      .from(sellers)
      .where(eq(sellers.id, id))
      .limit(1)

    if (!seller) {
      return NextResponse.json({
        error: 'Seller not found',
        message: 'The seller profile does not exist. Please check if the seller has completed onboarding.'
      }, { status: 404 })
    }

    // Get seller availability for the day
    const availability = await db
      .select()
      .from(sellerAvailability)
      .where(
        and(
          eq(sellerAvailability.sellerId, id),
          eq(sellerAvailability.dayOfWeek, dayOfWeek),
          eq(sellerAvailability.isAvailable, true)
        )
      )

    if (availability.length === 0) {
      return NextResponse.json({
        success: true,
        availableSlots: [],
        message: 'No availability for this day'
      })
    }

    // Get existing appointments for the date
    const startOfDay = new Date(date + 'T00:00:00')
    const endOfDay = new Date(date + 'T23:59:59')

    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.sellerId, id),
          eq(appointments.status, 'confirmed')
        )
      )

    // Filter appointments for the selected date
    const dayAppointments = existingAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.startTime)
      return appointmentDate >= startOfDay && appointmentDate <= endOfDay
    })

    // Generate time slots
    const slots = []
    const appointmentDuration = 60 // Fixed 60-minute appointments
    const slotInterval = 30 // 30-minute intervals

    for (const timeSlot of availability) {
      const startTime = parseTime(timeSlot.startTime)
      const endTime = parseTime(timeSlot.endTime)

      let currentTime = startTime
      while (currentTime + appointmentDuration <= endTime) {
        const slotStart = formatTime(currentTime)
        const slotEnd = formatTime(currentTime + appointmentDuration)

        // Check if this slot conflicts with existing appointments
        const slotDateTime = new Date(`${date}T${slotStart}`)
        const slotEndDateTime = new Date(`${date}T${slotEnd}`)

        const isBooked = dayAppointments.some(appointment => {
          const appointmentStart = new Date(appointment.startTime)
          const appointmentEnd = new Date(appointment.endTime)

          return (
            (slotDateTime >= appointmentStart && slotDateTime < appointmentEnd) ||
            (slotEndDateTime > appointmentStart && slotEndDateTime <= appointmentEnd) ||
            (slotDateTime <= appointmentStart && slotEndDateTime >= appointmentEnd)
          )
        })

        // Check if slot is in the past
        const now = new Date()
        const isPast = slotDateTime < now

        if (!isBooked && !isPast) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            isBooked: false
          })
        }

        currentTime += slotInterval
      }
    }

    return NextResponse.json({
      success: true,
      availableSlots: slots,
      timezone: seller.timezone
    })

  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}