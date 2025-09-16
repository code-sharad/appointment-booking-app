// types/next-auth.d.ts - Extend NextAuth types

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      accessToken: string;
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
    };
    error?: string;
  }

  interface User {
    id: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    userId?: string;
    role?: string;
    error?: string;
    scope?: string;
  }
}
