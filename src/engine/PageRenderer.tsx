"use client";

import React, { useEffect, useRef } from "react";
import { Page, App } from "@/types";
import { SectionRenderer } from "./SectionRenderer";
import { StateManager } from "@/core";

interface PageRendererProps {
  page: Page;
  appConfig?: App;
  stateManager?: StateManager;
}

export function PageRenderer({
  page,
  appConfig,
  stateManager,
}: PageRendererProps) {
  const { sections, layout, meta } = page;

  // Контекст для исполнения команд страницы
  const commandContextRef = useRef<{
    pageId: string;
    triggerComponentId: string;
    appConfig: App;
    stateManager: StateManager;
  } | null>(null);

  useEffect(() => {
    if (appConfig && stateManager) {
      commandContextRef.current = {
        pageId: page.id || "",
        triggerComponentId: page.id || "",
        appConfig,
        stateManager,
      };
    }
  }, [appConfig, stateManager, page.id]);

  const executeCommands = (commands: any[]) => {
    commands.forEach((cmd) => {
      console.log(`[Page Command] ${cmd.type}:`, cmd.params);

      // Выполняем команду если есть контекст
      if (commandContextRef.current && cmd.type === "setProperty") {
        import("@/core")
          .then(({ CommandExecutor }) => {
            const executor = new CommandExecutor(commandContextRef.current!);
            executor.executeCommand(cmd.type, cmd.params, {});
          })
          .catch(() => {
            console.warn("CommandExecutor not available");
          });
      }
    });
  };

  const layoutClass = layout ? getLayoutClass(layout) : "flex flex-column";
  const sectionsList = sections || [];

  useEffect(() => {
    if (page.onLoad) {
      executeCommands(page.onLoad);
    }
    return () => {
      if (page.onUnload) {
        executeCommands(page.onUnload);
      }
    };
  }, [page]);

  useEffect(() => {
    if (meta?.title) {
      document.title = meta.title;
    }
  }, [meta?.title]);

  return (
    <div className={layoutClass}>
      {sectionsList.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          pageId={page.id || ""}
          appConfig={appConfig}
          stateManager={stateManager}
        />
      ))}
    </div>
  );
}

function getLayoutClass(layout: any): string {
  const { type, gap } = layout;
  const classes: string[] = [];

  switch (type) {
    case "flex":
      classes.push("flex");
      classes.push(layout.direction === "column" ? "flex-column" : "flex-row");
      break;
    case "grid":
      classes.push("grid");
      break;
    default:
      classes.push("flex", "flex-column");
  }

  if (gap) classes.push(`gap-${gap}`);

  return classes.join(" ");
}
