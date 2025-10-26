import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/sign-in', '/api/auth', '/auth-error'];

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('better-auth.session_token');

  // Debug logging (will show in Vercel function logs)
  console.log('[Middleware] Path:', pathname);
  console.log('[Middleware] All cookies:', request.cookies.getAll().map(c => c.name).join(', ') || 'none');
  console.log('[Middleware] Session token present:', !!sessionToken);

  // Redirect to sign-in if no session
  if (!sessionToken) {
    console.log('[Middleware] No session token, redirecting to sign-in');
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  console.log('[Middleware] Session token found, allowing access');
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
