import * as fs from "fs/promises";
import * as path from "path";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { BaseElement, LocaleConfig, CampItem } from "@/types";
import { applyConfigDelta } from "./configMerge";

/**
 * CRM Configuration Loader
 * Loads and resolves full CRM configuration with $ref support
 */

export interface CrmConfig {
  id?: string;
  type?: string;
  title?: string;
  version?: string;
  name?: string;
  pages: any[];
  components: Record<string, any>;
  settings: Record<string, any>;
  navbar?: any;
  userMenu?: any;
  state?: Record<string, any>;
  api?: {
    baseUrl?: string;
    timeout?: number;
  };
  /** Настройки локали */
  locale?: LocaleConfig;
  [key: string]: any;
}

/**
 * Index structure: { pageId: { elementId: element, ... }, ... }
 */
export type PageIndex = Record<string, BaseElement>;
export type FullIndex = Record<string, PageIndex>;

export interface AppInitResult {
  config: CrmConfig;
}

/**
 * Реестр конфигураций кампаний: code кампании → CrmConfig (ключ — слаг code
 * из camps.json; для записей без code — String(id)).
 * Строится один раз при старте (initApp); далее только чтение — запросы
 * АДРЕСУЮТ конфиг своей кампании (getConfigForCamp), а не «переключают»
 * единственный глобальный конфиг. Гонки между кампаниями исключены.
 */
let configRegistry: Map<string, CrmConfig> | null = null;
/** Конфиг первой кампании (fallback при отсутствии/неизвестности camp_id) */
let defaultConfig: CrmConfig | null = null;
let initPromise: Promise<AppInitResult> | null = null;
let isInitialized = false;

// ==================== Index Building ====================

/**
 * Build index for all pages
 */
export function buildFullIndex(config: CrmConfig): FullIndex {
  const index: FullIndex = {};
  for (const page of config.pages) {
    index[page.id] = buildPageIndex(page);
  }
  return index;
}

/**
 * Build index for a single page
 */
export function buildPageIndex(page: BaseElement): PageIndex {
  const index: PageIndex = {};
  addSubtreeToIndex(page, index);
  return index;
}

/**
 * Recursively add all elements of a subtree to the index
 */
function addSubtreeToIndex(element: BaseElement, index: PageIndex) {
  if (element.id) {
    index[element.id] = element;
  }

  const children = getChildren(element);
  for (const child of children) {
    addSubtreeToIndex(child, index);
  }
}

/**
 * Get child elements
 */
function getChildren(element: BaseElement): BaseElement[] {
  const el = element as any;
  const children: BaseElement[] = [];

  // Sections (in page)
  if (Array.isArray(el.sections)) children.push(...el.sections);
  // Blocks (in section)
  if (Array.isArray(el.blocks)) children.push(...el.blocks);
  // Components (in block)
  if (Array.isArray(el.components)) children.push(...el.components);
  // Pages (in app)
  if (Array.isArray(el.pages)) children.push(...el.pages);

  return children;
}

// ==================== App Initialization ====================

/**
 * Application Singleton Initialization
 * Loads configuration only once per application lifetime
 */
export async function initApp(): Promise<AppInitResult> {
  // Return immediately if already initialized
  if (configRegistry) {
    return { config: defaultConfig! };
  }

  // Prevent parallel loading during concurrent requests
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const configPath = process.env.CONFIG_PATH || "./config/crm-config.json";
    const absolutePath = path.resolve(process.cwd(), configPath);

    try {
      await fs.access(absolutePath);

      const parser = new $RefParser();
      const resolvedConfig = (await parser.dereference(
        absolutePath,
      )) as CrmConfig;

      // Per-campaign config registry: campaign WITHOUT config_patch shares the
      // reference object (no clone), campaign WITH config_patch gets a patched
      // clone. Configs are addressed per request via getConfigForCamp() —
      // no global switching, race-free by construction.
      const { registry, patchedCamps } = await buildCampConfigs(
        resolvedConfig,
        absolutePath,
      );
      configRegistry = registry;

      // Default config = first camp's config (fallback without camp_id cookie)
      const camps: CampItem[] = (resolvedConfig as any).camps || [];
      defaultConfig =
        (camps[0] && registry.get(campRegistryKey(camps[0]))) || resolvedConfig;

      // Print banner only once per process lifetime
      if (!isInitialized) {
        printStartupBanner(resolvedConfig, configPath, patchedCamps);
        isInitialized = true;
      }

      return { config: defaultConfig };
    } catch (error) {
      initPromise = null;

      console.error(`❌ Failed to load CRM configuration from ${configPath}`);

      if (error instanceof Error) {
        console.error(`   Error: ${error.message}`);
      }

      throw new Error(
        `Configuration loading failed: ${(error as Error).message}`,
      );
    }
  })();

  return initPromise;
}

