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
  const {
    wrapper,
    components,
    style,
    className = "flex flex-column gap-2",
  } = block;

  // Проверка на наличие компонентов
  if (!components || components.length === 0) {
    return <div className={className} style={style}></div>;
  }

  const content = (
    <div className={className} style={style}>
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
      case "Panel":
        return <Panel {...wrapperProps}>{content}</Panel>;
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
  }

  return <div {...wrapperProps}>{content}</div>;
}
