"use client";

import React from "react";
import { Section } from "@/types";
import { BlockRenderer } from "./BlockRenderer";

export function SectionRenderer({ section }: { section: Section }) {
  const { layout, blocks, className, visibility } = section;

  if (visibility && visibility.defaultVisible === false) {
    return null;
  }

  const layoutClass = getLayoutClass(layout);

  return (
    <section className={`mb-4 ${layoutClass} ${className || ""}`}>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </section>
  );
}

function getLayoutClass(layout?: any): string {
  if (!layout) return "flex flex-column gap-4";

  const { type, direction, justifyContent } = layout;

  switch (type) {
    case "flex": {
      const dir = direction === "column" ? "flex-column" : "flex-row";
      const justify =
        justifyContent === "between" ? "justify-content-between" : "";
      return `flex ${dir} align-items-center ${justify} gap-4`;
    }
    case "grid":
      return `grid grid-nogutter`;
    default:
      return "flex flex-column gap-4";
  }
}
