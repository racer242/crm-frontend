"use client";

import React from "react";
import { Section } from "@/types";
import { BlockRenderer } from "./BlockRenderer";

/**
 * SectionRenderer - рендерит секцию с её layout и блоками
 */
export function SectionRenderer({ section }: { section: Section }) {
  const { layout, blocks, className, style, visibility } = section;

  // Проверка видимости
  if (visibility && visibility.defaultVisible === false) {
    return null;
  }

  // Определяем классы для layout
  const layoutClasses = getLayoutClasses(layout);

  return (
    <section className={`${className || ""} ${layoutClasses}`} style={style}>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </section>
  );
}

/**
 * Получение CSS классов на основе layout конфигурации
 */
function getLayoutClasses(layout?: any): string {
  if (!layout) return "flex flex-col gap-4";

  const { type, direction, gap, alignItems, justifyContent } = layout;

  const classes: string[] = [];

  switch (type) {
    case "flex":
      classes.push("flex");
      classes.push(direction === "column" ? "flex-col" : "flex-row");
      
      if (gap) classes.push(`gap-${gap}`);
      if (alignItems) classes.push(`items-${alignItems}`);
      if (justifyContent) classes.push(`justify-${justifyContent}`);
      break;

    case "grid":
      classes.push("grid");
      if (layout.columns) {
        classes.push(`grid-cols-${layout.columns}`);
      }
      if (gap) classes.push(`gap-${gap}`);
      break;

    case "stack":
      classes.push("relative");
      break;

    default:
      classes.push("flex", "flex-col", "gap-4");
  }

  return classes.join(" ");
}
