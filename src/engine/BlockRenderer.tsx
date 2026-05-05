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

  const { style: wrapperStyle, className: wrapperClassName = "" } =
    wrapper || {};

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

  if (wrapper) {
    const wrapperProps = wrapper.props || {};

    switch (wrapper.component) {
      case "Card":
        return (
          <Card
            title={wrapperProps.header}
            className={wrapperClassName}
            style={wrapperStyle}
          >
            {content}
          </Card>
        );
      case "Panel":
        return (
          <Panel
            header={wrapperProps.header}
            className={wrapperClassName}
            style={wrapperStyle}
          >
            {content}
          </Panel>
        );
      case "Fieldset":
        return (
          <Fieldset
            legend={wrapperProps.header}
            className={wrapperClassName}
            style={wrapperStyle}
          >
            {content}
          </Fieldset>
        );
      case "Toolbar":
        return (
          <Toolbar
            className={wrapperClassName}
            style={wrapperStyle}
            start={
              <div className="flex align-items-center gap-2 flex-wrap">
                {content}
              </div>
            }
          />
        );
    }
  }

  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      {content}
    </div>
  );
}
