import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (!process.env.EXAM_DATE) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === '/exam') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Macro Guru is temporarily unavailable during the exam period.' },
      { status: 503 }
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = '/exam';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
