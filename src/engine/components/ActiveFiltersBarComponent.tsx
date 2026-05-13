"use client";

import React, { useCallback, useMemo } from "react";
import { Chip } from "primereact/chip";
import { Button } from "primereact/button";
import { FilterItem, FilterModel } from "@/types";
import { ComponentRendererProps } from "./types";

/**
 * ActiveFiltersBar — горизонтальная панель активных фильтров в виде чипов
 *
 * Props:
 * - value: FilterModel — массив фильтров (линкуется через @state.filters)
 *
 * События:
 * - onChange: вызывается с обновлённой FilterModel при удалении фильтра
 *
 * Отображается только если есть фильтры с непустыми значениями.
 */
export function renderActiveFiltersBar({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const { value: filters = [] } = props;

  // Фильтруем только те, у которых есть активное значение
  const activeFilters = useMemo(() => {
    return filters.filter((f: FilterItem) => {
      if (f.type === "checkbox" || f.type === "switch") return !!f.value;
      if (f.type === "options") {
        return Array.isArray(f.value) && f.value.some(Boolean);
      }
      if (f.type === "period" || f.type === "range") {
        // Хотя бы одно значение не null/undefined
        return (
          Array.isArray(f.value) && (f.value[0] != null || f.value[1] != null)
        );
      }
      return f.value !== undefined && f.value !== null && f.value !== "";
    });
  }, [filters]);

  // Сформировать массив чипов для отображения
  // Возвращает массив объектов { key, label, filterId, optionIndex? }
  const chips = useMemo(() => {
    const result: Array<{
      key: string;
      label: string;
      filterId: string;
      optionIndex?: number;
    }> = [];

    for (const f of activeFilters) {
      const { id, name, type, value, opts } = f;

      switch (type) {
        case "checkbox":
        case "switch":
          result.push({ key: id, label: name, filterId: id });
          break;

        case "text":
        case "number":
          result.push({ key: id, label: `${name}: ${value}`, filterId: id });
          break;

        case "date": {
          const dateStr = formatDate(value);
          result.push({ key: id, label: `${name}: ${dateStr}`, filterId: id });
          break;
        }

        case "period": {
          const periodValue = Array.isArray(value) ? value : [null, null];
          const from = formatDate(periodValue[0]);
          const to = formatDate(periodValue[1]);
          let label: string;
          if (from && to) {
            label = `${name}: ${from} – ${to}`;
          } else if (from) {
            label = `${name}: от ${from}`;
          } else if (to) {
            label = `${name}: до ${to}`;
          } else {
            label = `${name}: ?`;
          }
          result.push({
            key: id,
            label,
            filterId: id,
          });
          break;
        }

        case "range": {
          const rangeValue = Array.isArray(value) ? value : [];
          const begin = rangeValue[0];
          const end = rangeValue[1];
          let label: string;
          if (begin !== undefined && end !== undefined) {
            label = `${name}: ${begin} – ${end}`;
          } else if (begin !== undefined) {
            label = `${name}: от ${begin}`;
          } else if (end !== undefined) {
            label = `${name}: до ${end}`;
          } else {
            label = `${name}: ?`;
          }
          result.push({
            key: id,
            label,
            filterId: id,
          });
          break;
        }

        case "slider":
          result.push({ key: id, label: `${name}: ${value}`, filterId: id });
          break;

        case "radio":
          result.push({ key: id, label: `${name}: ${value}`, filterId: id });
          break;

        case "options": {
          const optionsList = Array.isArray(opts) ? opts : [];
          const selectedValues = Array.isArray(value) ? value : [];
          for (let i = 0; i < optionsList.length; i++) {
            if (selectedValues[i]) {
              result.push({
                key: `${id}-${i}`,
                label: optionsList[i],
                filterId: id,
                optionIndex: i,
              });
            }
          }
          break;
        }
      }
    }

    return result;
  }, [activeFilters]);

  // Удалить конкретный фильтр
  const removeFilter = useCallback(
    (filterId: string, optionIndex?: number) => {
      const updatedFilters = filters.map((f: FilterItem) => {
        if (f.id !== filterId) return f;

        if (optionIndex !== undefined && f.type === "options") {
          // Снять конкретную опцию в options-фильтре
          const values = Array.isArray(f.value) ? [...f.value] : [];
          values[optionIndex] = false;
          return { ...f, value: values };
        }

        // Сбросить значение фильтра
        return { ...f, value: undefined };
      });

      handleEvent("onChange", { value: updatedFilters });
    },
    [filters, handleEvent],
  );

  // Очистить все фильтры
  const clearAll = useCallback(() => {
    const emptyFilters = filters.map((f: FilterItem) => ({
      ...f,
      value: undefined,
    }));
    handleEvent("onChange", { value: emptyFilters });
  }, [filters, handleEvent]);

  // Если нет активных фильтров — не показываем панель
  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex align-items-center gap-2 flex-wrap p-2 border-1 surface-border border-round ${className || ""}`}
      style={style}
    >
      <Button
        icon="pi pi-filter-slash"
        onClick={clearAll}
        className="p-button-rounded p-button-text p-button-sm"
        tooltip="Очистить все фильтры"
        tooltipOptions={{ position: "top" }}
        style={{ flexShrink: 0 }}
      />

      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          removable
          onRemove={() => {
            removeFilter(chip.filterId, chip.optionIndex);
            return true;
          }}
        />
      ))}
    </div>
  );
}

/**
 * Форматирование даты для отображения
 */
function formatDate(value: any): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return String(value);
  }
}
