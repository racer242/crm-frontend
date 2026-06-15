"use client";

import { useMemo } from "react";
import { CommandExecutor, CommandExecutionContext } from "@/core";
import { useComponentContext } from "../ComponentContext";

/**
 * useCommandExecutor
 *
 * Создаёт и кеширует экземпляр CommandExecutor на время жизни компонента/страницы.
 * Автоматически подхватывает pageRoute, stateManager, appConfig и коллбеки из ComponentContext.
 *
 * Использует useMemo для синхронного создания executor на этапе рендера,
 * чтобы он был доступен сразу (в отличие от useEffect, который выполняется после отрисовки).
 *
 * @param overrides - опциональные переопределения (например, triggerComponentId)
 * @returns CommandExecutor | null (null пока контекст не готов)
 */
export function useCommandExecutor(
  overrides?: Partial<CommandExecutionContext>,
): CommandExecutor | null {
  const ctx = useComponentContext();

  return useMemo(() => {
    if (!ctx.stateManager || !ctx.appConfig || !ctx.pageId) return null;
    return new CommandExecutor({
      pageId: ctx.pageId,
      pageRoute: ctx.pageRoute,
      triggerComponentId: overrides?.triggerComponentId || ctx.pageId,
      appConfig: ctx.appConfig,
      stateManager: ctx.stateManager,
      showToast: ctx.showToast,
      navigate: ctx.navigate,
      confirm: ctx.confirm,
      refresh: ctx.refresh,
    });
  }, [
    ctx.pageId,
    ctx.pageRoute,
    ctx.appConfig?.config?.locale?.default,
    overrides?.triggerComponentId,
    ctx.stateManager,
    ctx.appConfig,
    ctx.showToast,
    ctx.navigate,
    ctx.confirm,
    ctx.refresh,
  ]);
}
