'use client'

import { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, ShoppingBag, Users, Clock, Star, Zap, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface OnboardingDialogProps {
  open: boolean
  onRoleUpdate: () => void
}

interface StepperProps {
  steps: string[]
  currentStep: number
  className?: string
}

const Stepper = ({ steps, currentStep, className }: StepperProps) => {
  return (
    <div className={cn("flex items-center justify-center space-x-4", className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-200",
                index < currentStep
                  ? "bg-primary border-primary text-primary-foreground"
                  : index === currentStep
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {index < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span className={cn(
              "text-xs mt-1 font-medium",
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            )}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-2 transition-all duration-200",
                index < currentStep ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function OnboardingDialog({ open, onRoleUpdate }: OnboardingDialogProps) {
  const { data: session, status } = useSession()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [checkingCalendar, setCheckingCalendar] = useState(false)

  // Combined state for the entire onboarding flow
  const [onboardingData, setOnboardingData] = useState({
    role: null as 'buyer' | 'seller' | null,
    sellerProfile: {
      title: '',
      description: ''
    }
  })

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle authentication redirect
  useEffect(() => {
    if (mounted && status === 'unauthenticated' && open) {
      // Redirect to Google sign-in if user is not authenticated
      signIn('google', { callbackUrl: '/appointments' })
    }
  }, [mounted, status, open])

  if (!mounted) {
    return null
  }

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <Dialog open={open}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Checking authentication...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Redirect to sign-in if not authenticated
  if (status === 'unauthenticated') {
    return (
      <Dialog open={open}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground">Authentication Required</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Please sign in with Google to continue with onboarding
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <Button
              onClick={() => signIn('google', { callbackUrl: '/appointments' })}
              className="w-full"
            >
              Sign in with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Only show onboarding if user is authenticated
  if (status !== 'authenticated' || !session) {
    return null
  }

  const steps = onboardingData.role === 'seller'
    ? ['Role Selection', 'Profile Setup', 'Calendar Integration']
    : onboardingData.role === 'buyer'
      ? ['Role Selection', 'Calendar Integration']
      : ['Role Selection']

  // Check calendar integration status
  const checkCalendarStatus = async () => {
    try {
      setCheckingCalendar(true)
      const response = await fetch('/api/me/calendar-status')
      if (response.ok) {
        const data = await response.json()
        return !data.needsCalendarSetup
      }
      return false
    } catch (error) {
      console.error('Error checking calendar status:', error)
      return false
    } finally {
      setCheckingCalendar(false)
    }
  }

  // Handle calendar integration
  const handleCalendarIntegration = async () => {
    try {
      // Force re-authentication with Google to get calendar permissions
      // This will redirect to Google OAuth with the calendar scope permissions
      window.location.href = '/api/auth/signin/google?callbackUrl=/appointments'
    } catch (error) {
      console.error('Error initiating calendar integration:', error)
      toast.error('Failed to start calendar integration')
    }
  }

  const completeOnboarding = async () => {
    try {
      const response = await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingData),
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      return true
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast.error('Failed to complete onboarding')
      return false
    }
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      // Role selection step
      if (!onboardingData.role) {
        toast.error('Please select a role')
        return
      }

      // Move to next step (calendar integration for buyers, profile setup for sellers)
      setCurrentStep(1)
    } else if (currentStep === 1) {
      if (onboardingData.role === 'seller') {
        // Seller profile setup step - validate and move to calendar integration
        if (!onboardingData.sellerProfile.title.trim()) {
          toast.error('Please enter your professional title')
          return
        }
        if (!onboardingData.sellerProfile.description.trim()) {
          toast.error('Please enter a description of your services')
          return
        }
        setCurrentStep(2) // Move to calendar integration
      } else if (onboardingData.role === 'buyer') {
        // Buyer calendar integration step - check status and complete onboarding
        const hasCalendar = await checkCalendarStatus()
        if (hasCalendar) {
          setLoading(true)
          const success = await completeOnboarding()
          if (success) {
            toast.success('Welcome! Your account has been set up.')
            setTimeout(() => {
              onRoleUpdate()
            }, 100)
          }
          setLoading(false)
        } else {
          toast.error('Please connect your Google Calendar to continue')
        }
      }
    } else if (currentStep === 2 && onboardingData.role === 'seller') {
      // Seller calendar integration step - check status and complete onboarding
      const hasCalendar = await checkCalendarStatus()
      if (hasCalendar) {
        setLoading(true)
        const success = await completeOnboarding()
        if (success) {
          toast.success('Welcome! Your seller profile has been created.')
          setTimeout(() => {
            onRoleUpdate()
          }, 100)
        }
        setLoading(false)
      } else {
        toast.error('Please connect your Google Calendar to continue')
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStepContent = () => {
    if (currentStep === 0) {
      // Role Selection Step
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Role</h2>
            <p className="text-muted-foreground">How would you like to use our booking platform?</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Buyer Card */}
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200 border-2 hover:shadow-md",
                onboardingData.role === 'buyer'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => setOnboardingData(prev => ({ ...prev, role: 'buyer' }))}
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold text-foreground">
                  I&apos;m a Client
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Book appointments and services from providers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2 text-primary" />
                  Browse and book appointments
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-2 text-primary" />
                  Manage your bookings
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Star className="w-4 h-4 mr-2 text-primary" />
                  Rate and review services
                </div>
              </CardContent>
            </Card>

            {/* Seller Card */}
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200 border-2 hover:shadow-md",
                onboardingData.role === 'seller'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => setOnboardingData(prev => ({ ...prev, role: 'seller' }))}
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-secondary-foreground" />
                </div>
                <CardTitle className="text-xl font-semibold text-foreground">
                  I&apos;m a Provider
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Offer services and manage appointments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2 text-secondary-foreground" />
                  Set your availability
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Zap className="w-4 h-4 mr-2 text-secondary-foreground" />
                  Manage your services
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="w-4 h-4 mr-2 text-secondary-foreground" />
                  Connect with customers
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    } else if (currentStep === 1 && onboardingData.role === 'seller') {
      // Seller Profile Setup Step
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Set Up Your Profile</h2>
            <p className="text-muted-foreground">Tell us about your services to attract more clients</p>
          </div>

          <div className="space-y-6 max-w-md mx-auto">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-foreground">
                Professional Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Marketing Consultant, Life Coach, Tutor"
                value={onboardingData.sellerProfile.title}
                onChange={(e) => setOnboardingData(prev => ({
                  ...prev,
                  sellerProfile: { ...prev.sellerProfile, title: e.target.value }
                }))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                This will be displayed to potential clients
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-foreground">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your services, experience, and what makes you unique..."
                value={onboardingData.sellerProfile.description}
                onChange={(e) => setOnboardingData(prev => ({
                  ...prev,
                  sellerProfile: { ...prev.sellerProfile, description: e.target.value }
                }))}
                className="w-full min-h-[100px]"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Help clients understand what you offer and your expertise
              </p>
            </div>
          </div>
        </div>
      )
    } else if ((currentStep === 2 && onboardingData.role === 'seller') || (currentStep === 1 && onboardingData.role === 'buyer')) {
      // Calendar Integration Step (for both buyers and sellers)
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Connect Google Calendar</h2>
            <p className="text-muted-foreground">
              Calendar integration is required for automatic appointment scheduling and meeting links
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="border-2 border-dashed border-muted-foreground/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Google Calendar Required</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>✓ Automatic calendar events for all appointments</p>
                      <p>✓ Google Meet links for virtual meetings</p>
                      <p>✓ Real-time availability synchronization</p>
                      <p>✓ Appointment reminders and notifications</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleCalendarIntegration}
                    disabled={checkingCalendar}
                    className="w-full"
                  >
                    {checkingCalendar ? 'Checking...' : 'Connect Google Calendar'}
                  </Button>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>You&apos;ll be redirected to Google to grant calendar permissions</p>
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-blue-700 dark:text-blue-300 font-medium">
                        💡 Already granted permissions? Click &quot;Complete Setup&quot; below to continue!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl min-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-foreground">
            Welcome to Your Booking Platform!
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Let&apos;s get you set up in just a few steps
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="my-8">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || loading}
            className="flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={
              loading ||
              (currentStep === 0 && !onboardingData.role) ||
              (currentStep === 1 && onboardingData.role === 'seller' && (!onboardingData.sellerProfile.title.trim() || !onboardingData.sellerProfile.description.trim()))
            }
            className="flex items-center"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                {currentStep === 0 ? 'Setting up...' : 'Creating profile...'}
              </div>
            ) : (
              <>
                {currentStep === 0
                  ? (onboardingData.role === 'buyer' ? 'Complete Setup' : 'Continue')
                  : 'Complete Setup'
                }
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
