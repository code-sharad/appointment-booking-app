import { google } from 'googleapis'

interface CalendarEvent {
  summary: string
  description: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees: Array<{
    email: string
    displayName?: string
  }>
  location?: string
  conferenceData?: {
    createRequest: {
      requestId: string
      conferenceSolutionKey: {
        type: string
      }
    }
  }
}

export class GoogleCalendarService {
  private calendar: ReturnType<typeof google.calendar>

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    this.calendar = google.calendar({ version: 'v3', auth })
  }

  async createEvent(event: CalendarEvent, calendarId: string = 'primary') {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        conferenceDataVersion: 1, // Enable Google Meet
      })

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
      }
    } catch (error) {
      console.error('Error creating Google Calendar event:', error)
      throw new Error('Failed to create calendar event')
    }
  }

  async deleteEvent(eventId: string, calendarId: string = 'primary') {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      })

      return {
        success: true,
        message: 'Event deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error)
      throw new Error('Failed to delete calendar event')
    }
  }
}

// Utility function to delete calendar event
export const deleteCalendarEvent = async (userId: string, eventId: string) => {
  const { DatabaseQueries } = await import('@/lib/db/queries')

  // Get user's access token
  const tokens = await DatabaseQueries.getUserTokens(userId)
  if (!tokens?.accessToken) {
    console.warn(`No access token found for user ${userId} - skipping calendar event deletion`)
    return { success: false, reason: 'No access token found' }
  }

  // Handle access token - it should be stored unencrypted
  let accessToken: string
  try {
    // First try to use the token as-is (should be unencrypted)
    accessToken = tokens.accessToken

    // Validate that it looks like a valid access token (not encrypted)
    if (accessToken.includes(':') && accessToken.length > 100) {
      // This looks like it might be encrypted, try to decrypt
      const { decrypt } = await import('@/lib/encryption')
      accessToken = decrypt(tokens.accessToken)
    }
  } catch (decryptError) {
    console.warn(`Failed to process access token for user ${userId}:`, decryptError)
    return { success: false, reason: 'Invalid access token format' }
  }

  try {
    const calendarService = new GoogleCalendarService(accessToken)
    await calendarService.deleteEvent(eventId)
    return { success: true }
  } catch (apiError) {
    console.error(`Failed to delete calendar event for user ${userId}:`, apiError)
    return { success: false, reason: 'Calendar API error' }
  }
}

// Utility function to create booking event
export const createBookingEvent = (
  booking: {
    id: string
    startTime: Date
    endTime: Date
    seller: {
      name: string
      email: string
      title: string
    }
    buyer: {
      name: string
      email: string
    }
    notes?: string
  },
  timezone: string = 'UTC'
): CalendarEvent => {
  return {
    summary: `${booking.seller.title} - Appointment`,
    description: `
Appointment Details:
• Service: ${booking.seller.title}
• Provider: ${booking.seller.name}
• Client: ${booking.buyer.name}
• Duration: 60 minutes
${booking.notes ? `• Notes: ${booking.notes}` : ''}

Booking ID: ${booking.id}

This appointment was booked through the booking system.
    `.trim(),
    start: {
      dateTime: booking.startTime.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: booking.endTime.toISOString(),
      timeZone: timezone,
    },
    attendees: [
      {
        email: booking.seller.email,
        displayName: booking.seller.name,
      },
      {
        email: booking.buyer.email,
        displayName: booking.buyer.name,
      },
    ],
    location: booking.seller.title,
    conferenceData: {
      createRequest: {
        requestId: `booking-${booking.id}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
  }
}
