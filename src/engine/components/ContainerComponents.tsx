"use client";

import React from "react";
import { TabView, TabPanel } from "primereact/tabview";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Carousel } from "primereact/carousel";
import { Panel } from "primereact/panel";
import { ComponentRendererProps } from "./types";
import { ComponentRenderer } from "../ComponentRenderer";
import { Component } from "@/types";

export function renderTabView(
  renderProps: ComponentRendererProps & Record<string, any>,
) {
  const { props, className, style } = renderProps;
  const tabs = props.tabs || [];

  const renderComponents = (components: Component[]) => (
    <div className="flex flex-column gap-3">
      {components
        .filter((c) => c !== null && c !== undefined)
        .map((comp) => (
          <ComponentRenderer key={comp.id} component={comp} />
        ))}
    </div>
  );

  return (
    <TabView
      className={`mb-4 ${className || ""}`}
      style={style}
      renderActiveOnly={props.renderActiveOnly}
    >
      {tabs.map((tab: any, index: number) => (
        <TabPanel key={tab.id || index} {...(tab.props || {})}>
          {tab.components ? renderComponents(tab.components) : null}
        </TabPanel>
      ))}
    </TabView>
  );
}

export function renderAccordion(
  renderProps: ComponentRendererProps & Record<string, any>,
) {
  const { props, className, style } = renderProps;
  const tabs = props.tabs || [];

  const renderComponents = (components: Component[]) => (
    <div className="flex flex-column gap-3">
      {components
        .filter((c) => c !== null && c !== undefined)
        .map((comp) => (
          <ComponentRenderer key={comp.id} component={comp} />
        ))}
    </div>
  );

  return (
    <Accordion
      key={props.activeIndex}
      className={className || ""}
      style={style}
      activeIndex={props.activeIndex}
    >
      {tabs.map((tab: any, index: number) => (
        <AccordionTab key={tab.id || index} {...(tab.props || {})}>
          {tab.components ? renderComponents(tab.components) : null}
        </AccordionTab>
      ))}
    </Accordion>
  );
}

export function renderCarousel({
  props,
  className,
  style,
}: ComponentRendererProps) {
  const carouselValue = props.value || [];

  return (
    <Carousel
      {...props}
      value={carouselValue}
      className={`mb-4 ${className || ""}`}
      style={style}
      itemTemplate={(item: any) => (
        <div className="p-4 text-center surface-800 border-round-md mx-2">
          <p className="font-bold text-100 mb-1">{item.name}</p>
          <p className="text-400 text-sm">Sales: {item.sales}</p>
        </div>
      )}
    />
  );
}

export function renderPanel(
  renderProps: ComponentRendererProps & Record<string, any>,
) {
  const { props, className, style } = renderProps;
  const components: Component[] = props.components || [];
  const grid = props.grid;
  const containerClassName: string =
    props.containerClassName || "flex flex-column gap-2";

  // Извлекаем containerClassName из props, чтобы не передавать в Panel
  const { containerClassName: _, ...panelProps } = props;

  const renderComponents = () => {
    if (!components || components.length === 0) {
      return null;
    }

    if (grid) {
      const gridContainerClass = [containerClassName, "grid"]
        .filter(Boolean)
        .join(" ");
      return (
        <div className={gridContainerClass}>
          {components
            .filter((c) => c !== null && c !== undefined)
            .map((component) => {
              const index = components.indexOf(component);
              const colClass = (grid.cols && grid.cols[index]) || "";
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
      );
    }

    return (
      <div className={containerClassName}>
        {components
          .filter((c) => c !== null && c !== undefined)
          .map((component) => (
            <ComponentRenderer key={component.id} component={component} />
          ))}
      </div>
    );
  };

  // Если header не задан, добавляем inline-стиль для верхнего бордера
  const panelStyle = !props.header
    ? { ...style, borderTop: "1px solid var(--surface-d)" }
    : style;

  return (
    <Panel {...panelProps} className={className} style={panelStyle}>
      {renderComponents()}
    </Panel>
  );
}
