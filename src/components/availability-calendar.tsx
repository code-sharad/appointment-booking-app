'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, momentLocalizer, Event, View } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, CalendarIcon, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

const localizer = momentLocalizer(moment)

interface TimeSlot {
  start: string
  end: string
}

interface DayAvailability {
  dayOfWeek: number
  isAvailable: boolean
  timeSlots: TimeSlot[]
}

interface AvailabilityRecord {
  dayOfWeek: number
  isAvailable: boolean
  startTime: string
  endTime: string
}

interface AvailabilityEvent extends Event {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    type: 'availability'
    dayOfWeek: number
    timeSlot: TimeSlot
  }
}

interface AppointmentData {
  id: string;
  userRole: string;
  status: string;
  startTime: string;
  endTime: string;
  otherParty?: {
    name: string;
  };
}

interface AppointmentEvent extends Event {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    type: 'appointment'
    status: string
  }
}

interface AvailabilityCalendarProps {
  className?: string
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

export default function AvailabilityCalendar({ className }: AvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<DayAvailability[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  const [appointments, setAppointments] = useState<AppointmentEvent[]>([])

  const fetchAvailability = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/me/seller/availability')

      if (response.ok) {
        const data = await response.json()
        console.log('Fetched availability:', data)

        if (data.availability && data.availability.length > 0) {
          // Convert database format to component format
          const availabilityMap = new Map<number, TimeSlot[]>()

          data.availability.forEach((record: AvailabilityRecord) => {
            if (record.isAvailable) {
              const daySlots = availabilityMap.get(record.dayOfWeek) || []
              daySlots.push({
                start: record.startTime,
                end: record.endTime
              })
              availabilityMap.set(record.dayOfWeek, daySlots)
            }
          })

          const formattedAvailability: DayAvailability[] = Array.from({ length: 7 }, (_, index) => ({
            dayOfWeek: index,
            isAvailable: availabilityMap.has(index),
            timeSlots: availabilityMap.get(index) || []
          }))

          setAvailability(formattedAvailability)
        } else {
          // Initialize with empty availability
          setAvailability(Array.from({ length: 7 }, (_, index) => ({
            dayOfWeek: index,
            isAvailable: false,
            timeSlots: []
          })))
        }
      } else if (response.status === 404) {
        // No existing availability
        setAvailability(Array.from({ length: 7 }, (_, index) => ({
          dayOfWeek: index,
          isAvailable: false,
          timeSlots: []
        })))
      } else {
        throw new Error('Failed to fetch availability')
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      toast.error('Failed to load availability')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  // Fetch booked appointments (seller perspective)
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch('/api/appointments')
      if (!res.ok) return
      const data = await res.json()
      if (!data?.appointments) return

      const sellerAppointments = (data.appointments as AppointmentData[])
        .filter(a => a.userRole === 'seller')
        .filter(a => String(a.status || '').toLowerCase() !== 'cancelled')
      const mapped: AppointmentEvent[] = sellerAppointments.map((apt) => ({
        id: String(apt.id),
        title: `Booked: ${apt.otherParty?.name || 'Client'}`,
        start: new Date(apt.startTime),
        end: new Date(apt.endTime),
        resource: { type: 'appointment', status: apt.status }
      }))
      setAppointments(mapped)
    } catch (error) {
      console.log(error);
      // silent fail, calendar still works
    }
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Convert availability to calendar events
  const availabilityEvents: AvailabilityEvent[] = useMemo(() => {
    const calendarEvents: AvailabilityEvent[] = []

    // Get the start of the current week for generating events
    const startOfWeek = moment(date).startOf('week')

    availability.forEach((dayAvail) => {
      if (dayAvail.isAvailable) {
        dayAvail.timeSlots.forEach((timeSlot, slotIndex) => {
          // Calculate the date for this day of the week
          const eventDate = startOfWeek.clone().add(dayAvail.dayOfWeek, 'days')

          const startTime = moment(timeSlot.start, 'HH:mm')
          const endTime = moment(timeSlot.end, 'HH:mm')

          const eventStart = eventDate.clone()
            .hour(startTime.hour())
            .minute(startTime.minute())
            .toDate()

          const eventEnd = eventDate.clone()
            .hour(endTime.hour())
            .minute(endTime.minute())
            .toDate()

          calendarEvents.push({
            id: `${dayAvail.dayOfWeek}-${slotIndex}`,
            title: `Available ${startTime.format('HH:mm')}–${endTime.format('HH:mm')}`,
            start: eventStart,
            end: eventEnd,
            resource: {
              type: 'availability',
              dayOfWeek: dayAvail.dayOfWeek,
              timeSlot
            }
          })
        })
      }
    })

    return calendarEvents
  }, [availability, date])

  const allEvents = useMemo(() => {
    return [...availabilityEvents, ...appointments]
  }, [availabilityEvents, appointments])

  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
  }

  const handleViewChange = (newView: View) => {
    setView(newView)
  }

  type CalendarResource = { type: 'availability'; dayOfWeek: number; timeSlot: TimeSlot } | { type: 'appointment'; status: string }
  type CalendarEvent = { resource?: CalendarResource }
  const eventStyleGetter = (event: CalendarEvent) => {
    if (event?.resource?.type === 'appointment') {
      return {
        style: {
          backgroundColor: '#fca5a5',
          border: '1px solid #ef4444',
          color: '#111827',
          fontSize: '12px',
          borderRadius: '6px',
          boxShadow: '0 1px 2px rgba(239,68,68,0.3)',
          opacity: 0.95,
          zIndex: 3
        }
      }
    }
    return {
      style: {
        backgroundColor: '#10b981',
        border: '1px solid #059669',
        color: 'black',
        fontSize: '12px',
        borderRadius: '6px',
        boxShadow: '0 1px 2px rgba(16,185,129,0.4)',
        opacity: 1,
        zIndex: 2
      }
    }
  }

  const dayPropGetter = (date: Date) => {
    const dayOfWeek = date.getDay()
    const dayAvail = availability.find(a => a.dayOfWeek === dayOfWeek)

    if (dayAvail?.isAvailable) {
      return {
        style: {
          backgroundColor: 'rgb(39, 39, 39)',
          color: 'black',
          boxShadow: 'inset 0 0 0 1pxrgb(211, 241, 227)'
        },
        className: 'available-day'
      }
    }

    return {}
  }

  return (
    <Card className={className}>
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle>Availability Calendar</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden md:flex items-center rounded-md border p-1">
              <Button variant={view === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => handleViewChange('month')}>Month</Button>
              <Button variant={view === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => handleViewChange('week')}>Week</Button>
              <Button variant={view === 'day' ? 'default' : 'ghost'} size="sm" onClick={() => handleViewChange('day')}>Day</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleNavigate(moment(date).subtract(1, view === 'month' ? 'month' : 'week').toDate())}>
                Prev
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleNavigate(new Date())}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate(moment(date).add(1, view === 'month' ? 'month' : 'week').toDate())}>
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAvailability}
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-muted-foreground">Available slots</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
            <span className="text-muted-foreground">Available days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-300 border border-red-500 rounded"></div>
            <span className="text-muted-foreground">Booked appointments</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 animate-spin" />
              <span>Loading availability...</span>
            </div>
          </div>
        ) : (
          <div className="h-[600px] md:h-[700px]">
            <Calendar
              localizer={localizer}
              events={allEvents}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={handleViewChange}
              date={date}
              onNavigate={handleNavigate}
              eventPropGetter={eventStyleGetter}
              dayPropGetter={dayPropGetter}
              step={15}
              timeslots={4}
              views={['month', 'week', 'day']}
              defaultView="month"
              scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
              style={{ height: '100%' }}
              className="rounded-md border bg-background"
              popup
              showMultiDayTimes
              tooltipAccessor={(event) => `${moment(event.start).format('ddd, MMM D, HH:mm')} - ${moment(event.end).format('HH:mm')}`}
            />
          </div>
        )}

        {/* Summary section */}
        {!loading && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Weekly Summary</h4>
            <div className="flex flex-wrap gap-2">
              {availability.map((dayAvail) => (
                <Badge
                  key={dayAvail.dayOfWeek}
                  variant={dayAvail.isAvailable ? 'default' : 'secondary'}
                  className={dayAvail.isAvailable ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                >
                  {DAYS_OF_WEEK[dayAvail.dayOfWeek]}: {dayAvail.timeSlots.length} slots
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
