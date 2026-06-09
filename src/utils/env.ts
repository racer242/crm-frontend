/**
 * Environment variable utilities
 *
 * - getServerEnv(): SERVER ONLY — returns ALL process.env variables
 * - getPublicEnv(): safe for client — returns process.env (which on client only contains NEXT_PUBLIC_*)
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
 * Get environment variables available in the current context.
 * On the client this will only contain NEXT_PUBLIC_* variables (bundled by Next.js).
 * On the server this returns all process.env variables.
 * Safe to call from any context.
 */
export function getPublicEnv(): Record<string, string> {
  if (typeof process === "undefined") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(process.env)
      .filter(([_, val]) => val !== undefined)
      .map(([key, val]) => [key, val as string]),
  );
}
