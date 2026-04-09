"use client";

import React from "react";
import { Section } from "@/types";
import { BlockRenderer } from "./BlockRenderer";

export function SectionRenderer({ section }: { section: Section }) {
  const { layout, className, visibility } = section;

  if (visibility && visibility.defaultVisible === false) {
    return null;
  }

  const layoutClass = getLayoutClass(layout);
  const blocks = section.blocks || [];

  return (
    <section className={`mb-5 ${layoutClass} ${className || ""}`}>
      {blocks.map((block) => (
        <div
          key={block.id}
          className={block.className || getBlockWrapperClass(layout)}
        >
          <BlockRenderer block={block} />
        </div>
      ))}
    </section>
  );
}

function getBlockWrapperClass(layout?: any): string {
  if (!layout) return "w-full";

  const { type, columns } = layout;

  if (type === "grid") {
    const cols = columns || 2;
    if (cols === 4) return "col-12 md:col-6 lg:col-3";
    if (cols === 3) return "col-12 md:col-6 lg:col-4";
    if (cols === 2) return "col-12 md:col-6";
    return "col-12";
  }

  if (type === "flex" && layout.direction === "row") {
    return "flex-1 min-w-0";
  }

  return "w-full";
}

function getLayoutClass(layout?: any): string {
  if (!layout) return "flex flex-column gap-4";

  const { type, direction, justifyContent } = layout;

  switch (type) {
    case "flex": {
      const dir = direction === "column" ? "flex-column" : "flex-row";
      const justify =
        justifyContent === "between" ? "justify-content-between" : "";
      const align = justifyContent === "between" ? "" : "align-items-start";
      return `flex ${dir} ${align} ${justify} gap-4`;
    }
    case "grid":
      return "grid";
    default:
      return "flex flex-column gap-4";
  }
}
