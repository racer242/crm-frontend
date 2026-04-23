/**
 * Environment variable utilities for server-side macro resolution
 */

/**
 * Get filtered environment variables for MacroEngine
 * Only returns NEXT_PUBLIC_* variables that are defined
 */
export function getServerEnv(): Record<string, string> {
  if (typeof process === "undefined") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(process.env)
      .filter(
        ([key, val]) => key.startsWith("NEXT_PUBLIC_") && val !== undefined,
      )
      .map(([key, val]) => [key, val as string]),
  );
}
