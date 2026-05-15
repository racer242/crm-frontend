/**
 * Data Feed Types
 * Configuration for external API data fetching and state population
 */

/** HTTP method for data feed requests */
export type DataFeedMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Configuration for a single data feed request
 * Used in page.dataFeed array and sendRequest command
 */
export interface DataFeedConfig {
  /** URL of the external API endpoint */
  url: string;
  /** HTTP method for the request */
  method: DataFeedMethod;
  /** Request body data (for POST/PUT/PATCH) */
  data?: Record<string, any>;
  /**
   * Target address for the response data.
   * Format: "[ELEMENT_ID.]state[.PATH.TO.FIELD]"
   * - "ordersTable.state.data" → element with id "ordersTable", state.data field
   * - "state.feed.orders" → current page element, state.feed.orders field
   * - "state.loading" → current page element, state.loading field
   */
  target: string;
  /** Enable caching for this request (not yet implemented) */
  cache?: boolean;
  /** Cache time-to-live in milliseconds (not yet implemented) */
  cacheTTL?: number;
  /**
   * Adapter ID to transform the response data.
   * References an adapter defined in the root `adapters` config.
   * Can be a string (response adapter) or object with request/response.
   */
  adapter?: string | DataFeedAdapter;
}

/**
 * API Router configuration
 * Maps short route names to external API URLs
 */
export interface ApiRouteConfig {
  /** Route name, used as /api/ROUTE_NAME */
  path: string;
  /** Full URL of the external API endpoint */
  url: string;
  /**
   * Adapter ID to transform the response data.
   * References an adapter defined in the root `adapters` config.
   */
  adapter?: string;
}

/**
 * Parameters for the sendRequest command
 */
export interface SendRequestParams {
  /** URL of the API endpoint (can use /api/ROUTE_NAME for router) */
  url: string;
  /** HTTP method for the request */
  method: string;
  /** Request body data */
  data?: Record<string, any>;
  /** Target address for the response data */
  target: string;
  /** Adapter for request/response transformation */
  adapter?: string | DataFeedAdapter;
}

/**
 * Result of a data feed request execution
 */
export interface DataFeedResult {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (if successful) */
  data?: any;
  /** Error message (if failed) */
  error?: string;
  /** Target address where data should be stored */
  target: string;
}

/**
 * Adapter configuration for request/response transformation
 */
export interface DataFeedAdapter {
  /** Adapter ID for transforming request data before sending */
  request?: string;
  /** Adapter ID for transforming response data after receiving */
  response?: string;
}

/**
 * Parsed target address
 */
export interface ParsedTarget {
  /** Element ID (null if not specified, meaning current page) */
  elementId: string | null;
  /** Path within the element's state */
  statePath: string;
}
