export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}

export function redirectResponse(url: string, status = 302): Response {
  return new Response(null, { status, headers: { Location: url } });
}

export function errorJsonResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
