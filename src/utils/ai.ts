const PAGE_TIMEOUT_MS = 8_000;
const PAGE_TEXT_LIMIT = 4_000;
const AI_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;
const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-awq';

export interface PageMetadata {
  text: string;
  title: string;
  description: string;
  themeColor: string | null;
}

export interface AiSummaryResult {
  summary: string;
  tags: string[];
}

interface AiCacheResult extends AiSummaryResult {}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractJsonObject(value: string): string | null {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return value.slice(start, end + 1);
}

function sanitizeThemeColor(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^hsl[a]?\(.+\)$/.test(trimmed)) return trimmed;
  if (/^rgb[a]?\(.+\)$/.test(trimmed)) return trimmed;
  return null;
}

function normalizeTags(tags: unknown, existingTags: string[]): string[] {
  if (!Array.isArray(tags)) return [];

  const existingMap = new Map(existingTags.map((tag) => [tag.toLowerCase(), tag]));
  const result: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const normalized = normalizeWhitespace(String(tag ?? ''));
    if (!normalized) continue;

    const canonical = existingMap.get(normalized.toLowerCase()) ?? normalized;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(canonical);

    if (result.length >= 3) break;
  }

  return result;
}

async function fetchPage(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);

  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'LinkMarkBot/1.0 (+https://workers.dev)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function extractPageMetadata(url: string): Promise<PageMetadata> {
  const response = await fetchPage(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  let title = '';
  let description = '';
  let themeColor: string | null = null;
  let bodyText = '';

  const rewritten = new HTMLRewriter()
    .on('title', {
      text(text) {
        title += text.text;
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        description ||= element.getAttribute('content') || '';
      },
    })
    .on('meta[name="theme-color"]', {
      element(element) {
        themeColor ||= sanitizeThemeColor(element.getAttribute('content'));
      },
    })
    .on('body', {
      text(text) {
        if (bodyText.length >= PAGE_TEXT_LIMIT) return;
        bodyText += text.text;
      },
    })
    .transform(response);

  await rewritten.text();

  const parts = [title, description, bodyText]
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  return {
    title: normalizeWhitespace(title),
    description: normalizeWhitespace(description),
    themeColor,
    text: normalizeWhitespace(parts.join('\n')).slice(0, PAGE_TEXT_LIMIT),
  };
}

export async function extractPageText(url: string): Promise<string> {
  const metadata = await extractPageMetadata(url);
  return metadata.text;
}

export async function extractThemeColor(url: string): Promise<string | null> {
  const metadata = await extractPageMetadata(url);
  return metadata.themeColor;
}

export async function hashString(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function getCachedAiResult(env: Env, url: string): Promise<AiCacheResult | null> {
  const cacheKey = `ai:${await hashString(url)}`;
  const cached = await env.CACHE.get(cacheKey);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached) as Partial<AiCacheResult>;
    if (!parsed.summary) return null;
    return {
      summary: normalizeWhitespace(parsed.summary),
      tags: normalizeTags(parsed.tags ?? [], []),
    };
  } catch {
    return null;
  }
}

export async function setCachedAiResult(env: Env, url: string, result: AiCacheResult): Promise<void> {
  const cacheKey = `ai:${await hashString(url)}`;
  await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: AI_CACHE_TTL_SECONDS });
}

export async function summarizeAndTag(
  env: Env,
  text: string,
  existingTags: string[]
): Promise<AiSummaryResult> {
  const prompt = text.slice(0, PAGE_TEXT_LIMIT);
  const response = await env.AI.run(AI_MODEL, {
    messages: [
      {
        role: 'system',
        content:
          '你是书签整理助手。请只输出 JSON，对应结构为 {"summary":"中文2-3句摘要","tags":["最多3个标签"]}。摘要要简洁、准确、避免夸张。标签优先复用已有标签，也允许提出少量新标签。',
      },
      {
        role: 'user',
        content: `已有标签：${existingTags.length ? existingTags.join('、') : '无'}\n\n网页文本：\n${prompt}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 300,
    temperature: 0.2,
  });

  const rawResponse = normalizeWhitespace(response.response || '');
  const jsonText = extractJsonObject(rawResponse);
  if (!jsonText) {
    throw new Error('AI returned non-JSON response');
  }

  const parsed = JSON.parse(jsonText) as { summary?: unknown; tags?: unknown };
  const summary = normalizeWhitespace(String(parsed.summary ?? '')).slice(0, 240);
  if (!summary) {
    throw new Error('AI summary is empty');
  }

  return {
    summary,
    tags: normalizeTags(parsed.tags, existingTags),
  };
}
