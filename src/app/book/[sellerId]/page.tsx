'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
// import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Calendar as CalendarIcon, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface TimeSlot {
  start: string
  end: string
  isBooked?: boolean
}

interface SellerProfile {
  id: string
  userId: string
  title: string
  description: string
  timezone: string
  isActive: boolean
  calendarIntegrated: boolean
  createdAt: string
  updatedAt: string
}

interface User {
  name: string
  email: string
  picture?: string
}

interface Availability {
  id: string
  sellerId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

interface SellerApiResponse {
  success: boolean
  seller: {
    seller: SellerProfile
    user: User
  }
  availability: Availability[]
}

interface Seller {
  seller: SellerProfile
  user: User
  availability?: Availability[]
}

export default function BookingPage() {
  const { data: session } = useSession() as { data: Session | null }
  const params = useParams()
  const router = useRouter()
  const sellerId = params.sellerId as string

  const [seller, setSeller] = useState<Seller | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [notes] = useState('')
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Fetch seller information
  const fetchSeller = useCallback(async () => {
    try {
      const response = await fetch(`/api/sellers/${sellerId}`)
      if (response.ok) {
        const data: SellerApiResponse = await response.json()
        if (data.success && data.seller) {
          setSeller({
            seller: data.seller.seller,
            user: data.seller.user,
            availability: data.availability
          })
        } else {
          toast.error('Seller not found')
          router.push('/sellers')
        }
      } else {
        toast.error('Seller not found')
        router.push('/sellers')
      }
    } catch (error) {
      console.error('Error fetching seller:', error)
      toast.error('Failed to load seller information')
    } finally {
      setLoading(false)
    }
  }, [sellerId, router])

  // Fetch available time slots for selected date
  const fetchAvailableSlots = useCallback(async (date: Date) => {
    if (!sellerId) return

    setSlotsLoading(true)
    try {
      // Format date without timezone conversion
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const response = await fetch(`/api/sellers/${sellerId}/availability?date=${dateString}`)

      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.availableSlots || [])
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Failed to load available time slots')
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('Error fetching available slots:', error)
      toast.error('Failed to load available time slots')
      setAvailableSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [sellerId])

  // Handle booking submission
  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot || !session?.user?.id) {
      toast.error('Please select a date and time slot')
      return
    }

    setBookingLoading(true)
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellerId,
          date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
          timeSlot: selectedSlot.start,
          notes: notes.trim() || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Show success message with calendar info
        if (data.calendar?.eventCreated) {
          toast.success('Booking confirmed and added to your Google Calendar!', {
            description: data.calendar.meetLink ? 'Google Meet link included' : undefined
          })
        } else {
          toast.success('Booking confirmed successfully!')
        }

        router.push('/appointments')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create booking')
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      toast.error('Failed to create booking')
    } finally {
      setBookingLoading(false)
    }
  }

  useEffect(() => {
    fetchSeller()
  }, [fetchSeller])

  useEffect(() => {
    if (selectedDate) {
      setSelectedSlot(null) // Reset selected slot when date changes
      fetchAvailableSlots(selectedDate)
    }
  }, [selectedDate, fetchAvailableSlots])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <p>Loading seller information...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Seller not found</h1>
            <Link href="/sellers">
              <Button>Browse Other Sellers</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to book an appointment</h1>
            <Button onClick={() => router.push('/api/auth/signin')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/sellers">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Book an Appointment</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Seller Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={seller.user.picture} alt={seller.user.name} />
                    <AvatarFallback>
                      {seller.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{seller.user.name}</CardTitle>
                    <p className="text-lg text-muted-foreground">{seller.seller.title}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">About</h3>
                    <p className="text-sm text-muted-foreground">
                      {seller.seller.description || 'No description available.'}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Appointment Details</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>60 minutes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Timezone: {seller.seller.timezone}</span>
                    </div>
                  </div>

                  {seller.availability && seller.availability.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">General Availability</h3>
                      <div className="space-y-1">
                        {seller.availability
                          .filter(avail => avail.isAvailable)
                          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                          .map((avail) => {
                            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                            return (
                              <div key={avail.id} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{dayNames[avail.dayOfWeek]}:</span>
                                <span className="font-medium">{avail.startTime} - {avail.endTime}</span>
                              </div>
                            )
                          })}
                        {seller.availability.filter(avail => avail.isAvailable).length === 0 && (
                          <p className="text-sm text-muted-foreground">No availability set</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Date & Time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <Label className="text-base font-medium">Select a Date</Label>
                  <div className="mt-2">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date < new Date(Date.now() - 24 * 60 * 60 * 1000)}
                      className="rounded-md border"
                    />
                  </div>
                </div>

                {/* Time Slot Selection */}
                {selectedDate && (
                  <div>
                    <Label className="text-base font-medium">
                      Available Times for {selectedDate.toLocaleDateString()}
                    </Label>
                    <div className="mt-2">
                      {slotsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2">Loading available times...</span>
                        </div>
                      ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {availableSlots.map((slot, index) => (
                            <Button
                              key={index}
                              variant={selectedSlot?.start === slot.start ? "default" : "outline"}
                              className="p-2 h-auto"
                              disabled={slot.isBooked}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {new Date(`2000-01-01T${slot.start}`).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No available time slots for this date</p>
                          <p className="text-sm">Please select a different date</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {/* Booking Summary & Confirmation */}
                {selectedSlot && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Booking Summary</h3>
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Provider:</span>
                        <span className="font-medium">{seller.user.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service:</span>
                        <span className="font-medium">{seller.seller.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="font-medium">
                          {selectedDate?.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="font-medium">
                          {new Date(`2000-01-01T${selectedSlot.start}`).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} - {new Date(`2000-01-01T${selectedSlot.end}`).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-medium">60 minutes</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={bookingLoading}
                      className="w-full mt-6"
                      size="lg"
                    >
                      {bookingLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Confirming Booking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm Booking
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
