'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Clock, MapPin, Calendar, Users } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface TimeSlot {
  start: string
  end: string
}

interface SellerAvailability {
  dayOfWeek: number
  isAvailable: boolean
  timeSlots: TimeSlot[]
}

interface Seller {
  id: string
  businessName: string
  description: string
  profileImage?: string
  location?: string
  timezone: string
  isActive: boolean
  availability: SellerAvailability[]

  user: {
    name: string
    email: string
  }
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

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  // const [sortBy] = useState('rating')
  const [filterByAvailability, setFilterByAvailability] = useState('all')

  useEffect(() => {
    fetchSellers()
  }, [])

  useEffect(() => {
    filterAndSortSellers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellers, searchTerm, filterByAvailability])


  const fetchSellers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sellers')
      if (response.ok) {
        const data = await response.json()
        setSellers(data.sellers || [])
      } else {
        throw new Error('Failed to fetch sellers')
      }
    } catch (error) {
      console.error('Error fetching sellers:', error)
      toast.error('Failed to load sellers')
      // Mock data for development
      const mockSellers: Seller[] = [
        {
          id: '1',
          businessName: 'Sarah\'s Hair Studio',
          description: 'Professional hair cutting and styling services with 10+ years experience.',
          profileImage: '',
          location: 'New York, NY',
          timezone: 'America/New_York',
          isActive: true,
          availability: [
            { dayOfWeek: 1, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
            { dayOfWeek: 2, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
            { dayOfWeek: 3, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
            { dayOfWeek: 4, isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
            { dayOfWeek: 5, isAvailable: true, timeSlots: [{ start: '09:00', end: '15:00' }] },
            { dayOfWeek: 0, isAvailable: false, timeSlots: [] },
            { dayOfWeek: 6, isAvailable: false, timeSlots: [] },
          ],

          user: { name: 'Sarah Johnson', email: 'sarah@example.com' }
        },
        {
          id: '2',
          businessName: 'Mike\'s Fitness Training',
          description: 'Personal training and fitness coaching for all fitness levels.',
          profileImage: '',
          location: 'Los Angeles, CA',
          timezone: 'America/Los_Angeles',
          isActive: true,
          availability: [
            { dayOfWeek: 1, isAvailable: true, timeSlots: [{ start: '06:00', end: '20:00' }] },
            { dayOfWeek: 2, isAvailable: true, timeSlots: [{ start: '06:00', end: '20:00' }] },
            { dayOfWeek: 3, isAvailable: true, timeSlots: [{ start: '06:00', end: '20:00' }] },
            { dayOfWeek: 4, isAvailable: true, timeSlots: [{ start: '06:00', end: '20:00' }] },
            { dayOfWeek: 5, isAvailable: true, timeSlots: [{ start: '06:00', end: '18:00' }] },
            { dayOfWeek: 6, isAvailable: true, timeSlots: [{ start: '08:00', end: '16:00' }] },
            { dayOfWeek: 0, isAvailable: true, timeSlots: [{ start: '10:00', end: '14:00' }] },
          ],

          user: { name: 'Mike Rodriguez', email: 'mike@example.com' }
        },
        {
          id: '3',
          businessName: 'Zen Massage Therapy',
          description: 'Relaxing massage therapy and wellness treatments in a peaceful environment.',
          profileImage: '',
          location: 'Austin, TX',
          timezone: 'America/Chicago',

          isActive: true,
          availability: [
            { dayOfWeek: 1, isAvailable: true, timeSlots: [{ start: '10:00', end: '18:00' }] },
            { dayOfWeek: 2, isAvailable: true, timeSlots: [{ start: '10:00', end: '18:00' }] },
            { dayOfWeek: 3, isAvailable: true, timeSlots: [{ start: '10:00', end: '18:00' }] },
            { dayOfWeek: 4, isAvailable: true, timeSlots: [{ start: '10:00', end: '18:00' }] },
            { dayOfWeek: 5, isAvailable: true, timeSlots: [{ start: '10:00', end: '16:00' }] },
            { dayOfWeek: 6, isAvailable: true, timeSlots: [{ start: '09:00', end: '15:00' }] },
            { dayOfWeek: 0, isAvailable: false, timeSlots: [] },
          ],

          user: { name: 'Lisa Chen', email: 'lisa@example.com' }
        }
      ]
      setSellers(mockSellers)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortSellers = () => {
    let filtered = [...sellers]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(seller =>
        seller.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.user.name.toLowerCase().includes(searchTerm.toLowerCase())

      )
    }

    // Availability filter
    if (filterByAvailability === 'available-today') {
      const today = new Date().getDay()
      filtered = filtered.filter(seller =>
        seller.availability.some(day =>
          day.dayOfWeek === today && day.isAvailable && day.timeSlots.length > 0
        )
      )
    } else if (filterByAvailability === 'available-weekends') {
      filtered = filtered.filter(seller =>
        seller.availability.some(day =>
          (day.dayOfWeek === 0 || day.dayOfWeek === 6) && day.isAvailable && day.timeSlots.length > 0
        )
      )
    }


    setFilteredSellers(filtered)
  }

  const formatTimeSlot = (slot: TimeSlot) => {
    const start = new Date(`2000-01-01T${slot.start}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    const end = new Date(`2000-01-01T${slot.end}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `${start} - ${end}`
  }

  const getAvailabilityToday = (seller: Seller) => {
    const today = new Date().getDay()
    const todayAvailability = seller.availability.find(day => day.dayOfWeek === today)

    if (!todayAvailability || !todayAvailability.isAvailable || todayAvailability.timeSlots.length === 0) {
      return 'Not available today'
    }

    return todayAvailability.timeSlots.map(slot => formatTimeSlot(slot)).join(', ')
  }

  const getWeeklyAvailabilityPreview = (seller: Seller) => {
    const availableDays = seller.availability.filter(day => day.isAvailable && day.timeSlots.length > 0)
    return availableDays.map(day => DAYS_OF_WEEK.find(d => d.value === day.dayOfWeek)?.short).join(', ')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sellers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredSellers.length} of {sellers.length} sellers
          </p>
        </div>
      </div>

      {/* Sellers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSellers.map((seller) => (
          <Card key={seller.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={seller.profileImage} alt={seller.user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {seller.user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg leading-tight">{seller.businessName}</CardTitle>
                  <p className="text-sm text-gray-600">{seller.user.name}</p>
                  {seller.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{seller.location}</span>
                    </div>
                  )}
                </div>

              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Description */}
              <p className="text-sm text-gray-600 line-clamp-2">{seller.description}</p>



              <Separator />

              {/* Today's Availability */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Todays Availability
                </h4>
                <p className="text-sm text-gray-600">{getAvailabilityToday(seller)}</p>
              </div>

              {/* Weekly Schedule Preview */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Available Days
                </h4>
                <p className="text-sm text-gray-600">
                  {getWeeklyAvailabilityPreview(seller) || 'No availability set'}
                </p>
              </div>

              {/* Detailed Weekly Schedule */}
              {/* <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-medium text-xs mb-2 !text-black">WEEKLY SCHEDULE</h4>
                <div className="space-y-1">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayAvailability = seller.availability.find(a => a.dayOfWeek === day.value)
                    const isAvailable = dayAvailability?.isAvailable && dayAvailability.timeSlots.length > 0

                    return (
                      <div key={day.value} className="flex justify-between items-center text-xs">
                        <span className="font-medium w-12 text-black">{day.short}</span>
                        <span className={`${isAvailable ? 'text-green-600' : 'text-gray-400'} text-right flex-1`}>
                          {isAvailable
                            ? dayAvailability.timeSlots.map(slot => formatTimeSlot(slot)).join(', ')
                            : 'Unavailable'
                          }
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div> */}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {/* <Button asChild className="flex-1">
                  <Link href={`/sellers/${seller.id}`}>
                    View Profile
                  </Link>
                </Button> */}
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/book/${seller.id}`}>
                    Book Now
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredSellers.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sellers found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms or filters' : 'No sellers are currently available'}
          </p>
          {searchTerm && (
            <Button onClick={() => {
              setSearchTerm('')
              setFilterByAvailability('all')
            }}>
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}