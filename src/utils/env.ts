/**
 * Environment variable utilities
 *
 * - getServerEnv(): SERVER ONLY — returns ALL process.env variables
 * - getPublicEnv(): safe for client — returns NEXT_PUBLIC_* variables
 */

/**
 * Get ALL environment variables.
 * SERVER ONLY — throws an error if called on the client side.
 */
export async function getServerEnv(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() can only be called on the server. Use getPublicEnv() on the client.",
    );
  }
  return Object.fromEntries(
    Object.entries(process.env)
      .filter(([_, val]) => val !== undefined)
      .map(([key, val]) => [key, val as string]),
  );
}

/**
 * Get NEXT_PUBLIC_* environment variables available in the current context.
 *
 * IMPORTANT: Each NEXT_PUBLIC_* variable MUST be listed explicitly here as a literal
 * `process.env.NEXT_PUBLIC_*` reference. Next.js uses Webpack's DefinePlugin to replace
 * these literal expressions at build time. Dynamic iteration (e.g., Object.entries(process.env))
 * does NOT work on the client because process.env in the browser bundle is not enumerable.
 *
 * Safe to call from any context.
 */
export function getPublicEnv(): Record<string, string> {
  const env: Record<string, string> = {};

  // ── NEXT_PUBLIC_* variables ──────────────────────────────────
  // Each property must be listed as a process.env.NEXT_PUBLIC_* literal
  // so that Next.js can inline the actual value at build time.

  if (process.env.NEXT_PUBLIC_BASE_URL) {
    env.NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.NEXT_PUBLIC_USE_SYSTEM_FONTS) {
    env.NEXT_PUBLIC_USE_SYSTEM_FONTS = process.env.NEXT_PUBLIC_USE_SYSTEM_FONTS;
  }

  return env;
}
