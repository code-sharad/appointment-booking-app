/* eslint-disable @typescript-eslint/no-explicit-any */
import GoogleProvider from "next-auth/providers/google";
import { DatabaseQueries } from "@/lib/db/queries";
import { encrypt, decrypt } from "@/lib/encryption";


// Refresh access token function
type JWTToken = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  error?: string;
};


export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly"
          ].join(" "),
          access_type: "offline",
          prompt: "consent", // Force consent screen to get refresh token
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: { token: any, account: any, user: any }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.scope = account.scope;

        // Store tokens in database
        if (account.refresh_token) {
          await DatabaseQueries.upsertUserTokens({
            userId: user.id,
            provider: "google",
            accessToken: account.access_token || "",
            refreshToken: encrypt(account.refresh_token), // Encrypt refresh token
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scope: account.scope || "",
            tokenType: account.token_type || "Bearer",
          });

          // Check if user has granted calendar permissions
          const hasCalendarPermissions = account.scope?.includes('https://www.googleapis.com/auth/calendar.events') || false;

          // Update user's calendar integration status
          if (hasCalendarPermissions) {
            await DatabaseQueries.updateUserCalendarIntegration(user.id, true);
          }
        }

        // Get or create user role
        const dbUser = await DatabaseQueries.getUserByGoogleId(account.providerAccountId);
        if (dbUser) {
          token.role = dbUser.role;
          token.userId = dbUser.id;
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Access token has expired, try to refresh it
      return await refreshAccessToken(token);
    },
    async session({ session, token }: { session: any, token: any }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string;
      session.user.id = token.userId as string;
      session.error = token.error as string;

      // Always fetch fresh user data from database to get updated role
      if (token.userId) {
        try {
          const user = await DatabaseQueries.getUserById(token.userId as string);
          if (user) {
            session.user.role = user.role;
            session.user.email = user.email;
            session.user.name = user.name;
            session.user.image = user.picture || undefined;
          }
        } catch (error) {
          console.error("Error fetching fresh user data in session callback:", error);
          // Fallback to token data
          session.user.role = token.role as string;
        }
      } else {
        session.user.role = token.role as string;
      }

      return session;
    },
    async signIn({ user, account }: { user: any, account: any }) {
      if (account?.provider === "google") {
        try {
          // Create or update user in our database
          let dbUser = await DatabaseQueries.getUserByGoogleId(account.providerAccountId);

          if (!dbUser) {
            // Create new user
            dbUser = await DatabaseQueries.createUser({
              googleId: account.providerAccountId,
              email: user.email!,
              name: user.name!,
              picture: user.image,
              role: "notdefined", // Default role
            });
          } else {
            // Update existing user info
            await DatabaseQueries.updateUser(dbUser.email, {
              name: user.name!,
              picture: user.image,
              updatedAt: new Date(),
            });
          }

          user.id = dbUser.id;
          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }
      return true;
    },
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};





async function refreshAccessToken(token: JWTToken) {
  try {
    if (!token.userId) {
      throw new Error("User ID is required");
    }
    const dbTokens = await DatabaseQueries.getUserTokens(token.userId);
    if (!dbTokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    // Decrypt the refresh token
    const decryptedRefreshToken = decrypt(dbTokens.refreshToken);

    const response = await fetch("https://oauth2.googleapis.com/token", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: decryptedRefreshToken,
      }),
      method: "POST",
    });

    const tokens = await response.json();

    if (!response.ok) {
      throw tokens;
    }


    // Update tokens in database
    await DatabaseQueries.upsertUserTokens({
      userId: token.userId,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : dbTokens.refreshToken,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: dbTokens.scope,
    });

    return {
      ...token,
      accessToken: tokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
      refreshToken: tokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}


