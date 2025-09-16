import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    // Redirect unauthenticated users from protected pages to sign-in
    if (!token && (pathname === "/" || pathname.startsWith("/availability") || pathname.startsWith("/appointments") || pathname.startsWith("/seller"))) {
      const signInUrl = new URL("/api/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(signInUrl);
    }

    // Protect seller routes
    if (pathname.startsWith("/api/me/seller")) {
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

    }



    // Protect user routes (API)
    if (pathname.startsWith("/api/me")) {
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Protect availability page - seller or both only
    if (pathname.startsWith("/availability")) {
      if (!token) {
        const signInUrl = new URL("/api/auth/signin", req.url);
        signInUrl.searchParams.set("callbackUrl", req.url);
        return NextResponse.redirect(signInUrl);
      }
      if (token?.role !== "seller" && token?.role !== "both") {
        return NextResponse.redirect(new URL("/appointments", req.url));
      }
    }

    // Protect appointments page - allow buyer and seller
    if (pathname.startsWith("/appointments")) {
      // if (!token) {
      //   const signInUrl = new URL("/api/auth/signin", req.url);
      //   signInUrl.searchParams.set("callbackUrl", req.url);
      //   return NextResponse.redirect(signInUrl);
      // }
      // if (token?.role !== "buyer" && token?.role !== "seller" && token?.role !== "both") {
      //   return NextResponse.redirect(new URL("/sellers", req.url));
      // }
    }

    // Protect seller pages - redirect unauthenticated users
    if (pathname.startsWith("/seller")) {
      if (!token) {
        const signInUrl = new URL("/api/auth/signin", req.url);
        signInUrl.searchParams.set("callbackUrl", req.url);
        return NextResponse.redirect(signInUrl);
      }
      if (token?.role !== "seller" && token?.role !== "both") {
        // Redirect to appointments if user doesn't have seller role
        return NextResponse.redirect(new URL("/appointments", req.url));
      }
    }

    // Protect booking pages - redirect unauthenticated users
    if (pathname.startsWith("/book")) {
      if (!token) {
        const signInUrl = new URL("/api/auth/signin", req.url);
        signInUrl.searchParams.set("callbackUrl", req.url);
        return NextResponse.redirect(signInUrl);
      }
    }

    // Protect root page - redirect unauthenticated users
    if (pathname === "/") {
      if (!token) {
        const signInUrl = new URL("/api/auth/signin", req.url);
        signInUrl.searchParams.set("callbackUrl", req.url);
        return NextResponse.redirect(signInUrl);
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow access to public routes
        if (pathname.startsWith("/api/sellers") && req.method === "GET") {
          return true;
        }

        // Allow access to auth routes
        if (pathname.startsWith("/api/auth")) {
          return true;
        }

        // Allow access to other public pages (not root)
        if (pathname.startsWith("/public")) {
          return true;
        }

        // For protected routes, require authentication
        if (
          pathname === "/" ||
          pathname.startsWith("/availability") ||
          pathname.startsWith("/appointments") ||
          pathname.startsWith("/seller") ||
          pathname.startsWith("/book") ||
          pathname.startsWith("/api/me") ||
          pathname.startsWith("/api/buyers")
        ) {
          return !!token;
        }

        // Default: allow access
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/api/me/:path*",
    "/api/buyers/:path*",
    "/availability",
    "/appointments",
    "/seller/:path*",
    "/book/:path*"
  ]
};