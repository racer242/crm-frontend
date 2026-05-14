"use client";

import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ComponentRendererProps } from "./types";

export function renderDataTable({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  if (!props?.columns) return null;

  return (
    <DataTable
      {...props}
      value={props.value || []}
      className={`w-full ${className || ""}`}
      style={style}
      {...(props.lazy ? { onPage: (e) => handleEvent("onPage", e) } : {})}
    >
      {props.columns?.map((col: any, index: number) => (
        <Column key={index} {...col} />
      ))}
    </DataTable>
  );
}
