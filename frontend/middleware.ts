import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that require authentication
const protectedRoutes = ["/dashboard"]

// Routes that should redirect to dashboard if authenticated
const authRoutes = ["/"]

export function middleware(request: NextRequest) {
  const token = request.cookies.get("gigcredit_token")?.value

  // Note: We can't reliably check localStorage in middleware
  // The actual auth check happens client-side via AuthContext
  // This middleware provides basic protection but client handles the full flow

  const { pathname } = request.nextUrl

  // Check if the current path starts with any protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  // For now, allow all requests - the AuthContext handles redirects client-side
  // This could be enhanced with cookie-based token storage in the future
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
