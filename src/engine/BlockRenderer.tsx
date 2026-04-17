"use client";

import React from "react";
import { Block, App } from "@/types";
import { ComponentRenderer } from "./ComponentRenderer";
import { Card } from "primereact/card";
import { Panel } from "primereact/panel";
import { Fieldset } from "primereact/fieldset";
import { Toolbar } from "primereact/toolbar";
import { StateManager } from "@/core";

interface BlockRendererProps {
  block: Block;
  pageId?: string;
  appConfig?: App;
  stateManager?: StateManager;
}

export function BlockRenderer({
  block,
  pageId,
  appConfig,
  stateManager,
}: BlockRendererProps) {
  const { wrapper, components, style, className } = block;

  // Проверка на наличие компонентов
  if (!components || components.length === 0) {
    return <div className={className} style={style}></div>;
  }

  const content = (
    <div className="flex flex-column gap-3">
      {components
        .filter((c) => c !== null && c !== undefined) // Фильтруем null/undefined компоненты
        .map((component) => (
          <ComponentRenderer
            key={component.id}
            component={component}
            pageId={pageId || ""}
            appConfig={appConfig}
            stateManager={stateManager}
          />
        ))}
    </div>
  );

  if (wrapper) {
    const wrapperProps = wrapper.props || {};

    switch (wrapper.component) {
      case "Card":
        return (
          <Card title={wrapperProps.header} style={style}>
            {content}
          </Card>
        );
      case "Panel":
        return (
          <Panel header={wrapperProps.header} style={style}>
            {content}
          </Panel>
        );
      case "Fieldset":
        return (
          <Fieldset legend={wrapperProps.header} style={style}>
            {content}
          </Fieldset>
        );
      case "Toolbar":
        return (
          <Toolbar
            style={style}
            start={
              <div className="flex align-items-center gap-2 flex-wrap">
                {content}
              </div>
            }
          />
        );
      default:
        return <div style={style}>{content}</div>;
    }
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  );
}
