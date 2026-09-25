/**
 * DataFeedServerService
 *
 * Server-side DataFeed execution and macro resolution.
 * Extracted from config.ts to separate concerns.
 */

import {
  DataFeedConfig,
  DataFeedResult,
  MacroSources,
  ApiRouteConfig,
  DataFeedAdapter,
  CampItem,
} from "@/types";
import { MacroEngine } from "./MacroEngine";
import { buildUrlWithParams } from "@/utils/http";
import { parseApiError } from "@/utils/parseApiError";
import { applyAdapter } from "./DataAdapterEngine";
import { PathResolver } from "./PathResolver";
import type { StateManager } from "./StateManager";

let cachedConfig: any = null;

/**
 * Set the cached config reference (called from initApp)
 */
export function setServerConfig(config: any): void {
  cachedConfig = config;
}

/**
 * Execute server-side data feeds for a page
 * Returns array of results with any errors
 */
export async function executeServerDataFeeds(
  pageId: string,
  pageConfig: any,
  serverSources: MacroSources,
  authToken?: string,
  campApiUrl?: string,
): Promise<DataFeedResult[]> {
  const dataFeeds: DataFeedConfig[] | undefined = pageConfig?.dataFeed;

  if (!dataFeeds || dataFeeds.length === 0) {
    return [];
  }

  // Get API routes config
  const apiRoutes: ApiRouteConfig[] | undefined = cachedConfig?.apiRoutes;

  const results: DataFeedResult[] = [];

  // Временное состояние страницы для цепочек фидов: результат каждого
  // успешного фида сразу записывается сюда, поэтому последующие фиды
  // могут ссылаться на него макросами {$state.<target>...} на SSR.
  // Финальное применение к клиентскому StateManager не меняется.
  const feedState = new Map<string, Record<string, any>>();

  const stateShim = {
    // MacroEngine вызывает getStateField(pageId, "a.b.c") — читаем из feedState
    getStateField: (pid: string, path: string): any => {
      const segments = path.split(".").filter(Boolean);
      let node: any = feedState.get(pid || pageId);
      for (const seg of segments) {
        if (node === undefined || node === null || typeof node !== "object") {
          return undefined;
        }
        node = node[seg];
      }
      return node;
    },
  } as unknown as StateManager;

  // Применить результат фида во временный state страницы
  const applyToFeedState = (target: string | undefined, data: any) => {
    if (!target || !pageId || typeof data !== "object" || data === null) return;
    const { elementId, statePath } = PathResolver.parseTarget(target);
    const targetId = elementId || pageId;
    let bucket = feedState.get(targetId);
    if (!bucket || typeof bucket !== "object") {
      bucket = {};
      feedState.set(targetId, bucket);
    }
    if (statePath) {
      const segments = statePath.split(".").filter(Boolean);
      let node = bucket;
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        if (!node[seg] || typeof node[seg] !== "object") node[seg] = {};
        node = node[seg];
      }
      node[segments[segments.length - 1]] = data;
    } else {
      Object.assign(bucket, data);
    }
  };

  for (const feed of dataFeeds) {
    try {
      // Sources этого фида: базовые + доступ к состоянию предыдущих фидов
      const feedSources: MacroSources = {
        ...serverSources,
        pageId,
        stateManager: stateShim,
      };
      const macroEngine = new MacroEngine(feedSources);
      // Resolve macros in URL
      let url = macroEngine.apply(feed.url) as string;

      // Resolve macros in data
      let data = feed.data
        ? (macroEngine.apply(feed.data) as Record<string, any>)
        : undefined;

      // Apply request adapter if specified
      data = await applyRequestAdapter(feed.adapter, data);

      // Resolve the URL macros from api-routes config, but keep the internal /api/ path
      let internalPath = url; // например, /api/ops/users
      if (url.startsWith("/api/")) {
        const routeName = url.substring(5);
        const routeConfig = apiRoutes?.find((r) => r.path === routeName);
        if (routeConfig) {
          // Мы не меняем internalPath, он нужен для попадания в app/api/[...route]
          // Но мы могли бы использовать routeConfig.url для чего-то еще, если понадобится.
        }
      }

      // IMPORTANT: Forward requests to our own internal API endpoint to use unified logic
      const host = serverSources.env?.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      
      // Build headers for the INTERNAL request
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      // Forward the user's cookies (camp_id, access_token, ...) to the internal
      // API router: without them the router cannot resolve the current campaign
      // (falls back to the first entry in camps.json) or read the auth token.
      // Values are percent-encoded on purpose: cookie values may contain
      // non-Latin-1 characters (e.g. user_data holds a user name in Cyrillic)
      // and fetch() rejects such header values with a ByteString error.
      const requestCookies = serverSources.cookies as
        | Record<string, string>
        | undefined;
      const cookieHeader =
        requestCookies && Object.keys(requestCookies).length > 0
          ? Object.entries(requestCookies)
              .map(([name, value]) => `${name}=${encodeURIComponent(value ?? "")}`)
              .join("; ")
          : undefined;
      if (cookieHeader) {
        headers["Cookie"] = cookieHeader;
      }

      // Prepare options
      const options: RequestInit = {
        method: feed.method,
        // Данные фида всегда должны быть свежими: без этого прод-семантика
        // зависит от автоопределения Request-time API, а в dev кэш всё равно
        // может отдать устаревший ответ (см. serverComponentsHmrCache).
        cache: "no-store",
        headers,
      };

      // We need to pass original data/macros to the internal router so IT can resolve them
      // against the external API. For now, we just forward the request to /api/ops/users
      let requestUrl = `${host.replace(/\/+$/, "")}${internalPath}`;

      if (data) {
        if (["POST", "PUT", "PATCH"].includes(feed.method)) {
          options.body = JSON.stringify(data);
        } else {
          // For GET, we append data as query params to the INTERNAL url
          // The API Router will then pick these up or use its own logic
          requestUrl = buildUrlWithParams(requestUrl, data);
        }
      }

      console.log(`[DataFeed SSR] 🚀 Fetching: ${requestUrl}`);
      const response = await fetch(requestUrl, options);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");

        results.push({
          success: false,
          target: feed.target,
          error: parseApiError(errorText) || `HTTP ${response.status}`,
        });
        continue;
      }

      // Parse response
      const contentType = response.headers.get("content-type");
      let responseData: any;
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Apply response adapter if specified
      if (feed.adapter) {
        try {
          const adapterName =
            typeof feed.adapter === "string"
              ? feed.adapter
              : (feed.adapter as DataFeedAdapter)?.response;

          if (adapterName) {
            const adapter = cachedConfig?.adapters?.[adapterName];
            if (!adapter) {
              results.push({
                success: false,
                target: feed.target,
                error: `Adapter not found: ${adapterName}`,
              });
              continue;
            }
            responseData = await applyAdapter(responseData, adapter);
          }
        } catch (adapterError) {
          results.push({
            success: false,
            target: feed.target,
            error: `Adapter error: ${(adapterError as Error).message}`,
          });
          continue;
        }
      }

      // Результат сразу доступен последующим фидам (SSR-цепочки)
      applyToFeedState(feed.target, responseData);

      results.push({
        success: true,
        data: responseData,
        target: feed.target,
      });
    } catch (error) {
      results.push({
        success: false,
        target: feed.target,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Resolve macros in element state recursively (server-side)
 * Traverses all elements and applies macro substitution to their state
 */
export function resolveElementStateMacros(
  element: any,
  sources: Partial<MacroSources>,
): void {
  if (!element) return;

  const macroEngine = new MacroEngine(sources);

  resolveStateRecursive(element, macroEngine);
}

function resolveStateRecursive(element: any, macroEngine: MacroEngine) {
  if (element.state) {
    element.state = macroEngine.apply(element.state);
  }

  const children = getChildren(element);
  for (const child of children) {
    resolveStateRecursive(child, macroEngine);
  }
}

function getChildren(element: any): any[] {
  const children: any[] = [];

  // Sections (in page)
  if (Array.isArray(element.sections)) children.push(...element.sections);
  // Blocks (in section)
  if (Array.isArray(element.blocks)) children.push(...element.blocks);
  // Components (in block)
  if (Array.isArray(element.components)) children.push(...element.components);
  // Pages (in app)
  if (Array.isArray(element.pages)) children.push(...element.pages);

  return children;
}

/**
 * Apply request adapter to data before sending
 */
async function applyRequestAdapter(
  adapter: string | DataFeedAdapter | undefined,
  data: Record<string, any> | undefined,
): Promise<Record<string, any> | undefined> {
  if (!adapter || !data) return data;

  const adapterName =
    typeof adapter === "string" ? null : (adapter as DataFeedAdapter)?.request;

  if (!adapterName) return data;

  const adapterConfig = cachedConfig?.adapters?.[adapterName];
  if (!adapterConfig) return data;

  return applyAdapter(data, adapterConfig);
}
