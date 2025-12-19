import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Filtrar requests comunes que generan 404s pero no son errores reales
  const ignoredPaths = [
    '/.well-known',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ]

  // Si es un request ignorado, retornar 404 silencioso
  if (ignoredPaths.some(path => pathname.startsWith(path))) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}



