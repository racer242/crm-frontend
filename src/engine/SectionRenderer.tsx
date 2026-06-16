"use client";

import React from "react";
import { Section } from "@/types";
import { BlockRenderer } from "./BlockRenderer";

interface SectionRendererProps {
  section: Section;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  const { className, visibility, grid } = section;

  if (visibility && visibility.defaultVisible === false) {
    return null;
  }

  const blocks = section.blocks || [];

  // Если указана grid-раскладка — оборачиваем блоки в div-ы с col-классами
  if (grid) {
    const sectionClasses = [className || "mb-5", "grid"]
      .filter(Boolean)
      .join(" ");

    return (
      <section className={sectionClasses}>
        {blocks.map((block, index) => {
          const colClass = grid.cols[index] || "";
          const wrapperClasses = [colClass, grid.padding]
            .filter(Boolean)
            .join(" ");
          return (
            <div key={block.id} className={wrapperClasses}>
              <BlockRenderer block={block} />
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section className={`${className || "flex mb-5"}`}>
      {blocks.map((block) => {
        return <BlockRenderer key={block.id} block={block} />;
      })}
    </section>
  );
}
