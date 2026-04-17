"use client";

import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ComponentRendererProps } from "./types";

export function renderDataTable({
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <DataTable
      {...props}
      value={props.value || []}
      className={`w-full ${className || ""}`}
      style={style}
    >
      {props.columns?.map((col: any, index: number) => (
        <Column key={index} field={col.field} header={col.header} />
      ))}
    </DataTable>
  );
}
