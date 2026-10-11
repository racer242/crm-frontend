/**
 * DataInitServerService
 *
 * Server-side state initialization using macros.
 * Allows setting initial state values based on location params, config, env, etc.
 */

import {
  DataInitApplyMethod,
  DataInitConfig,
  DataInitPriority,
  MacroSources,
} from "@/types";
import { MacroEngine } from "./MacroEngine";
import { StateManager } from "./StateManager";

export interface DataInitResult {
  success: boolean;
  target: string;
  data?: any; // Renamed to match DataFeedResult
  error?: string;
  /** Способ применения при записи в state (пробрасывается в initialDataFeed) */
  method?: DataInitApplyMethod;
  /** Фаза применения: "feed" — после серверных фидов */
  priority?: DataInitPriority;
}

/**
 * Execute server-side data init for a page
 */
export function executeDataInit(
  dataInits: DataInitConfig[] | undefined,
  stateManager: any, // Not used for storage yet, just collecting results for initialDataFeed
  sources: MacroSources,
): DataInitResult[] {
  if (!dataInits || dataInits.length === 0) {
    return [];
  }

  const results: DataInitResult[] = [];
  const macroEngine = new MacroEngine(sources);

  for (const init of dataInits) {
    try {
      let value: any;

      if (init.source !== undefined) {
        // Resolve macros from source string
        value = macroEngine.apply(init.source);
      } else {
        // Use static value
        value = init.value;
      }

      // parse: "json" — URL-параметры приходят сырыми строками; значение,
      // не являющееся JSON (обычный поисковый запрос "05"), остаётся строкой
      if (init.parse === "json" && typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch {
          // не JSON — оставить значение без изменений
        }
      }

      // Макрос не разрешился (параметра нет в URL) — ничего не пишем,
      // чтобы не затереть undefined'ом дефолт из конфига страницы
      if (value === undefined) continue;

      // We don't write to stateManager here because it's not fully initialized in page.tsx yet.
      // Instead, we return the result and AppEngine will handle the storage via initialDataFeed.

      results.push({
        success: true,
        target: init.target,
        data: value,
        method: init.method,
        priority: init.priority,
      });
    } catch (error) {
      console.error(`[DataInit] Error processing target ${init.target}:`, error);
      results.push({
        success: false,
        target: init.target,
        data: undefined,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
