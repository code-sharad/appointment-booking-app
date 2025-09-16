import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import type { Session } from 'next-auth'
import { db } from '@/lib/db'
import { appointments, sellers, users, userTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { GoogleCalendarService, createBookingEvent } from '@/lib/google-calendar'
import { decrypt, encrypt } from '@/lib/encryption'
import { fromZonedTime } from 'date-fns-tz'

// Helper function to get valid access token
async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    // Get user tokens from database
    const [userToken] = await db
      .select()
      .from(userTokens)
      .where(eq(userTokens.userId, userId))
      .limit(1)

    if (!userToken) {
      return null
    }

    // Check if token is still valid (expires in next 5 minutes)
    const now = new Date()
    const expiresAt = userToken.expiresAt
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    if (expiresAt && expiresAt > fiveMinutesFromNow) {
      return userToken.accessToken
    }

    // Token is expired or about to expire, refresh it
    if (!userToken.refreshToken) {
      return null
    }

    // Decrypt the refresh token
    const decryptedRefreshToken = decrypt(userToken.refreshToken)

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken,
      }),
    })

    if (!response.ok) {
      console.error('Failed to refresh token:', await response.text())
      return null
    }

    const tokens = await response.json()

    // Update the token in database
    await db
      .update(userTokens)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : userToken.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(userTokens.userId, userId))

    return tokens.access_token
  } catch (error) {
    console.error('Error getting valid access token:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sellerId, date, timeSlot, notes } = await request.json()

    if (!sellerId || !date || !timeSlot) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get seller to get timezone and user info FIRST
    const [sellerWithUser] = await db
      .select({
        seller: sellers,
        user: users,
      })
      .from(sellers)
      .innerJoin(users, eq(sellers.userId, users.id))
      .where(eq(sellers.id, sellerId))
      .limit(1)

    if (!sellerWithUser) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Create start and end datetime in the seller's timezone
    // Parse the date and time properly to avoid timezone conversion issues
    // The date comes as YYYY-MM-DD and timeSlot as HH:MM from frontend

    // Create a date object representing the appointment time
    // Handle timezone properly using date-fns-tz
    let startDateTime: Date

    // Parse the input date and time
    const inputDateTime = `${date}T${timeSlot}:00`

    if (sellerWithUser.seller.timezone) {
      // Create the date in the seller's timezone, then convert to UTC for storage
      const localDate = new Date(inputDateTime)
      startDateTime = fromZonedTime(localDate, sellerWithUser.seller.timezone)
    } else {
      // Fallback to UTC if no timezone specified
      startDateTime = new Date(`${inputDateTime}Z`)
    }

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60000) // 60 minutes later

    // Get buyer info
    const [buyer] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // Create appointment
    const [newAppointment] = await db
      .insert(appointments)
      .values({
        sellerId,
        buyerId: session.user.id,
        startTime: startDateTime,
        endTime: endDateTime,
        timezone: sellerWithUser.seller.timezone,
        status: 'confirmed',
      })
      .returning()

    // Google Calendar Integration - Create ONE event with both attendees
    const calendarResults: {
      seller: { success: boolean; eventId?: string | null; eventLink?: string | null; meetLink?: string | null } | null
    } = { seller: null }
    try {
      const calendarEvent = createBookingEvent(
        {
          id: newAppointment.id,
          startTime: startDateTime,
          endTime: endDateTime,
          seller: {
            name: sellerWithUser.user.name || 'Unknown',
            email: sellerWithUser.user.email || '',
            title: sellerWithUser.seller.title || 'Consultation',
          },
          buyer: {
            name: buyer.name || 'Unknown',
            email: buyer.email || '',
          },
          notes: notes || undefined,
        },
        sellerWithUser.seller.timezone
      )



      // Create calendar event for seller
      const sellerAccessToken = await getValidAccessToken(sellerWithUser.user.id)
      if (sellerAccessToken) {
        try {
          const sellerCalendarService = new GoogleCalendarService(sellerAccessToken)
          calendarResults.seller = await sellerCalendarService.createEvent(calendarEvent)
          console.log('Seller calendar event created successfully')
        } catch (error) {
          console.error('Failed to create seller calendar event:', error)
        }
      }

    } catch (calendarError) {
      console.error('Google Calendar integration failed:', calendarError)
      // Continue without calendar integration - don't fail the booking
    }

    // Update appointment with calendar event IDs and meeting links
    const updateData: Partial<{
      sellerEventId: string | null
      meetingLink: string | null
    }> = {}

    if (calendarResults.seller?.eventId) {
      updateData.sellerEventId = calendarResults.seller.eventId
    }
    // Use seller's meeting link as the primary meeting link (since buyer is invited to seller's event)
    if (calendarResults.seller?.meetLink) {
      updateData.meetingLink = calendarResults.seller.meetLink
    }

    // Update the appointment if we have any calendar data to save
    if (Object.keys(updateData).length > 0) {
      try {
        await db
          .update(appointments)
          .set({
            ...updateData,
            updatedAt: new Date()
          })
          .where(eq(appointments.id, newAppointment.id))
      } catch (updateError) {
        console.error('Failed to update appointment with calendar data:', updateError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      appointment: newAppointment,
      calendar: {
        seller: calendarResults.seller ? {
          eventCreated: true,
          eventLink: calendarResults.seller.eventLink,
          meetLink: calendarResults.seller.meetLink,
        } : {
          eventCreated: false,
          message: 'Calendar integration not available for seller'
        },
        // Note: Buyer is automatically invited to the seller's calendar event
        buyerInvited: calendarResults.seller?.eventId ? true : false
      }
    })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role to determine what appointments to fetch
    const [currentUser] = await db
      .select({
        id: users.id,
        role: users.role,
        sellerId: sellers.id,
      })
      .from(users)
      .leftJoin(sellers, eq(users.id, sellers.userId))
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get appointments as buyer
    const buyerAppointments = await db
      .select({
        id: appointments.id,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        timezone: appointments.timezone,
        sellerName: users.name,
        sellerTitle: sellers.title,
        sellerEmail: users.email,
      })
      .from(appointments)
      .leftJoin(sellers, eq(appointments.sellerId, sellers.id))
      .leftJoin(users, eq(sellers.userId, users.id))
      .where(eq(appointments.buyerId, session.user.id))

    interface SellerAppointment {
      id: string
      startTime: Date
      endTime: Date
      status: string
      timezone: string
      buyerName: string | null
      buyerEmail: string | null
    }

    let sellerAppointments: SellerAppointment[] = []

    // Get appointments as seller (if user is a seller)
    if (currentUser.sellerId) {
      sellerAppointments = await db
        .select({
          id: appointments.id,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          status: appointments.status,
          timezone: appointments.timezone,
          buyerName: users.name,
          buyerEmail: users.email,
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.buyerId, users.id))
        .where(eq(appointments.sellerId, currentUser.sellerId))
    }

    // Combine and format appointments
    const allAppointments = [
      ...buyerAppointments.map(apt => ({
        id: apt.id,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        timezone: apt.timezone,
        userRole: 'buyer' as const,
        otherParty: {
          name: apt.sellerName,
          title: apt.sellerTitle,
          email: apt.sellerEmail,
        }
      })),
      ...sellerAppointments.map(apt => ({
        id: apt.id,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        timezone: apt.timezone,
        userRole: 'seller' as const,
        otherParty: {
          name: apt.buyerName,
          email: apt.buyerEmail,
        }
      }))
    ]

    // Sort by start time (most recent first)
    allAppointments.sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )

    return NextResponse.json({
      success: true,
      appointments: allAppointments,
      userRole: currentUser.role,
    })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}
