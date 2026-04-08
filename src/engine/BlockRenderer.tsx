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
          <div
            className={`surface-card shadow-2 border-round-lg ${className || ""}`}
            style={style}
          >
            {wrapperProps.header && (
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-xl font-semibold text-100 m-0">
                  {wrapperProps.header}
                </h3>
              </div>
            )}
            <div className="p-4 pt-0">{content}</div>
          </div>
        );
      case "Panel":
        return (
          <Panel
            header={wrapperProps.header}
            className={`border-round-lg ${className || ""}`}
            style={style}
          >
            {content}
          </Panel>
        );
      case "Fieldset":
        return (
          <Fieldset
            legend={wrapperProps.header}
            className={`border-round-lg ${className || ""}`}
            style={style}
          >
            {content}
          </Fieldset>
        );
      case "Toolbar":
        return (
          <Toolbar
            className={`border-round-lg py-2 px-3 ${className || ""}`}
            style={style}
            start={
              <div className="flex align-items-center gap-2 flex-wrap">
                {content}
              </div>
            }
          />
        );
      default:
        return (
          <div className={`${className || ""} mb-3`} style={style}>
            {content}
          </div>
        );
    }
  }

  return (
    <div className={`${className || ""} mb-3`} style={style}>
      {content}
    </div>
  );
}
