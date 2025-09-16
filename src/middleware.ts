import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected admin routes
  const adminRoutes = ['/admin', '/admin-setup']
  const isAdminRoute = adminRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  if (isAdminRoute) {
    // Check if user is authenticated
    if (!session) {
      const redirectUrl = new URL('/', req.url)
      redirectUrl.searchParams.set('message', 'Please sign in to access admin features')
      return NextResponse.redirect(redirectUrl)
    }

    // For admin routes (not admin-setup), check if user has admin role
    if (req.nextUrl.pathname.startsWith('/admin') && !req.nextUrl.pathname.startsWith('/admin-setup')) {
      try {
        // Check if user has admin role in their JWT or metadata
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('metadata')
          .eq('id', session.user.id)
          .single()

        const isAdmin = session.user.user_metadata?.role === 'admin' || 
                       profile?.metadata?.role === 'admin'

        if (!isAdmin) {
          // Redirect to admin setup if not admin
          return NextResponse.redirect(new URL('/admin-setup', req.url))
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        return NextResponse.redirect(new URL('/admin-setup', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}