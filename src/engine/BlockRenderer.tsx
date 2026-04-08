"use client";

import React from "react";
import { Block } from "@/types";
import { ComponentRenderer } from "./ComponentRenderer";
import { Card } from "primereact/card";
import { Panel } from "primereact/panel";
import { Fieldset } from "primereact/fieldset";
import { Toolbar } from "primereact/toolbar";

export function BlockRenderer({ block }: { block: Block }) {
  const { wrapper, components, className, style } = block;

  const content = (
    <div className="flex flex-column gap-3">
      {components.map((component) => (
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
            className={className || "mb-3"}
            style={style}
          >
            {content}
          </Card>
        );
      case "Panel":
        return (
          <Panel
            header={wrapperProps.header}
            className={className || "mb-3"}
            style={style}
          >
            {content}
          </Panel>
        );
      case "Fieldset":
        return (
          <Fieldset
            legend={wrapperProps.header}
            className={className || "mb-3"}
            style={style}
          >
            {content}
          </Fieldset>
        );
      case "Toolbar":
        return (
          <Toolbar className={className || "mb-3"} style={style}>
            {content}
          </Toolbar>
        );
      default:
        return (
          <div className={className || "mb-3"} style={style}>
            {content}
          </div>
        );
    }
  }

  return (
    <div className={className || "mb-3"} style={style}>
      {content}
    </div>
  );
}
