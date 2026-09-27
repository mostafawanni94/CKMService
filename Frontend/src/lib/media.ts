/**
 * Links to stored documents (receipts, invoices, ID scans, work photos).
 */

/** A dummy base lets one parser handle absolute and relative URLs alike, and
 *  keeps these usable during server rendering, where there is no
 *  window.location to fall back on. */
const BASE = 'http://media.local';

/**
 * Same-origin href for a stored document.
 *
 * The API signs media links with `request.build_absolute_uri`, so they come
 * back carrying the Django host — right in dev, wrong anywhere the backend is
 * not reachable from the browser. Next proxies `/media/:path*`, so keeping
 * only the path and query sends the link through the dashboard's own origin.
 *
 * The signature rides in the query string and is what authorises the request:
 * media takes no Authorization header, which matters because a plain link
 * could not send one — the token lives in localStorage, not a cookie.
 */
export function mediaHref(url?: string | null): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url, BASE);
        return parsed.pathname + parsed.search;
    } catch {
        return url;
    }
}

/** The file name at the end of a media URL, for display and for `download`. */
export function mediaName(url?: string | null, fallback = 'document'): string {
    if (!url) return fallback;
    try {
        const path = new URL(url, BASE).pathname;
        const last = path.split('/').filter(Boolean).pop();
        return last ? decodeURIComponent(last) : fallback;
    } catch {
        return fallback;
    }
}
