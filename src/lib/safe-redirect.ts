/**
 * Returns `next` only if it is a same-origin relative path, else `fallback`.
 * Rejects absolute URLs, protocol-relative `//host`, and backslash tricks
 * (`/\evil.com`) that browsers normalize to a cross-origin redirect.
 */
export function safeRelativePath(
  next: string | null | undefined,
  fallback = "/app",
): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