/**
 * Build the per-campaign config registry from camps.json.
 * Campaign without config_patch → shares the reference config object;
 * campaign with config_patch (inline delta, path to a JSON patch file or
 * { file: "..." }) → structuredClone of the reference with the delta applied.
 * Registry key: campaign code slug (camps.json → code), String(id) fallback.
 */
function campRegistryKey(camp: CampItem): string {
  return camp.code || String(camp.id);
}

async function buildCampConfigs(
  reference: CrmConfig,
  referencePath: string,
): Promise<{ registry: Map<string, CrmConfig>; patchedCamps: string[] }> {
  const registry = new Map<string, CrmConfig>();
  const patchedCamps: string[] = [];
  const camps: CampItem[] = (reference as any).camps || [];

  for (const camp of camps) {
    const key = campRegistryKey(camp);
    const delta = await resolveConfigDelta(camp, referencePath);
    if (!delta) {
      registry.set(key, reference);
      continue;
    }
    const campConfig = structuredClone(reference);
    applyConfigDelta(campConfig, delta);
    registry.set(key, campConfig);
    patchedCamps.push(key);
  }

  return { registry, patchedCamps };
}

/**
 * Extract the campaign's config delta: inline config_patch object, a string
 * path (relative to the config directory) or { file: "..." }. Returns null
 * when the campaign has no delta. A failed patch file read fails startup
 * (fail fast) — silently serving the unpatched reference would be a bug.
 */
async function resolveConfigDelta(
  camp: CampItem,
  referencePath: string,
): Promise<any | null> {
  const patch = (camp as any).config_patch;
  if (patch === undefined || patch === null) return null;

  let patchPath: string | null = null;
  if (typeof patch === "string") {
    patchPath = patch;
  } else if (
    typeof patch === "object" &&
    !Array.isArray(patch) &&
    typeof patch.file === "string"
  ) {
    patchPath = patch.file;
  }

  if (patchPath) {
    const absolutePatchPath = path.isAbsolute(patchPath)
      ? patchPath
      : path.resolve(path.dirname(referencePath), patchPath);
    // $refs inside the patch file resolve relative to the patch file itself
    // (e.g. "../../system/list-request-format.json" from
    // config/camps/<code>/) — the same mechanism as the reference config
    // load. A raw JSON.parse would leave "$ref" literals in the delta; an
    // object like { "$ref": … } would then REPLACE an already-resolved
    // reference array (e.g. sendRequest format rules) and break the command.
    const parser = new $RefParser();
    return await parser.dereference(absolutePatchPath);
  }

  return patch;
}

/**
 * Address the config of a specific campaign in the registry (O(1) lookup).
 * A numeric value or numeric string (the camp_id cookie arrives as a string)
 * resolves through the camps list: id → code → registry; any other string is
 * a direct address by the campaign code slug.
 * Missing/unknown → first camp's config (same fallback as page.tsx).
 * Throws when initApp() has not completed yet.
 */
export function getConfigForCamp(
  campIdOrCode?: number | string | null,
): CrmConfig {
  if (!configRegistry || !defaultConfig) {
    throw new Error("Configuration not loaded. Call initApp() first.");
  }
  if (
    campIdOrCode === null ||
    campIdOrCode === undefined ||
    campIdOrCode === ""
  ) {
    return defaultConfig;
  }
  // Numeric value or numeric string → camp id: resolve through the camps
  // list (id → code → registry); other strings → direct code slug address
  const asId = Number(campIdOrCode);
  if (Number.isFinite(asId)) {
    const camps: CampItem[] = (defaultConfig as any).camps || [];
    const camp = camps.find((c: CampItem) => c.id === asId);
    const byCode = camp ? configRegistry.get(campRegistryKey(camp)) : undefined;
    return byCode || configRegistry.get(String(asId)) || defaultConfig;
  }
  return configRegistry.get(String(campIdOrCode)) || defaultConfig;
}

/**
 * Result of matching an actual route against a route pattern with [id]-style placeholders
 */
export interface RouteMatchResult {
  matched: boolean;
  params: Record<string, string>; // e.g. { id: "123", group: "admin" }
}

/**
 * Result of finding a page by route with pattern support
 */
export interface PageRouteMatch {
  pageConfig: any;
  route: string; // the matched route pattern e.g. "/users/[id]"
  routeParams: Record<string, string>; // e.g. { id: "123" }
}

/**
 * Match an actual route against a route pattern that may contain [id]-style placeholders
 * Example: matchRoute("/users/123/edit", "/users/[id]/edit") -> { matched: true, params: { id: "123" } }
 */
