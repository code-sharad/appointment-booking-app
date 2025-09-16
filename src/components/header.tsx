'use client';

import { useSession, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import Link from 'next/link';
import {
  Calendar,
  LogOut
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SignInButton } from './auth/SignInButton';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Header() {
  const { data: session, status } = useSession() as { data: Session | null, status: string };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BookingApp</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            {session?.user?.role === 'seller' || session?.user?.role === 'both' ? (
              <>
                <Link
                  href="/"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Home
                </Link>
                <Link
                  href="/appointments"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Appointments
                </Link>
                <Link
                  href="/availability"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Availability
                </Link>
              </>
            ) : null}
            {session?.user?.role === 'buyer' || session?.user?.role === 'both' ? (
              <>
                <Link
                  href="/appointments"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  My Appointments
                </Link>
                <Link
                  href="/sellers"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Browse Sellers
                </Link>
              </>
            ) : null}
          </nav>

          {/* User Account Section */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {status === 'loading' ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={session?.user?.image || ''}
                        alt={session?.user?.name || ''}
                      />
                      <AvatarFallback>
                        {session?.user?.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session?.user?.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session?.user?.email}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {session?.user?.role?.charAt(0).toUpperCase() + session?.user?.role?.slice(1)}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  {/* <Link href="/auth/signin">Sign in</Link> */}
                  <SignInButton />

                </Button>

              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}