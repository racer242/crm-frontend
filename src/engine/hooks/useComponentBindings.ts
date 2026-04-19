"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Component, App } from "@/types";
import { LinkResolver, ElementIndex } from "@/core";

// Тип контекста для команд
export type CommandExecutionContext = {
  pageId: string;
  triggerComponentId: string;
  appConfig: App;
  stateManager: any;
  elementIndex: ElementIndex;
};

// Результат хука
export interface ComponentBindings {
  resolvedValue: any;
  resolvedVisible: boolean | undefined;
  resolvedDisabled: boolean | undefined;
  isMounted: boolean;
  commandContextRef: React.MutableRefObject<CommandExecutionContext | null>;
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
  stateManager?: any;
  elementIndex?: ElementIndex;
}): ComponentBindings {
  const [resolvedValue, setResolvedValue] = useState<any>(undefined);
  const [resolvedVisible, setResolvedVisible] = useState<boolean | undefined>(
    undefined,
  );
  const [resolvedDisabled, setResolvedDisabled] = useState<boolean | undefined>(
    undefined,
  );
  const [isMounted, setIsMounted] = useState(false);

  const commandContextRef = useRef<CommandExecutionContext | null>(null);

  // Создаем контекст для CommandExecutor
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

  // Функция разрешения binding-ов
  const resolveBindings = useCallback(() => {
    if (!appConfig || !pageId) return;

    const linkContext = {
      pageId,
      appConfig,
      elementIndex: elementIndex!,
    };

    let resolvedVal: any = undefined;

    if (component.valueBinding) {
      resolvedVal = LinkResolver.resolve(component.valueBinding, linkContext);
    } else if (component.value !== undefined) {
      if (
        typeof component.value === "string" &&
        component.value.startsWith("@")
      ) {
        resolvedVal = LinkResolver.resolve(component.value, linkContext);
      } else {
        resolvedVal = component.value;
      }
    }

    setResolvedValue(resolvedVal);

    if (component.visibleBinding) {
      setResolvedVisible(
        LinkResolver.resolve(component.visibleBinding, linkContext),
      );
    } else {
      setResolvedVisible(component.visible);
    }

    if (component.disabledBinding) {
      setResolvedDisabled(
        LinkResolver.resolve(component.disabledBinding, linkContext),
      );
    } else {
      setResolvedDisabled(component.disabled);
    }
  }, [component, appConfig, pageId]);

  // Первоначальное разрешение binding-ов
  useEffect(() => {
    resolveBindings();
  }, [resolveBindings]);

  // Подписка на изменения stateManager
  useEffect(() => {
    if (!stateManager) return;

    const bindingPaths: string[] = [];
    if (component.valueBinding) {
      bindingPaths.push(component.valueBinding);
    }
    if (
      component.value &&
      typeof component.value === "string" &&
      component.value.startsWith("@")
    ) {
      bindingPaths.push(component.value);
    }
    if (component.visibleBinding) {
      bindingPaths.push(component.visibleBinding);
    }
    if (component.disabledBinding) {
      bindingPaths.push(component.disabledBinding);
    }

    if (bindingPaths.length === 0) {
      return;
    }

    const unsubscribe = stateManager.subscribe(
      (_elementPath: string, changedPath: string | null) => {
        if (!changedPath) {
          resolveBindings();
          return;
        }

        let shouldUpdate = false;
        for (const bp of bindingPaths) {
          const normalizedBp = bp.startsWith("@") ? bp.slice(1) : bp;

          let fullPath: string;
          if (normalizedBp.startsWith("state.")) {
            fullPath = `${pageId}.${normalizedBp}`;
          } else if (normalizedBp.startsWith(`${pageId}.state.`)) {
            fullPath = normalizedBp;
          } else if (normalizedBp.includes(".")) {
            fullPath = normalizedBp;
          } else {
            fullPath = `${pageId}.state.${normalizedBp}`;
          }

          const fullPathWithoutState = fullPath.replace(".state", "");

          if (
            changedPath.startsWith(fullPathWithoutState) ||
            fullPathWithoutState.startsWith(changedPath)
          ) {
            shouldUpdate = true;
            break;
          }
        }

        if (shouldUpdate) {
          resolveBindings();
        }
      },
    );

    return unsubscribe;
  }, [stateManager, component, pageId, resolveBindings]);

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
    resolvedValue,
    resolvedVisible,
    resolvedDisabled,
    isMounted,
    commandContextRef,
    handleEvent,
  };
}
