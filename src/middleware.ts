import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const isAuth = !!req.nextauth.token
    const isAuthPage = req.nextUrl.pathname.startsWith('/login')
    const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')

    if (isApiAuthRoute) {
      return NextResponse.next()
    }

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/chantiers', req.url))
      }
      return NextResponse.next()
    }

    if (!isAuth) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => true
    }
  }
)

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ]
} 