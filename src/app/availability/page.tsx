'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, Save, RotateCcw, Globe, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'Eastern Time (GMT-5)' },
  { value: 'America/Chicago', label: 'Central Time (GMT-6)' },
  { value: 'America/Denver', label: 'Mountain Time (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (GMT-8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Kolkata', label: 'India (GMT+5:30)' },
]

const generateTimeOptions = () => {
  const times = [] as { value: string; label: string }[]
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const display12Hour = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      times.push({ value: timeString, label: display12Hour })
    }
  }
  return times
}

export default function AvailabilityPage() {
  const { data: session, status } = useSession() as { data: Session | null, status: string }
  const [availability, setAvailability] = useState<DayAvailability[]>([])
  const [timezone, setTimezone] = useState('UTC')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const timeOptions = generateTimeOptions()

  const router = useRouter();

  const initializeDefaultAvailability = useCallback(() => {
    const defaultAvailability: DayAvailability[] = DAYS_OF_WEEK.map(day => ({
      dayOfWeek: day.value,
      isAvailable: day.value >= 1 && day.value <= 5,
      timeSlots: day.value >= 1 && day.value <= 5
        ? [{ start: '09:00', end: '17:00' }]
        : []
    }))
    setAvailability(defaultAvailability)
  }, [])

  const fetchAvailability = useCallback(async () => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const response = await fetch('/api/me/seller/availability')

      if (response.ok) {
        const data = await response.json()

        if (data.availability && data.availability.length > 0) {
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

          const formattedAvailability: DayAvailability[] = DAYS_OF_WEEK.map(day => ({
            dayOfWeek: day.value,
            isAvailable: availabilityMap.has(day.value),
            timeSlots: availabilityMap.get(day.value) || []
          }))

          setAvailability(formattedAvailability)
        } else {
          initializeDefaultAvailability()
        }

        if (data.timezone) {
          setTimezone(data.timezone)
        }
      } else if (response.status === 404) {
        initializeDefaultAvailability()
      } else {
        throw new Error('Failed to fetch availability')
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
      toast.error('Failed to load availability')
      initializeDefaultAvailability()
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, initializeDefaultAvailability])

  useEffect(() => {
    if (session?.user && !initialized) {
      fetchAvailability()
      setInitialized(true)
    }
  }, [session, initialized, fetchAvailability])

  const updateDayAvailability = (dayOfWeek: number, isAvailable: boolean) => {
    setAvailability(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek
        ? {
          ...day,
          isAvailable,
          timeSlots: isAvailable && day.timeSlots.length === 0
            ? [{ start: '09:00', end: '17:00' }]
            : day.timeSlots
        }
        : day
    ))
  }

  const addTimeSlot = (dayOfWeek: number) => {
    setAvailability(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek
        ? {
          ...day,
          timeSlots: [...day.timeSlots, { start: '09:00', end: '17:00' }]
        }
        : day
    ))
  }

  const removeTimeSlot = (dayOfWeek: number, slotIndex: number) => {
    setAvailability(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek
        ? {
          ...day,
          timeSlots: day.timeSlots.filter((_, index) => index !== slotIndex)
        }
        : day
    ))
  }

  const updateTimeSlot = (dayOfWeek: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek
        ? {
          ...day,
          timeSlots: day.timeSlots.map((slot, index) =>
            index === slotIndex ? { ...slot, [field]: value } : slot
          )
        }
        : day
    ))
  }

  const copyToAllDays = (sourceDay: DayAvailability) => {
    const confirmed = window.confirm('This will copy the schedule to all days. Continue?')
    if (confirmed) {
      setAvailability(prev => prev.map(day => ({
        ...day,
        isAvailable: sourceDay.isAvailable,
        timeSlots: [...sourceDay.timeSlots]
      })))
    }
  }

  const resetToDefault = () => {
    const confirmed = window.confirm('This will reset your schedule to default (Mon-Fri 9-5). Continue?')
    if (confirmed) {
      initializeDefaultAvailability()
    }
  }

  const saveAvailability = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/me/seller/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability, timezone })
      })

      if (response.ok) {
        toast.success('Availability saved successfully!')
        router.push('/availability')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save availability')
      }
    } catch (error) {
      console.error('Error saving availability:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  // Removed unused formatTimeSlots to satisfy lint

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (session?.user?.role !== 'seller' && session?.user?.role !== 'both') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You need to be a seller to access this page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading availability...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Card className="border-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-primary-foreground">
              <div className="p-2 bg-primary-foreground/20 rounded-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Availability</h1>
                <p className="opacity-90">Set your weekly schedule and manage when clients can book with you</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <CardTitle>Timezone</CardTitle>
              </div>
              <CardDescription>
                All times will be displayed in your selected timezone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle>Weekly Schedule</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetToDefault}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
              <CardDescription>
                Configure your availability for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {DAYS_OF_WEEK.map((day) => {
                const dayAvailability = availability.find(a => a.dayOfWeek === day.value)
                if (!dayAvailability) return null

                return (
                  <div key={day.value} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <Label className="text-sm font-medium">{day.label}</Label>
                        </div>
                        <Switch
                          checked={dayAvailability.isAvailable}
                          onCheckedChange={(checked) => updateDayAvailability(day.value, checked)}
                        />
                      </div>

                      {dayAvailability.isAvailable && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTimeSlot(day.value)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Hours
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToAllDays(dayAvailability)}
                          >
                            Copy to All
                          </Button>
                        </div>
                      )}
                    </div>

                    {dayAvailability.isAvailable && (
                      <div className="ml-23 space-y-3">
                        {dayAvailability.timeSlots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex items-center gap-3">
                            <div className="grid grid-cols-2 gap-3 flex-1">
                              <div>
                                <Label className="text-xs text-muted-foreground">Start Time</Label>
                                <Select
                                  value={slot.start}
                                  onValueChange={(value) => updateTimeSlot(day.value, slotIndex, 'start', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((time) => (
                                      <SelectItem key={time.value} value={time.value}>
                                        {time.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">End Time</Label>
                                <Select
                                  value={slot.end}
                                  onValueChange={(value) => updateTimeSlot(day.value, slotIndex, 'end', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map((time) => (
                                      <SelectItem key={time.value} value={time.value}>
                                        {time.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {dayAvailability.timeSlots.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeTimeSlot(day.value, slotIndex)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}

                        {dayAvailability.timeSlots.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">No time slots configured</p>
                        )}
                      </div>
                    )}

                    {!dayAvailability.isAvailable && (
                      <div className="ml-23">
                        <Badge variant="secondary" className="text-muted-foreground">
                          Unavailable
                        </Badge>
                      </div>
                    )}

                    <Separator />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Available Days</span>
                <span className="font-medium">
                  {availability.filter(day => day.isAvailable).length} / 7
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Total Hours</span>
                <span className="font-medium">
                  {availability.reduce((total, day) => {
                    if (!day.isAvailable) return total
                    return total + day.timeSlots.reduce((dayTotal, slot) => {
                      const start = new Date(`2000-01-01T${slot.start}`)
                      const end = new Date(`2000-01-01T${slot.end}`)
                      return dayTotal + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                    }, 0)
                  }, 0)} hours/week
                </span>
              </div>
            </CardContent>
          </Card>

          <Button onClick={saveAvailability} disabled={saving} className="w-full" size="lg">
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                Saving...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Availability
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  )
}


