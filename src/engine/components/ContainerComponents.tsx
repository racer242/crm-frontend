"use client";

import React from "react";
import { TabView, TabPanel } from "primereact/tabview";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Carousel } from "primereact/carousel";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ComponentRendererProps } from "./types";

export function renderTabView({
  props,
  className,
  style,
}: ComponentRendererProps) {
  const tabs = props.tabs || [];

  return (
    <TabView className={`mb-4 ${className || ""}`} style={style}>
      {tabs.map((tab: any, index: number) => (
        <TabPanel key={index} header={tab.label}>
          <div className="p-3">
            {tab.content?.type === "table" ? (
              <DataTable value={tab.content.data || []} className="w-full">
                {tab.content.columns?.map((col: any, i: number) => (
                  <Column key={i} field={col.field} header={col.header} />
                ))}
              </DataTable>
            ) : (
              <p className="text-300 m-0">{tab.content}</p>
            )}
          </div>
        </TabPanel>
      ))}
    </TabView>
  );
}

export function renderAccordion({
  props,
  className,
  style,
}: ComponentRendererProps) {
  const tabs = props.tabs || [];

  return (
    <Accordion
      className={className || ""}
      style={style}
      activeIndex={props.activeIndex}
    >
      {tabs.map((tab: any, index: number) => (
        <AccordionTab key={index} header={tab.header}>
          <p className="text-300 m-0">{tab.content}</p>
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
