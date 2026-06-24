"use client";

import React from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ComponentRendererProps } from "./types";
import { ComponentRenderer } from "../ComponentRenderer";
import { useTranslations } from "next-intl";
import { resolveRowBindings } from "../utils/resolveRowBindings";

type CustomColumnDefinition = {
  field: string;
  header: string;
  sortable?: boolean;
  order?: number;
  body?: Record<string, any>[];
};

// Keys that are internal to custom column config and should not be merged into Column props
// "body" is NOT here because it needs to be passed through for custom rendering
const CUSTOM_COLUMN_INTERNAL_KEYS = new Set(["order"]);

/**
 * Merges customColumns into the standard columns array.
 * - If a custom column's `field` matches an existing column, it merges with that column.
 * - Original column properties are preserved unless overridden by custom column.
 * - If no match, the custom column is ignored.
 * - `order`: 0 = first, -1 = last, 1,2,3... = sorted position in middle.
 * - If `order` is not specified and the column replaces an existing one, it keeps the original position.
 */
function mergeCustomColumns(
  baseColumns: any[],
  customColumns: CustomColumnDefinition[],
): any[] {
  if (!customColumns || customColumns.length === 0) return baseColumns;

  // Filter custom columns that match an existing column field
  const validCustomColumns = customColumns.filter((cc) =>
    baseColumns.some((bc) => bc.field === cc.field),
  );

  if (validCustomColumns.length === 0) return baseColumns;

  // Build a map of custom columns by field for quick lookup
  const customByField = new Map<string, CustomColumnDefinition>();
  for (const cc of validCustomColumns) {
    customByField.set(cc.field, cc);
  }

  // Build result by iterating over baseColumns
  const result: any[] = [];
  const first: any[] = [];
  const middle: any[] = [];
  const last: any[] = [];

  for (const baseCol of baseColumns) {
    const customCol = customByField.get(baseCol.field);
    if (customCol) {
      // Merge: start with base column properties, then override with custom column properties
      // Extract only the Column-relevant props from customCol (exclude internal keys)
      const customColProps: Record<string, any> = {};
      for (const [key, val] of Object.entries(customCol)) {
        if (!CUSTOM_COLUMN_INTERNAL_KEYS.has(key)) {
          customColProps[key] = val;
        }
      }
      const merged = { ...baseCol, ...customColProps };

      // Determine position based on order
      if (customCol.order === 0) {
        first.push(merged);
      } else if (customCol.order === -1) {
        last.push(merged);
      } else if (customCol.order !== undefined && customCol.order > 0) {
        middle.push(merged);
      } else {
        // order is undefined or <= 0 but not -1: preserve original position
        result.push(merged);
      }
    } else {
      // Base column not replaced, keep it
      result.push(baseCol);
    }
  }

  // Sort middle by order ascending
  middle.sort((a, b) => (a.order || 0) - (b.order || 0));

  // Build final column list: first + middle + result (preserved positions + non-replaced) + last
  return [...first, ...middle, ...result, ...last];
}

/**
 * Renders the body content for a custom column cell.
 */
function renderCustomColumnBody(
  bodyComponents: Record<string, any>[],
  rowData: any,
  fieldName: string,
): React.ReactNode {
  if (!bodyComponents || bodyComponents.length === 0) return null;

  return (
    <div className="flex align-items-center gap-2">
      {bodyComponents.map((compDef) => {
        // Resolve @field / @row.* tokens in the component definition
        const resolvedDef = resolveRowBindings(compDef, rowData, fieldName);
        // Ensure it has an id for React key
        const component = {
          ...resolvedDef,
          type: "component" as const,
          id:
            resolvedDef.id ||
            `${fieldName}-${compDef.componentType || "unknown"}`,
        };
        return (
          <ComponentRenderer key={component.id} component={component as any} />
        );
      })}
    </div>
  );
}

export function renderDataTable({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const t = useTranslations("datatable");
  const { columns, customColumns, emptyMessage, ...restProps } = props;
  const baseColumnList: any[] = columns || [];

  // Merge custom columns into the column list
  const mergedColumns = mergeCustomColumns(baseColumnList, customColumns);

  if (!mergedColumns || mergedColumns.length === 0) return null;

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
      {mergedColumns.map((col: any, index: number) => {
        // Check if this is a custom column with body components
        const customCol = col as CustomColumnDefinition;
        const hasCustomBody =
          customCol.body &&
          Array.isArray(customCol.body) &&
          customCol.body.length > 0;

        if (hasCustomBody) {
          return (
            <Column
              key={`${customCol.field}-${index}`}
              field={customCol.field}
              header={customCol.header}
              sortable={customCol.sortable}
              body={(rowData: any) =>
                renderCustomColumnBody(
                  customCol.body!,
                  rowData,
                  customCol.field,
                )
              }
            />
          );
        }

        return <Column key={index} {...col} />;
      })}
    </DataTable>
  );
}
