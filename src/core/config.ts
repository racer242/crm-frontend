import * as fs from "fs/promises";
import * as path from "path";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { BaseElement, LocaleConfig } from "@/types";
import {
  setServerConfig,
  executeServerDataFeeds,
  resolveElementStateMacros,
} from "./DataFeedServerService";

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

let cachedConfig: CrmConfig | null = null;
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
  if (cachedConfig) {
    return { config: cachedConfig };
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

      cachedConfig = resolvedConfig;

      // Notify DataFeedServerService of the config
      setServerConfig(cachedConfig);

      // Print banner only once per process lifetime
      if (!isInitialized) {
        printStartupBanner(resolvedConfig, configPath);
        isInitialized = true;
      }

      return { config: cachedConfig };
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
 * Get already loaded config (synchronous access)
 */
export function getConfig(): CrmConfig {
  if (!cachedConfig) {
    throw new Error("Configuration not loaded. Call loadConfig() first.");
  }

  return cachedConfig;
}

/**
 * Clear config cache
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Get page configuration by route
 */
export function getPageConfigByRoute(route: string | null): any | null {
  if (!cachedConfig) {
    return null;
  }
  const normalizedRoute = route === "" ? "/" : route;
  return (
    cachedConfig.pages?.find((p: any) => p.route === normalizedRoute) || null
  );
}

/**
 * Print startup banner with configuration info
 */
function printStartupBanner(config: CrmConfig, configPath: string): void {
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
    "╚═════════════════════════════════════════════════════════════╝",
  );
  console.log("");
}
