"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton({ className }: { className?: string }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
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