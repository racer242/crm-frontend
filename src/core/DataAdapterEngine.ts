/**
 * DataAdapterEngine
 *
 * Applies adapters to transform API response data into CRM-compatible format.
 * Only "js" adapter type is supported (client-side rules are handled by RulesEngine).
 *
 * Adapters run only on the server side.
 */

import * as fs from "fs/promises";
import * as path from "path";
import { Adapter } from "@/types/adapter";

/** Путь к общему файлу с shared-функциями для адаптеров */
const SHARED_PATH = path.join(process.cwd(), "config/adapters/_shared.js");

/**
 * Загружает shared-функции из `config/adapters/_shared.js`
 * @returns Содержимое shared-файла или пустая строка, если файл не найден
 */
async function loadSharedContent(): Promise<string> {
  try {
    return await fs.readFile(SHARED_PATH, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Apply a JS adapter to data
 * Loads the script from public/ directory and executes it
 * Shared functions from config/adapters/_shared.js are automatically available
 */
async function applyJs(data: any, scriptPath: string): Promise<any> {
  const fullPath = path.join(process.cwd(), scriptPath);

  let scriptContent: string;
  try {
    scriptContent = await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    throw new Error(
      `JS adapter script not found: ${fullPath}. Error: ${(error as Error).message}`,
    );
  }

  // Загружаем shared-функции (если файл существует)
  const sharedContent = await loadSharedContent();

  // Execute the script in a sandboxed function
  // The script should be a function that takes `data` and returns transformed data
  // We wrap it to handle both export default and direct function
  try {
    const adapterFn = new Function(
      "data",
      `${sharedContent}; ${scriptContent}; return transform(data);`,
    );
    return adapterFn(data);
  } catch (error) {
    // If direct execution fails, try to evaluate as a module
    try {
      // Wrap the script content and execute
      const wrappedScript = `
        const exports = {};
        ${sharedContent};
        ${scriptContent}
        const fn = exports.default || exports.transform || transform;
        return fn(data);
      `;
      const adapterFn = new Function("data", wrappedScript);
      return adapterFn(data);
    } catch (innerError) {
      throw new Error(
        `JS adapter execution failed: ${(innerError as Error).message}`,
      );
    }
  }
}

/**
 * Main entry point: apply an adapter to data
 * @param data - The raw API response data
 * @param adapter - The adapter configuration
 * @returns Transformed data
 */
export async function applyAdapter(data: any, adapter: Adapter): Promise<any> {
  switch (adapter.type) {
    case "replace":
      console.warn(
        "Replace adapter is deprecated. Use JS adapters or client-side rules instead.",
      );
      return data;

    case "js":
      return applyJs(data, adapter.script);

    default:
      throw new Error(`Unknown adapter type: ${(adapter as any).type}`);
  }
}
