"use client";

import React from "react";
import { TabView, TabPanel } from "primereact/tabview";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Carousel } from "primereact/carousel";
import { ComponentRendererProps } from "./types";
import { ComponentRenderer } from "../ComponentRenderer";
import { Component } from "@/types";

export function renderTabView({
  props,
  className,
  style,
  pageId,
  appConfig,
  stateManager,
  elementIndex,
  showToast,
  navigate,
  confirm,
}: ComponentRendererProps) {
  const tabs = props.tabs || [];

  const renderComponents = (components: Component[]) => (
    <div className="flex flex-column gap-3">
      {components
        .filter((c) => c !== null && c !== undefined)
        .map((component) => (
          <ComponentRenderer
            key={component.id}
            component={component}
            pageId={pageId || ""}
            appConfig={appConfig}
            stateManager={stateManager}
            elementIndex={elementIndex}
            showToast={showToast}
            navigate={navigate}
            confirm={confirm}
          />
        ))}
    </div>
  );

  return (
    <TabView className={`mb-4 ${className || ""}`} style={style}>
      {tabs.map((tab: any, index: number) => (
        <TabPanel key={tab.id || index} {...(tab.props || {})}>
          {tab.components ? renderComponents(tab.components) : null}
        </TabPanel>
      ))}
    </TabView>
  );
}

export function renderAccordion({
  props,
  className,
  style,
  pageId,
  appConfig,
  stateManager,
  elementIndex,
  showToast,
  navigate,
  confirm,
}: ComponentRendererProps) {
  const tabs = props.tabs || [];

  const renderComponents = (components: Component[]) => (
    <div className="flex flex-column gap-3">
      {components
        .filter((c) => c !== null && c !== undefined)
        .map((component) => (
          <ComponentRenderer
            key={component.id}
            component={component}
            pageId={pageId || ""}
            appConfig={appConfig}
            stateManager={stateManager}
            elementIndex={elementIndex}
            showToast={showToast}
            navigate={navigate}
            confirm={confirm}
          />
        ))}
    </div>
  );

  return (
    <Accordion
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
