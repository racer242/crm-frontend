import * as fs from "fs/promises";
import * as path from "path";
import $RefParser from "@apidevtools/json-schema-ref-parser";

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
  [key: string]: any;
}

let cachedConfig: CrmConfig | null = null;
let initPromise: Promise<CrmConfig> | null = null;
let isInitialized = false;

/**
 * Application Singleton Initialization
 * Loads configuration only once per application lifetime
 */
export async function initApp(): Promise<CrmConfig> {
  // Return immediately if already initialized
  if (cachedConfig) {
    return cachedConfig;
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

      // Print banner only once per process lifetime
      if (!isInitialized) {
        printStartupBanner(resolvedConfig, configPath);
        isInitialized = true;
      }

      return resolvedConfig;
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
