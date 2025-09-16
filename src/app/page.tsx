'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignInButton } from "@/components/auth/SignInButton"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, Star, Clock } from 'lucide-react'
import AvailabilityCalendar from '@/components/availability-calendar'

export default function HomePage() {
  const { data: session, status } = useSession() as { data: Session | null, status: string }
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && status === 'authenticated') {
      if (session?.user?.role === 'seller' || session?.user?.role === 'both') {
        // Stay on home and show calendar for sellers
        return
      }
      // Buyers go to appointments
      router.push('/appointments')
    }
  }, [mounted, status, session?.user?.role, router])

  // Show loading state until mounted to prevent hydration issues
  if (!mounted || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="space-y-6">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Welcome to BookEasy
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your all-in-one booking platform connecting buyers and sellers seamlessly
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              <Card className="text-left">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    For Buyers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Discover and book services from trusted professionals.
                    Manage your appointments with ease.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-left">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    For Sellers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Showcase your services and manage bookings efficiently.
                    Grow your business with our platform.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-left">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    Easy Scheduling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Smart calendar integration and real-time availability
                    for seamless appointment scheduling.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-left">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    Quality Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Reviews and ratings system to ensure quality
                    and build trust in our community.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* CTA Section */}
            <div className="mt-12 space-y-4">
              <SignInButton />
              <p className="text-sm text-muted-foreground">
                Sign in with Google to get started
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated: show seller calendar on home
  if (session?.user?.role === 'seller' || session?.user?.role === 'both') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Card className="border-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80">
            <CardContent className="p-6">
              <div className="text-primary-foreground">
                <h1 className="text-3xl font-bold mb-2">Your Calendar</h1>
                <p className="opacity-90">Manage your availability and bookings</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <AvailabilityCalendar />
      </div>
    )
  }

  return null
}
