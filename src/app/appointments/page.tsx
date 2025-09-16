'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Clock,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  CalendarDays
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface OtherParty {
  name: string
  title?: string
  email: string
  picture?: string
}

interface Appointment {
  id: string
  startTime: string
  endTime: string
  status: string
  timezone: string
  userRole: 'buyer' | 'seller'
  otherParty: OtherParty
  notes?: string
}

interface AppointmentsApiResponse {
  success: boolean
  appointments: Appointment[]
  userRole: 'buyer' | 'seller'
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return <CheckCircle className="h-4 w-4" />
    case 'pending':
      return <AlertCircle className="h-4 w-4" />
    case 'cancelled':
      return <XCircle className="h-4 w-4" />
    case 'completed':
      return <CheckCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const formatDateTime = (dateTimeString: string) => {
  const date = new Date(dateTimeString)
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

const AppointmentCard = ({ appointment, onAppointmentUpdate }: {
  appointment: Appointment
  onAppointmentUpdate: () => void
}) => {
  const [cancelling, setCancelling] = useState(false)

  const { date, time } = formatDateTime(appointment.startTime)
  const endTime = new Date(appointment.endTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const otherUser = appointment.otherParty
  const roleLabel = appointment.userRole === 'buyer' ? 'Service Provider' : 'Client'

  const handleCancelAppointment = async () => {
    setCancelling(true)
    try {
      const response = await fetch(`/api/appointments/${appointment.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.calendarCancelled && data.calendarResults?.length > 0) {
          const events = data.calendarResults.join(' and ')
          toast.success(`Appointment cancelled and ${events} calendar event(s) removed!`)
        } else if (data.calendarCancelled) {
          toast.success('Appointment cancelled and removed from Google Calendar!')
        } else {
          toast.success('Appointment cancelled successfully!')
        }
        onAppointmentUpdate()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to cancel appointment')
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast.error('Failed to cancel appointment')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Card className="max-w-lg w-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherUser?.picture} alt={otherUser?.name} />
              <AvatarFallback>
                {otherUser?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name}</h3>
              {otherUser?.title && (
                <p className="text-sm text-muted-foreground">{otherUser.title}</p>
              )}
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${getStatusColor(appointment.status)} border`}
          >
            <span className="flex items-center gap-1">
              {getStatusIcon(appointment.status)}
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{date}</span>
            </div>
            <div className="flex  items-start gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{time} - {endTime}</span>
            </div>
            {appointment.timezone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Timezone: {appointment.timezone}</span>
              </div>
            )}
          </div>

          {/* <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{otherUser?.email}</span>
            </div>
          </div> */}
        </div>

        {appointment.notes && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Notes:</strong> {appointment.notes}
            </p>
          </div>
        )}

        <div className="flex justify-center items-center gap-2 pt-2">
          <Link href={`mailto:${otherUser?.email}`} className="flex gap-2 border  py-2 px-6 rounded-md justify-center items-center">
            <Mail className="h-4 w-4 mr-2" />
            <p className='text-sm'>Contact</p>
          </Link>
          {appointment.status === 'confirmed' && (
            <Button
              variant="destructive"
              size="default"
              className="flex-1"
              onClick={handleCancelAppointment}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AppointmentPage() {
  const { data: session, status } = useSession()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [userRole, setUserRole] = useState<'buyer' | 'seller' | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments')
      if (response.ok) {
        const data: AppointmentsApiResponse = await response.json()
        if (data.success) {
          setAppointments(data.appointments || [])
          setUserRole(data.userRole)
        } else {
          toast.error('Failed to fetch appointments')
        }
      } else {
        toast.error('Failed to fetch appointments')
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast.error('Failed to fetch appointments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchAppointments()
    }
  }, [session])

  // Filter list based on user's role perspective
  const perspectiveAppointments = userRole === 'buyer'
    ? appointments.filter(a => a.userRole === 'buyer')
    : userRole === 'seller'
      ? appointments.filter(a => a.userRole === 'seller')
      : appointments

  const filteredAppointments = perspectiveAppointments.filter(appointment => {
    const appointmentDate = new Date(appointment.startTime)
    const now = new Date()

    switch (filter) {
      case 'upcoming':
        return appointmentDate >= now
      case 'past':
        return appointmentDate < now
      default:
        return true
    }
  })

  const upcomingCount = perspectiveAppointments.filter(apt => new Date(apt.startTime) >= new Date()).length
  const pastCount = perspectiveAppointments.filter(apt => new Date(apt.startTime) < new Date()).length

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <p>Loading appointments...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to view appointments</h1>
            <Button onClick={() => window.location.href = '/api/auth/signin'}>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Appointments</h1>
            <p className="text-muted-foreground">
              Manage your {userRole === 'buyer' ? 'booked services' : 'client appointments'}
              {userRole && ` • Viewing as ${userRole}`}
            </p>
          </div>
          <Link href="/sellers">
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              {userRole === 'buyer' ? 'Book New Appointment' : 'Manage Availability'}
            </Button>
          </Link>
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All ({perspectiveAppointments.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastCount})</TabsTrigger>
          </TabsList>

          <TabsContent value={filter}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading appointments...</span>
              </div>
            ) : filteredAppointments.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onAppointmentUpdate={fetchAppointments}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {filter === 'upcoming'
                    ? 'No upcoming appointments'
                    : filter === 'past'
                      ? 'No past appointments'
                      : 'No appointments found'
                  }
                </h3>
                <p className="text-muted-foreground mb-6">
                  {filter === 'upcoming'
                    ? userRole === 'buyer'
                      ? 'Book your first appointment to get started'
                      : 'Your upcoming client appointments will appear here'
                    : filter === 'past'
                      ? userRole === 'buyer'
                        ? 'Your completed appointments will appear here'
                        : 'Your past client sessions will appear here'
                      : userRole === 'buyer'
                        ? 'Start by booking an appointment with a service provider'
                        : 'Your client appointments will appear here once booked'
                  }
                </p>
                {userRole === 'buyer' && (
                  <Link href="/sellers">
                    <Button>
                      <Calendar className="h-4 w-4 mr-2" />
                      Browse Services
                    </Button>
                  </Link>
                )}
                {userRole === 'seller' && (
                  <Link href="/availability">
                    <Button>
                      <Calendar className="h-4 w-4 mr-2" />
                      Manage Availability
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


