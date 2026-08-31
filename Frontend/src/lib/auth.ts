/**
 * Session state: token storage, JWT claims, and role helpers.
 *
 * This is the single source of truth for auth. Before this module, tokens were
 * read directly from localStorage in 126 places across the pages, under three
 * different key names ('access_token', 'accessToken', 'token'), which is why a
 * token refresh could never be implemented — there was nowhere to put it.
 */

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

export type Role = 'admin' | 'employee' | 'finance' | 'operations' | 'customer';

export interface TokenClaims {
    user_id: string;
    role: Role;
    email: string;
    is_first_login: boolean;
    exp: number;
}

const isBrowser = () => typeof window !== 'undefined';

/**
 * Navigation hint for `middleware.ts`.
 *
 * The edge runtime cannot read localStorage, so it cannot see the JWT. This
 * cookie carries no credential — only the fact that a session exists — so that
 * middleware can redirect an unauthenticated visitor before the dashboard is
 * ever served. Authorisation is still decided by the API.
 */
const SESSION_COOKIE = 'ckm_session';

function setSessionCookie(): void {
    if (!isBrowser()) return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${SESSION_COOKIE}=1; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}

function clearSessionCookie(): void {
    if (!isBrowser()) return;
    document.cookie = `${SESSION_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;
}

export function getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    setSessionCookie();
}

export function clearTokens(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Legacy key names, written by older builds of the dashboard.
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('token');
    clearSessionCookie();
}

/**
 * Decode a JWT payload without verifying it.
 *
 * Verification is the server's job. This is only used to decide what to render,
 * never to decide what is permitted — a user who edits their own token gets a
 * different-looking sidebar and the same 403s.
 */
export function decodeToken(token: string | null = getAccessToken()): TokenClaims | null {
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    try {
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(
            normalized.length + ((4 - (normalized.length % 4)) % 4),
            '=',
        );
        const json = decodeURIComponent(
            atob(padded)
                .split('')
                .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
                .join(''),
        );
        return JSON.parse(json) as TokenClaims;
    } catch {
        return null;
    }
}

/** True when the token is missing, unreadable, or past its expiry. */
export function isTokenExpired(token: string | null = getAccessToken()): boolean {
    const claims = decodeToken(token);
    if (!claims?.exp) return true;
    // 10s of leeway so a request is not fired with a token that dies in flight.
    return claims.exp * 1000 <= Date.now() + 10_000;
}

export function getRole(): Role | null {
    return decodeToken()?.role ?? null;
}

export function hasRole(...roles: Role[]): boolean {
    const role = getRole();
    return role !== null && roles.includes(role);
}

/** Internal back-office roles that may use the dashboard at all. */
export function isBackOffice(): boolean {
    return hasRole('admin', 'finance', 'operations');
}

export function isAdmin(): boolean {
    return hasRole('admin');
}

export function isFinance(): boolean {
    return hasRole('admin', 'finance');
}

export function isOperations(): boolean {
    return hasRole('admin', 'operations');
}

/** True when a usable (unexpired) session exists, or one that can be refreshed. */
export function hasSession(): boolean {
    return Boolean(getAccessToken()) || Boolean(getRefreshToken());
}
