const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

/** Wrapper for pre-escaped HTML that should not be double-escaped */
export class SafeHtml {
  constructor(public readonly value: string) {}
  toString() { return this.value; }
}

/** Mark a string as already-escaped HTML */
export function raw(s: string): SafeHtml {
  return new SafeHtml(s);
}

/**
 * Tagged template literal for safe HTML composition.
 * Automatically escapes interpolated values unless they are SafeHtml instances.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    if (i >= values.length) return result + str;
    const val = values[i];
    const escaped = val instanceof SafeHtml ? val.value : escapeHtml(String(val ?? ''));
    return result + str + escaped;
  }, '');
}
