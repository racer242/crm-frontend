/**
 * Location utilities for server and client side
 */

/**
 * Parsed location with URL params and path params
 */
export interface ParsedLocation extends Location {
  params: Record<string, string>; // search params (?key=value)
  pathParams: string[]; // path segments (/users/312 -> ['312'])
}

/**
 * Get location object on server side
 * @param searchParams - URL search parameters
 * @param pathname - Current path
 * @param pathParams - Path segments after the matched route
 */
export async function getServerLocation(
  searchParams: Record<string, string | string[] | undefined>,
  pathname?: string,
  pathParams: string[] = [],
): Promise<ParsedLocation> {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  const host = headerList.get("host") || "localhost";
  const protocol = headerList.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;
  const queryString = new URLSearchParams(searchParams as any).toString();
  const search = queryString ? `?${queryString}` : "";

  // Parse search params into {param: value} object
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) {
      params[key] = Array.isArray(value) ? value.join(",") : value;
    }
  }

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
    params,
    pathParams,
  } as ParsedLocation;
}

/**
 * Get location object on client side
 * Returns window.location with parsed params
 */
export function getClientLocation(): ParsedLocation {
  if (typeof window === "undefined") {
    throw new Error("getClientLocation can only be called on the client");
  }

  // Parse search params into {param: value} object
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(window.location.search);
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  // Parse path params from remaining pathname after route
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const pathParams = pathParts.slice(1); // skip first segment (could be route)

  return {
    ...window.location,
    params,
    pathParams,
  } as ParsedLocation;
}
