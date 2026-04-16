export type Handler = (
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  params: Record<string, string>
) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  get(path: string, handler: Handler) { this.add('GET', path, handler); }
  post(path: string, handler: Handler) { this.add('POST', path, handler); }
  put(path: string, handler: Handler) { this.add('PUT', path, handler); }
  delete(path: string, handler: Handler) { this.add('DELETE', path, handler); }

  private add(method: string, path: string, handler: Handler) {
    const keys: string[] = [];
    const patternStr = path.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({ method, pattern: new RegExp(`^${patternStr}$`), keys, handler });
  }

  async handle(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    for (const route of this.routes) {
      if (req.method !== route.method) continue;
      const match = url.pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.keys.forEach((key, i) => { params[key] = match[i + 1]; });
        return route.handler(req, env, ctx, params);
      }
    }
    return new Response('Not Found', { status: 404 });
  }
}
