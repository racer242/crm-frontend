"use client";

import React from "react";
import { Block } from "@/types";
import { ComponentRenderer } from "./ComponentRenderer";
import { Card } from "primereact/card";
import { Panel } from "primereact/panel";
import { Fieldset } from "primereact/fieldset";
import { Toolbar } from "primereact/toolbar";

/**
 * BlockRenderer - рендерит блок с его оберткой и компонентами
 */
export function BlockRenderer({ block }: { block: Block }) {
  const { wrapper, components, className, style } = block;

  // Контент блока - рендерим все компоненты
  const content = (
    <div className="flex flex-col gap-3">
      {components.map((component) => (
        <ComponentRenderer key={component.id} component={component} />
      ))}
    </div>
  );

  // Если есть обертка, рендерим соответствующий компонент
  if (wrapper) {
    const wrapperProps = wrapper.props || {};

    switch (wrapper.component) {
      case "Card":
        return (
          <Card
            title={wrapperProps.header}
            className={className}
            style={style}
          >
            {content}
          </Card>
        );
      case "Panel":
        return (
          <Panel
            header={wrapperProps.header}
            className={className}
            style={style}
          >
            {content}
          </Panel>
        );
      case "Fieldset":
        return (
          <Fieldset
            legend={wrapperProps.header}
            className={className}
            style={style}
          >
            {content}
          </Fieldset>
        );
      case "Toolbar":
        return (
          <Toolbar className={className} style={style}>
            {content}
          </Toolbar>
        );
      default:
        return (
          <div className={className} style={style}>
            {content}
          </div>
        );
    }
  }

  // Без обертки
  return (
    <div className={className} style={style}>
      {content}
    </div>
  );
}
