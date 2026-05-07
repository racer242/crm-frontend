"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Component } from "@/types";
import { Linkage } from "@/core";
import { useComponentContext } from "../ComponentContext";

export interface ComponentBindings {
  resolvedProps: Record<string, any>;
  handleEvent: (eventType: string, eventValue: any) => void;
}

export function useComponentBindings({
  component,
}: {
  component: Component;
}): ComponentBindings {
  const ctx = useComponentContext();
  const [resolvedProps, setResolvedProps] = useState<Record<string, any>>({});

  const commandContextRef = useRef<{
    pageId: string;
    triggerComponentId: string;
    appConfig: any;
    stateManager: any;
    elementIndex: any;
    showToast?: (
      message: string,
      severity?: "success" | "info" | "warn" | "error",
    ) => void;
    navigate?: (url: string) => void;
    confirm?: (message: string) => Promise<boolean>;
    refresh?: (mode: string) => void;
  } | null>(null);

  const { stateManager, pageId, elementIndex } = ctx;

  // Создаём Linkage instance
  const linkage = useMemo(() => {
    if (!stateManager || !pageId) return null;
    return new Linkage(stateManager, pageId);
  }, [stateManager, pageId]);

  // Создаём контекст для CommandExecutor
  useEffect(() => {
    if (pageId && ctx.appConfig && stateManager && elementIndex) {
      commandContextRef.current = {
        pageId,
        triggerComponentId: component.id || "",
        appConfig: ctx.appConfig,
        stateManager,
        elementIndex,
        showToast: ctx.showToast,
        navigate: ctx.navigate,
        confirm: ctx.confirm,
        refresh: ctx.refresh,
      };
    }
  }, [
    pageId,
    ctx.appConfig,
    stateManager,
    component.id,
    elementIndex,
    ctx.showToast,
    ctx.navigate,
    ctx.confirm,
    ctx.refresh,
  ]);

  // Собираем все binding-строки из value и props
  const allBindings = useMemo(() => {
    const bindings: (string | undefined)[] = [];
    bindings.push(component.value);

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
  }, [component.value, component.props]);

  // Разрешаем props через Linkage
  const resolveAll = useCallback(() => {
    if (!linkage) return;

    const propsWithValues: Record<string, any> = {
      value: linkage.resolveDeep(component.value),
      ...(linkage.resolveDeep(component.props) || {}),
    };

    setResolvedProps(propsWithValues);
  }, [linkage, component.value, component.props]);

  // Первоначальное разрешение
  useEffect(() => {
    resolveAll();
  }, [resolveAll]);

  // Подписка на изменения bindings через Linkage
  useEffect(() => {
    if (!linkage) return;

    const unsubscribe = linkage.subscribe(allBindings, () => {
      resolveAll();
    });

    return unsubscribe;
  }, [linkage, allBindings, resolveAll]);

  // Обработчик событий
  const handleEvent = useCallback(
    (eventType: string, eventValue: any) => {
      if (!component.events || !commandContextRef.current) return;

      const eventHandlers = component.events.filter(
        (e) => e.type === eventType,
      );

      for (const handler of eventHandlers) {
        //Если в значении события есть тип и он равен типу обработчика, объединить команды
        let commands =
          eventValue?.type === handler.type
            ? [...handler.commands, ...eventValue?.commands]
            : handler.commands;

        for (const cmd of commands) {
          const { CommandExecutor } = require("@/core");
          const executor = new CommandExecutor(commandContextRef.current);
          executor.executeCommand(cmd.type, cmd.params, eventValue);
        }
      }
    },
    [component.events],
  );

  return {
    resolvedProps,
    handleEvent,
  };
}