export function matchRoute(
  actualRoute: string,
  routePattern: string,
): RouteMatchResult {
  const actualSegments = actualRoute.split("/").filter(Boolean);
  const patternSegments = routePattern.split("/").filter(Boolean);

  if (actualSegments.length !== patternSegments.length) {
    return { matched: false, params: {} };
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const actualSegment = actualSegments[i];

    // Dynamic segment e.g. [id]
    const dynamicMatch = patternSegment.match(/^\[(.+)\]$/);
    if (dynamicMatch) {
      params[dynamicMatch[1]] = actualSegment;
    } else if (patternSegment !== actualSegment) {
      // Static segment mismatch
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}

/**
 * Find a page configuration by route with support for [id]-style patterns.
 * First tries exact match, then pattern matching across all pages.
 * Searched in the passed campaign config; without it — in the default
 * (first campaign) config of the registry.
 */
export function findPageByRoute(
  route: string | null,
  config?: CrmConfig,
): PageRouteMatch | null {
  const cfg = config || defaultConfig;
  if (!cfg || route === null) {
    return null;
  }

  const normalizedRoute = route === "" ? "/" : route;

  // 1. Try exact match first (fast path)
  const exactMatch = cfg.pages?.find(
    (p: any) => p.route === normalizedRoute,
  );
  if (exactMatch) {
    return { pageConfig: exactMatch, route: normalizedRoute, routeParams: {} };
  }

  // 2. Try pattern matching across all pages.
  // Several patterns can match the same URL (e.g. "/users/1/acts/add" matches
  // both "/users/[user_id]/acts/[act_id]" and "/users/[user_id]/acts/add").
  // Prefer the most specific pattern: the one with the most static segments
  // matching the actual route (i.e. the fewest dynamic placeholders winning).
  // Registration order is only used as a stable tie-breaker.
  let bestMatch: {
    page: any;
    route: string;
    routeParams: Record<string, string>;
    staticSegments: number;
  } | null = null;

  for (const page of cfg.pages || []) {
    if (!page.route) continue;
    const result = matchRoute(normalizedRoute, page.route);
    if (!result.matched) continue;

    const patternSegments = (page.route as string)
      .split("/")
      .filter(Boolean);
    const actualSegments = normalizedRoute.split("/").filter(Boolean);
    let staticSegments = 0;
    for (let i = 0; i < patternSegments.length; i++) {
      if (
        !/^\[(.+)\]$/.test(patternSegments[i]) &&
        patternSegments[i] === actualSegments[i]
      ) {
        staticSegments++;
      }
    }

    if (!bestMatch || staticSegments > bestMatch.staticSegments) {
      bestMatch = {
        page,
        route: page.route,
        routeParams: result.params,
        staticSegments,
      };
    }
  }

  if (bestMatch) {
    return {
      pageConfig: bestMatch.page,
      route: bestMatch.route,
      routeParams: bestMatch.routeParams,
    };
  }

  return null;
}

/**
 * Get page configuration by exact route match (exact match only, no pattern support)
 * Kept for index page resolution. Searched in the passed campaign config;
 * without it — in the default (first campaign) config of the registry.
 */
export function getPageConfigByRoute(
  route: string | null,
  config?: CrmConfig,
): any | null {
  const cfg = config || defaultConfig;
  if (!cfg) {
    return null;
  }
  const normalizedRoute = route === "" ? "/" : route;
  return cfg.pages?.find((p: any) => p.route === normalizedRoute) || null;
}

/**
 * Print startup banner with configuration info
 */
function printStartupBanner(
  config: CrmConfig,
  configPath: string,
  patchedCamps: string[] = [],
): void {
  console.log("");
  console.log(
    "╔═════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║                    🚀 CRM PLATFORM STARTED                  ║",
  );
  console.log(
    "╠═════════════════════════════════════════════════════════════╣",
  );
  console.log(`║  Name:      ${(config.title || "CRM Platform").padEnd(48)}║`);
  console.log(`║  Version:   ${(config.version || "0.1.0").padEnd(48)}║`);
  console.log(`║  Config:    ${configPath.padEnd(48)}║`);
  console.log(`║  Pages:     ${String(config.pages?.length || 0).padEnd(48)}║`);
  console.log(
    `║  Mode:      ${(process.env.NODE_ENV || "development").padEnd(48)}║`,
  );
  console.log(
    `║  Auth URL:  ${(process.env.BITRIX_API_URL || "not set").padEnd(48)}║`,
  );
  console.log(
    `║  Method:    ${(process.env.BITRIX_REQUEST_METHOD || "POST").padEnd(48)}║`,
  );
  console.log(
    `║  API TZ:    ${(process.env.BITRIX_API_TIMEZONE || "Europe/Moscow").padEnd(48)}║`,
  );
  console.log(
    `║  Auth API:  ${(process.env.BITRIX_API_URL || "").replace(/^https?:\/\//, "").padEnd(48)}║`,
  );
  console.log(
    `║  Auth:      ${((process.env.AUTH_COOKIE_NAMES ? "enabled" : "disabled") as string).padEnd(48)}║`,
  );
  const camps = (config as any)?.camps;
  const campCount = Array.isArray(camps) ? camps.length : 0;
  const campsLine = patchedCamps.length
    ? `${campCount} (patched: ${patchedCamps.join(", ")})`
    : String(campCount);
  console.log(`║  Camps:     ${campsLine.padEnd(48)}║`);
  console.log(
    "╚═════════════════════════════════════════════════════════════╝",
  );
  console.log("");
}
