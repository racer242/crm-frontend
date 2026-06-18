"use client";

import React from "react";
import { Block } from "@/types";
import { ComponentRenderer } from "./ComponentRenderer";
import { Card } from "primereact/card";
import { Panel } from "primereact/panel";
import { Fieldset } from "primereact/fieldset";
import { Toolbar } from "primereact/toolbar";

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  const { wrapper, components, style, className, grid } = block;

  // Дефолтный класс: для grid-раскладки — "grid", иначе — "flex flex-column gap-2"
  const containerClassName = grid
    ? [className || "", "grid"].filter(Boolean).join(" ")
    : className || "flex flex-column gap-2";

  // Проверка на наличие компонентов
  if (!components || components.length === 0) {
    return <div className={containerClassName} style={style}></div>;
  }

  const content = grid ? (
    <div className={containerClassName} style={style}>
      {components
        .filter((c) => c !== null && c !== undefined)
        .map((component, index) => {
          const colClass = grid.cols[index] || "";
          const wrapperClasses = [colClass, grid.padding]
            .filter(Boolean)
            .join(" ");
          return (
            <div key={component.id} className={wrapperClasses}>
              <ComponentRenderer component={component} />
            </div>
          );
        })}
    </div>
  ) : (
    <div className={containerClassName} style={style}>
      {components
        .filter((c) => c !== null && c !== undefined)
        .map((component) => (
          <ComponentRenderer key={component.id} component={component} />
        ))}
    </div>
  );

  const wrapperProps = wrapper?.props || {};
  if (wrapper) {
    switch (wrapper.component) {
      case "Card":
        return <Card {...wrapperProps}>{content}</Card>;
      case "Panel": {
        // Если header не задан, добавляем inline-стиль для верхнего бордера
        const panelStyle = wrapperProps.header
          ? wrapperProps.style
          : {
              ...wrapperProps.style,
              borderTop: "1px solid var(--surface-border)",
              borderTopLeftRadius: "var(--border-radius)",
              borderTopRightRadius: "var(--border-radius)",
            };
        return (
          <Panel {...wrapperProps} style={panelStyle}>
            {content}
          </Panel>
        );
      }
      case "Fieldset":
        return <Fieldset {...wrapperProps}>{content}</Fieldset>;
      case "Toolbar":
        return (
          <Toolbar
            {...wrapperProps}
            start={
              <div className="flex align-items-center gap-2 flex-wrap">
                {content}
              </div>
            }
          />
        );
    }
    return <div {...wrapperProps}>{content}</div>;
  }

  return content;
}
