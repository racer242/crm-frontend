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
  const { tabs, ...restProps } = props;
  const tabList = tabs || [];

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
    <TabView className={`mb-4 ${className || ""}`} style={style} {...restProps}>
      {tabList.map((tab: any, index: number) => (
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
  const { tabs, activeIndex, ...restProps } = props;
  const tabList = tabs || [];

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
      key={activeIndex}
      className={className || ""}
      style={style}
      activeIndex={activeIndex}
      {...restProps}
    >
      {tabList.map((tab: any, index: number) => (
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
  const { components, value, ...restProps } = props;
  const carouselValue = value || [];

  return (
    <Carousel
      {...restProps}
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
  const { components, grid, containerClassName, ...restProps } = props;
  const componentList: Component[] = components || [];
  const gridConfig = grid;
  const containerClassNameValue: string =
    containerClassName || "flex flex-column gap-2";

  const renderComponents = () => {
    if (!componentList || componentList.length === 0) {
      return null;
    }

    if (gridConfig) {
      const gridContainerClass = [containerClassNameValue, "grid"]
        .filter(Boolean)
        .join(" ");
      return (
        <div className={gridContainerClass}>
          {componentList
            .filter((c) => c !== null && c !== undefined)
            .map((component) => {
              const index = componentList.indexOf(component);
              const colClass =
                (gridConfig.cols && gridConfig.cols[index]) || "";
              const wrapperClasses = [colClass, gridConfig.padding]
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
      <div className={containerClassNameValue}>
        {componentList
          .filter((c) => c !== null && c !== undefined)
          .map((component) => (
            <ComponentRenderer key={component.id} component={component} />
          ))}
      </div>
    );
  };

  // Если header не задан, добавляем inline-стиль для верхнего бордера
  const panelStyle = !restProps.header
    ? {
        ...style,
        borderTop: "1px solid var(--surface-border)",
        borderTopLeftRadius: "var(--border-radius)",
        borderTopRightRadius: "var(--border-radius)",
      }
    : style;

  return (
    <Panel {...restProps} className={className} style={panelStyle}>
      {renderComponents()}
    </Panel>
  );
}
