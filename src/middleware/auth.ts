export function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of header.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

const PUBLIC_PATHS = [
  /^\/s\//,
  /^\/login$/,
  /^\/api\/login$/,
  /^\/c\/[^/]+$/,
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((pattern) => pattern.test(pathname));
}

/**
 * Check if a request is authenticated.
 * Returns null if authenticated, or a redirect Response to /login if not.
 */
export function requireAuth(req: Request, env: Env): Response | null {
  // Check cookie first (browser sessions)
  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  if (cookies['auth_token'] === env.AUTH_TOKEN) return null;

  // Check Authorization header (API calls)
  const authHeader = req.headers.get('Authorization');
  if (authHeader === `Bearer ${env.AUTH_TOKEN}`) return null;

  // Not authenticated
  return new Response(null, { status: 302, headers: { Location: '/login' } });
}

/** Create a Set-Cookie header value for the auth token */
export function createAuthCookie(token: string): string {
  return `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`;
}

/** Create a Set-Cookie header that clears the auth token */
export function clearAuthCookie(): string {
  return `auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
