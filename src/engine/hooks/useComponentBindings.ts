"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Component, Command } from "@/types";
import { Linkage } from "@/core";
import { useComponentContext } from "../ComponentContext";
import { useCommandExecutor } from "./useCommandExecutor";

export interface ComponentBindings {
  resolvedProps: Record<string, any>;
  handleEvent: (eventType: string, eventValue: any) => void;
  /** Выполнить произвольный массив команд (не привязанных к component.events) */
  executeCommands: (commands: Command[], eventValue?: any) => Promise<void>;
}

export function useComponentBindings({
  component,
}: {
  component: Component;
}): ComponentBindings {
  const ctx = useComponentContext();

  const { stateManager, pageId, shortcuts } = ctx;

  // Единый экземпляр CommandExecutor для этого компонента
  const executor = useCommandExecutor({
    triggerComponentId: component.id || "",
  });

  /**
   * Resolve a command reference: if string, look up in shortcuts; otherwise return as-is
   */
  const resolveCommand = useCallback(
    (cmd: string | Command): Command | null => {
      if (typeof cmd === "string") {
        return shortcuts?.[cmd] || null;
      }
      return cmd;
    },
    [shortcuts],
  );

  // Создаём Linkage instance
  const linkage = useMemo(() => {
    if (!stateManager || !pageId) return null;
    return new Linkage(stateManager, pageId);
  }, [stateManager, pageId]);

  // Собираем все binding-строки из props
  const allBindings = useMemo(() => {
    const bindings: (string | undefined)[] = [];

    if (component.props) {
      const collectBindings = (obj: any) => {
        if (typeof obj === "string") {
          bindings.push(obj);
        } else if (Array.isArray(obj)) {
          obj.forEach(collectBindings);
        } else if (obj && typeof obj === "object") {
          for (const val of Object.values(obj)) {
            collectBindings(val);
          }
        }
      };
      collectBindings(component.props);
    }

    return bindings;
  }, [component.props]);

  // Синхронное разрешение всех линковок на этапе рендера (без useEffect)
  // Позволяет избежать пустого первого рендера с {} в resolvedProps
  const initiallyResolved = useMemo(() => {
    if (!linkage) return component.props || {};
    return linkage.resolveDeep(component.props) || {};
  }, [linkage, component.props]);

  // Инициализируем состояние сразу разрешёнными пропсами
  const [resolvedProps, setResolvedProps] =
    useState<Record<string, any>>(initiallyResolved);

  // Синхронизация состояния, если initiallyResolved изменился после первоначальной инициализации
  useEffect(() => {
    setResolvedProps(initiallyResolved);
  }, [initiallyResolved]);

  // Подписка на изменения bindings через Linkage
  useEffect(() => {
    if (!linkage) return;

    const unsubscribe = linkage.subscribe(allBindings, () => {
      const propsWithValues = linkage.resolveDeep(component.props) || {};
      setResolvedProps(propsWithValues);
    });

    return unsubscribe;
  }, [linkage, allBindings, component.props]);

  // /**
  //  * Выполнить команды из component.events по типу события
  //  */
  const handleEvent = useCallback(
    (eventType: string, eventValue: any) => {
      if (!component.events || !executor) return;

      const eventHandlers = component.events.filter(
        (e) => e.type === eventType,
      );

      for (const handler of eventHandlers) {
        // Если в значении события есть тип и он равен типу обработчика, объединить команды
        let commands =
          eventValue?.type === handler.type
            ? [...handler.commands, ...eventValue?.commands]
            : handler.commands;

        for (const cmd of commands) {
          const resolved = resolveCommand(cmd);
          if (!resolved) {
            console.warn(
              `Shortcut command not found: ${typeof cmd === "string" ? cmd : "unknown"}`,
            );
            continue;
          }
          executor.executeCommand(resolved.type, resolved.params, eventValue);
        }
      }
    },
    [component.events, resolveCommand, executor],
  );

  // /**
  //  * Выполнить произвольный массив команд
  //  */
  const executeCommands = useCallback(
    async (commands: Command[], eventValue?: any) => {
      if (!executor) return;
      for (const cmd of commands) {
        const resolved = resolveCommand(cmd);
        if (!resolved) {
          console.warn(
            `Shortcut command not found: ${typeof cmd === "string" ? cmd : "unknown"}`,
          );
          continue;
        }
        await executor.executeCommand(
          resolved.type,
          resolved.params,
          eventValue,
        );
      }
    },
    [executor, resolveCommand],
  );

  return {
    resolvedProps,
    handleEvent,
    executeCommands,
  };
}
