'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, ShoppingBag, Users, Clock, Star, Zap } from "lucide-react"

interface RoleSelectionDialogProps {
  open: boolean
  onRoleSelect: (role: 'buyer' | 'seller') => void
  loading?: boolean
}

export function RoleSelectionDialog({ open, onRoleSelect, loading }: RoleSelectionDialogProps) {
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | null>(null)

  const handleConfirm = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Welcome to Cal.Book!
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 text-lg">
            Please select your role to get started with your personalized experience
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Buyer Card */}
          <Card
            className={`cursor-pointer transition-all duration-200 border-2 ${selectedRole === 'buyer'
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            onClick={() => setSelectedRole('buyer')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Im a Buyer
              </CardTitle>
              <CardDescription className="text-gray-600">
                Book appointments and services from sellers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                Browse and book appointments
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2 text-blue-500" />
                Manage your bookings
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Star className="w-4 h-4 mr-2 text-blue-500" />
                Rate and review services
              </div>
            </CardContent>
          </Card>

          {/* Seller Card */}
          <Card
            className={`cursor-pointer transition-all duration-200 border-2 ${selectedRole === 'seller'
              ? 'border-purple-500 bg-purple-50 shadow-lg'
              : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
              }`}
            onClick={() => setSelectedRole('seller')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">
                Im a Seller
              </CardTitle>
              <CardDescription className="text-gray-600">
                Offer services and manage appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                Set your availability
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Zap className="w-4 h-4 mr-2 text-purple-500" />
                Manage your services
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2 text-purple-500" />
                Connect with customers
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mt-8">
          <Button
            onClick={handleConfirm}
            disabled={!selectedRole || loading}
            className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Setting up your account...
              </div>
            ) : (
              `Continue as ${selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}