"use client";

import React, { useEffect } from "react";
import { Page } from "@/types";
import { SectionRenderer } from "./SectionRenderer";
import { useCommandExecutor } from "./hooks/useCommandExecutor";

interface PageRendererProps {
  page: Page;
}

export function PageRenderer({ page }: PageRendererProps) {
  const { sections, layout, meta } = page;

  // Единый экземпляр CommandExecutor для страницы (с pageRoute в контексте)
  const executor = useCommandExecutor({
    triggerComponentId: page.id,
  });

  const layoutClass = layout ? getLayoutClass(layout) : "flex flex-column";
  const sectionsList = sections || [];

  useEffect(() => {
    const pageEvents = (page as any).events || [];
    const onLoadEvent = pageEvents.find((e: any) => e.type === "onLoad");
    const onLoadCommands = onLoadEvent?.commands || page.onLoad || [];
    if (onLoadCommands.length > 0 && executor) {
      onLoadCommands.forEach((cmd: any) => {
        executor.executeCommand(cmd.type, cmd.params, {});
      });
    }

    return () => {
      const onUnloadEvent = pageEvents.find((e: any) => e.type === "onUnload");
      const onUnloadCommands = onUnloadEvent?.commands || page.onUnload || [];
      if (onUnloadCommands.length > 0 && executor) {
        onUnloadCommands.forEach((cmd: any) => {
          executor.executeCommand(cmd.type, cmd.params, {});
        });
      }
    };
  }, [page, executor]);

  useEffect(() => {
    if (meta?.title) {
      document.title = meta.title;
    }
  }, [meta?.title]);

  return (
    <div className={layoutClass}>
      {sectionsList.map((section) => (
        <SectionRenderer key={section.id} section={section} />
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
