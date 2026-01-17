import { type NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/auth/login', '/auth/signup'];

/**
 * Check if user has a valid auth session by looking for Supabase auth cookies.
 * This is a lightweight check that avoids using the full Supabase client in Edge Runtime
 * which can cause "Code generation from strings disallowed" errors.
 */
function hasAuthSession(request: NextRequest): boolean {
  // Supabase stores auth in cookies with this pattern
  const cookies = request.cookies.getAll();

  // Look for the auth token cookie (format: sb-<project-ref>-auth-token)
  const hasAuthToken = cookies.some(
    cookie => cookie.name.includes('-auth-token') && cookie.value.length > 0
  );

  return hasAuthToken;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route needs auth handling
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Skip middleware for routes that don't need auth
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  const hasSession = hasAuthSession(request);

  // Protected route without session -> redirect to login
  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth route with session -> redirect to dashboard
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match auth-related routes to avoid Edge runtime issues on other pages
    '/dashboard/:path*',
    '/auth/:path*',
  ],
};
