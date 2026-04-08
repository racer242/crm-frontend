"use client";

import React, { useEffect, useState } from "react";
import { Page } from "@/types";
import { SectionRenderer } from "./SectionRenderer";
import { Toast } from "primereact/toast";

export function PageRenderer({ page }: { page: Page }) {
  const { sections, layout, meta } = page;
  const toastRef = React.useRef<Toast>(null);

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

  const layoutClass = layout
    ? getLayoutClass(layout)
    : "flex flex-column gap-6";

  return (
    <div className={layoutClass}>
      <Toast ref={toastRef} />
      {sections.map((section) => (
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
