"use client";

import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ComponentRendererProps } from "./types";
import { useTranslations } from "next-intl";

export function renderDataTable({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const t = useTranslations("datatable");
  const { columns, emptyMessage, ...restProps } = props;
  const columnList = columns || [];

  if (!columnList || columnList.length === 0) return null;

  return (
    <DataTable
      {...restProps}
      value={props.value || []}
      emptyMessage={emptyMessage || t("emptyMessage")}
      className={`w-full ${className || ""}`}
      style={style}
      {...(props.lazy ? { onPage: (e) => handleEvent("onPage", e) } : {})}
      onSort={(e) => handleEvent("onSort", e)}
      onRowClick={(e) => handleEvent("onRowClick", e)}
    >
      {columnList.map((col: any, index: number) => (
        <Column key={index} {...col} />
      ))}
    </DataTable>
  );
}
