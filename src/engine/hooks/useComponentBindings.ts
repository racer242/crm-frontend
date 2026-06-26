"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Component, Command } from "@/types";
import { Linkage } from "@/core";

/**
 * Рекурсивно разрешает shortcut строки в командах.
 * Если команда — строка, заменяет на соответствующий shortcut из объекта.
 * Если команда — объект с commands (sequence), рекурсивно обрабатывает его commands.
 */
function resolveShortcutCommands(
  commands: (string | Command)[],
  shortcutsMap: Record<string, Command>,
): (Command | null)[] {
  return commands.map((cmd): Command | null => {
    if (typeof cmd === "string") {
      // Строка — это ссылка на shortcut
      return shortcutsMap[cmd] || null;
    } else if (typeof cmd === "object" && cmd !== null) {
      const result: Command = { ...cmd };
      if (result.params) {
        // Проверяем callback поля которые могут содержать команды
        for (const cbKey of ["onSuccess", "onError", "onConfirm", "onCancel"]) {
          if (result.params?.[cbKey] && Array.isArray(result.params[cbKey])) {
            result.params = {
              ...result.params,
              [cbKey]: result.params[cbKey]
                .map((subCmd: string | Command) => {
                  if (typeof subCmd === "string") {
                    return shortcutsMap[subCmd] || null;
                  }
                  // Рекурсивно для nested объектов (на случай вложенных sequence)
                  if (
                    typeof subCmd === "object" &&
                    subCmd.params?.commands &&
                    Array.isArray(subCmd.params.commands)
                  ) {
                    const resolvedNested = resolveShortcutCommands(
                      subCmd.params.commands,
                      shortcutsMap,
                    );
                    return {
                      ...subCmd,
                      params: {
                        ...subCmd.params,
                        commands: resolvedNested.filter(Boolean) as Command[],
                      },
                    };
                  }
                  return subCmd as Command;
                })
                .filter(Boolean) as Command[],
            };
          }
        }
        // Обрабатываем params.commands для sequence команд
        if (result.params.commands && Array.isArray(result.params.commands)) {
          const resolvedNested = resolveShortcutCommands(
            result.params.commands,
            shortcutsMap,
          );
          result.params = {
            ...result.params,
            commands: resolvedNested.filter(Boolean) as Command[],
          };
        }
      }
      return result;
    }
    return cmd as Command;
  });
}
import { useComponentContext } from "../ComponentContext";
import { useCommandExecutor } from "./useCommandExecutor";

export interface ComponentBindings {
  resolvedProps: Record<string, any>;
  handleEvent: (eventType: string, eventValue: any) => void;
  /** Выполнить произвольный массив команд с поддержкой shortcut строк */
  executeCommands: (
    commands: (string | Command)[],
    eventValue?: any,
  ) => Promise<void>;
}

export function useComponentBindings({
  component,
}: {
  component: Component;
}): ComponentBindings {
  const ctx = useComponentContext();

  const { stateManager, pageId } = ctx;

  // Единый экземпляр CommandExecutor для этого компонента
  const executor = useCommandExecutor({
    triggerComponentId: component.id || "",
  });

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
    async (eventType: string, eventValue: any) => {
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

        // Рекурсивно резолвим все shortcut строки перед выполнением
        const shortcutsMap = ctx.shortcuts ?? {};
        const fullyResolved = resolveShortcutCommands(
          commands,
          shortcutsMap,
        ).filter(Boolean) as Command[];

        for (const resolvedCmd of fullyResolved) {
          await executor.executeCommand(
            resolvedCmd.type,
            resolvedCmd.params,
            eventValue,
          );
        }
      }
    },
    [component.events, executor, ctx.shortcuts],
  );

  // /**
  //  * Выполнить произвольный массив команд
  //  */
  const executeCommands = useCallback(
    async (commands: (string | Command)[], eventValue?: any) => {
      if (!executor) return;

      // Рекурсивно резолвим все shortcut строки перед выполнением
      const shortcutsMap = ctx.shortcuts ?? {};
      const fullyResolved = resolveShortcutCommands(
        commands,
        shortcutsMap,
      ).filter(Boolean) as Command[];

      for (const resolvedCmd of fullyResolved) {
        await executor.executeCommand(
          resolvedCmd.type,
          resolvedCmd.params,
          eventValue,
        );
      }
    },
    [executor, ctx.shortcuts],
  );

  return {
    resolvedProps,
    handleEvent,
    executeCommands,
  };
}
