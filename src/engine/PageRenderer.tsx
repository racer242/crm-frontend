"use client";

import React, { useEffect } from "react";
import { Page } from "@/types";
import { SectionRenderer } from "./SectionRenderer";

export function PageRenderer({ page }: { page: Page }) {
  const { sections, layout, meta } = page;

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

  const executeCommands = (commands: any[]) => {
    commands.forEach((cmd) => {
      console.log(`[Page Command] ${cmd.type}:`, cmd.params);
    });
  };

  const layoutClass = layout ? getLayoutClass(layout) : "flex flex-column";

  const sectionsList = sections || [];

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
