'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import OnboardingDialog from './onboarding-dialog'

export function OnboardingProvider() {
  const { data: session, status } = useSession() as { data: Session | null, status: string }
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if user needs onboarding
  useEffect(() => {
    if (mounted && status === 'authenticated' && session?.user) {
      // Show onboarding if user role is 'notdefined'
      if (session.user.role === 'notdefined') {
        setShowOnboarding(true)
      }
    }
  }, [mounted, status, session?.user])

  const handleRoleUpdate = () => {
    setShowOnboarding(false)
    // Refresh the session to get updated user data
    window.location.reload()
  }

  if (!mounted) {
    return null
  }

  return (
    <OnboardingDialog
      open={showOnboarding}
      onRoleUpdate={handleRoleUpdate}
    />
  )
}
