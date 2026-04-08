"use client";

import React, { useEffect, useState } from "react";
import { Page } from "@/types";
import { SectionRenderer } from "./SectionRenderer";
import { Toast } from "primereact/toast";

/**
 * PageRenderer - рендерит страницу с её секциями
 */
export function PageRenderer({ page }: { page: Page }) {
  const { sections, layout, meta } = page;
  const [loading, setLoading] = useState(false);
  const toastRef = React.useRef<Toast>(null);

  // Выполнение onLoad команд
  useEffect(() => {
    if (page.onLoad) {
      executeCommands(page.onLoad);
    }

    // Cleanup - onUnload
    return () => {
      if (page.onUnload) {
        executeCommands(page.onUnload);
      }
    };
  }, [page]);

  // Обновление title страницы
  useEffect(() => {
    if (meta?.title) {
      document.title = meta.title;
    }
  }, [meta?.title]);

  const executeCommands = (commands: any[]) => {
    commands.forEach((cmd) => {
      console.log(`[Page Command] ${cmd.type}:`, cmd.params);
      // Здесь будет полноценная система выполнения команд
    });
  };

  const layoutClasses = layout ? getLayoutClasses(layout) : "flex flex-col gap-6";

  return (
    <div className={layoutClasses}>
      <Toast ref={toastRef} />
      
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
}

/**
 * Получение CSS классов для layout страницы
 */
function getLayoutClasses(layout: any): string {
  const { type, gap } = layout;
  const classes: string[] = [];

  switch (type) {
    case "flex":
      classes.push("flex");
      classes.push(layout.direction === "column" ? "flex-col" : "flex-row");
      break;
    case "grid":
      classes.push("grid");
      if (layout.columns) {
        classes.push(`grid-cols-${layout.columns}`);
      }
      break;
    default:
      classes.push("flex", "flex-col");
  }

  if (gap) classes.push(`gap-${gap}`);
  
  return classes.join(" ");
}
