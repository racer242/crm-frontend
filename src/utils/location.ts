/**
 * Location utilities for server and client side
 */

/**
 * Get location object on server side
 * @param searchParams - URL search parameters
 * @param pathname - Current path
 */
export async function getServerLocation(
  searchParams: Record<string, string | string[] | undefined>,
  pathname?: string,
): Promise<Location> {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  const host = headerList.get("host") || "localhost";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;
  const queryString = new URLSearchParams(searchParams as any).toString();
  const search = queryString ? `?${queryString}` : "";

  return {
    host,
    hostname: host.split(":")[0],
    port: host.split(":")[1] || "",
    protocol: `${protocol}:`,
    origin,
    pathname: pathname || "/",
    search,
    href: `${origin}${pathname || "/"}${search}`,
    hash: "",
  } as Location;
}

/**
 * Get location object on client side
 * Returns window.location
 */
export function getClientLocation(): Location {
  if (typeof window === "undefined") {
    throw new Error("getClientLocation can only be called on the client");
  }
  return window.location;
}
