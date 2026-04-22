"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Component, App } from "@/types";
import { Linkage, StateManager, ElementIndex } from "@/core";

export interface ComponentBindings {
  resolvedProps: Record<string, any>;
  isMounted: boolean;
  handleEvent: (eventType: string, eventValue: any) => void;
}

export function useComponentBindings({
  component,
  pageId,
  appConfig,
  stateManager,
  elementIndex,
}: {
  component: Component;
  pageId?: string;
  appConfig?: App;
  stateManager?: StateManager;
  elementIndex?: ElementIndex;
}): ComponentBindings {
  const [isMounted, setIsMounted] = useState(false);
  const [resolvedProps, setResolvedProps] = useState<Record<string, any>>({});

  const commandContextRef = useRef<{
    pageId: string;
    triggerComponentId: string;
    appConfig: App;
    stateManager: StateManager;
    elementIndex: ElementIndex;
  } | null>(null);

  // Создаём Linkage instance
  const linkage = useMemo(() => {
    if (!stateManager || !pageId || !elementIndex) return null;
    return new Linkage(stateManager, pageId, elementIndex);
  }, [stateManager, pageId, elementIndex]);

  // Создаём контекст для CommandExecutor
  useEffect(() => {
    if (pageId && appConfig && stateManager && elementIndex) {
      commandContextRef.current = {
        pageId,
        triggerComponentId: component.id || "",
        appConfig,
        stateManager,
        elementIndex,
      };
    }
  }, [pageId, appConfig, stateManager, component.id, elementIndex]);

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

  // Флаг монтирования
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Обработчик событий
  const handleEvent = useCallback(
    (eventType: string, eventValue: any) => {
      if (!component.events || !commandContextRef.current) return;

      const eventHandlers = component.events.filter(
        (e) => e.type === eventType,
      );

      for (const handler of eventHandlers) {
        for (const cmd of handler.commands) {
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
    isMounted,
    handleEvent,
  };
}
