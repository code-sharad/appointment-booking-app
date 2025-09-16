"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function SignInButton({ className }: { className?: string }) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || status === "loading") {
    return <Button disabled className={className}>Loading...</Button>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Welcome, {session.user?.name}
        </span>
        <Button onClick={() => signOut()} variant="outline">
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => signIn("google", {
        callbackUrl: "/appointments",
        redirect: true
      })}
      size="lg"
      className={`${className || ''}`}
    >
      Sign in with Google
    </Button>
  );
}