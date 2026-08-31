import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge guard for dashboard routes. (Next.js 16 renamed this convention from
 * `middleware.ts` to `proxy.ts`.)
 *
 * The dashboard previously had no middleware at all: every route was reachable
 * by anyone who typed the URL, and protection existed only as a `useEffect`
 * inside the layout that ran *after* the page had already been served.
 *
 * Tokens live in localStorage, which the edge runtime cannot read, so this
 * cannot verify a session on its own — a `ckm_session` cookie is written
 * alongside the tokens at login purely as a navigation hint. Real enforcement
 * stays where it belongs: the API checks a permission class on every request.
 */
export default function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const hasSessionHint = request.cookies.has('ckm_session');

    if (pathname.startsWith('/dashboard') && !hasSessionHint) {
        const login = new URL('/login', request.url);
        login.searchParams.set('reason', 'required');
        login.searchParams.set('next', `${pathname}${search}`);
        return NextResponse.redirect(login);
    }

    if (pathname === '/login' && hasSessionHint) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login'],
};
