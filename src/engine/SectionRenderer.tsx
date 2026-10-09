"use client";

import React from "react";
import { Section } from "@/types";
import { BlockRenderer } from "./BlockRenderer";
import { useCampFeatures } from "./ComponentContext";
import { matchesFeatureGate } from "@/utils/campFeatures";

interface SectionRendererProps {
  section: Section;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  const { className, visibility, grid } = section;
  const campFeatures = useCampFeatures();

  // Фича-гейт кампании: элемент без включённой фичи не рендерится вовсе
  if (!matchesFeatureGate(campFeatures, section.feature)) {
    return null;
  }

  if (visibility && visibility.defaultVisible === false) {
    return null;
  }

  const blocks = section.blocks || [];

  // Фича-гейт: скрытые блоки исключаются ДО раскладки — иначе grid-обёртка
  // <div className={colClass}> осталась бы и занимала ячейку. Колонки —
  // по фактическому составу: ряд сжимается без дыр.
  const visibleBlocks = blocks.filter(
    (b) => b !== null && b !== undefined && matchesFeatureGate(campFeatures, b.feature),
  );

  // Все блоки скрыты — секция не оставляет пустого места
  if (blocks.length > 0 && visibleBlocks.length === 0) {
    return null;
  }

  // Если указана grid-раскладка — оборачиваем блоки в div-ы с col-классами
  if (grid) {
    const sectionClasses = [className || "mb-5", "grid"]
      .filter(Boolean)
      .join(" ");

    return (
      <section className={sectionClasses}>
        {visibleBlocks.map((block, index) => {
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
      {visibleBlocks.map((block) => {
        return <BlockRenderer key={block.id} block={block} />;
      })}
    </section>
  );
}
