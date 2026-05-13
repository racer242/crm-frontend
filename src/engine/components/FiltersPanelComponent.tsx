"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { RadioButton } from "primereact/radiobutton";
import { InputSwitch } from "primereact/inputswitch";
import { Slider } from "primereact/slider";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Divider } from "primereact/divider";
import { FilterItem, FilterModel } from "@/types";
import { ComponentRendererProps } from "./types";

/**
 * FiltersPanel — панель фильтров на основе Sidebar (Drawer)
 *
 * Props:
 * - value: FilterModel — массив фильтров (линкуется через @state.filters)
 * - visible: boolean — управление видимостью (линкуется через @state.filtersVisible)
 * - position: "left" | "right" | "top" | "bottom" — сторона выезда (по умолч. "right")
 * - header: string — заголовок панели
 *
 * События:
 * - onChange: вызывается с FilterModel при "Применить" или "Очистить"
 */
export function renderFiltersPanel({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const {
    value: externalFilters = [],
    visible = false,
    position = "right",
    header = "Фильтры",
  } = props;

  // Локальная копия фильтров для редактирования
  const [localFilters, setLocalFilters] = useState<FilterModel>([]);

  // При открытии — копируем внешние фильтры в локальные
  useEffect(() => {
    if (visible && externalFilters) {
      setLocalFilters(JSON.parse(JSON.stringify(externalFilters)));
    }
  }, [visible, externalFilters]);

  // Обновить значение конкретного фильтра по id
  const updateFilterValue = useCallback((filterId: string, newValue: any) => {
    setLocalFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, value: newValue } : f)),
    );
  }, []);

  // Обновить опцию в options-фильтре (checkbox group)
  const updateOptionValue = useCallback(
    (filterId: string, optionIndex: number, checked: boolean) => {
      setLocalFilters((prev) =>
        prev.map((f) => {
          if (f.id !== filterId) return f;
          const values = Array.isArray(f.value) ? [...f.value] : [];
          values[optionIndex] = checked;
          return { ...f, value: values };
        }),
      );
    },
    [],
  );

  // Применить фильтры
  const handleApply = useCallback(() => {
    handleEvent("onChange", { value: localFilters });
  }, [localFilters, handleEvent]);

  // Очистить фильтры
  const handleClear = useCallback(() => {
    const emptyFilters = localFilters.map((f) => ({ ...f, value: undefined }));
    setLocalFilters(emptyFilters);
    handleEvent("onChange", { value: emptyFilters });
  }, [localFilters, handleEvent]);

  // Рендер одного фильтра по его типу
  const renderFilterControl = (filter: FilterItem, index: number) => {
    const { id, name, type, opts, value } = filter;

    switch (type) {
      case "checkbox":
        return (
          <div key={id} className="field-checkbox flex align-items-center mb-3">
            <Checkbox
              inputId={`filter-${id}`}
              checked={!!value}
              onChange={(e) => updateFilterValue(id, e.checked ?? false)}
            />
            <label htmlFor={`filter-${id}`} className="ml-2 cursor-pointer">
              {name}
            </label>
          </div>
        );

      case "switch":
        return (
          <div key={id} className="field flex align-items-center mb-3">
            <InputSwitch
              inputId={`filter-${id}`}
              checked={!!value}
              onChange={(e) => updateFilterValue(id, e.value ?? false)}
            />
            <label htmlFor={`filter-${id}`} className="ml-2">
              {name}
            </label>
          </div>
        );

      case "range": {
        const min = Array.isArray(opts) ? (opts[0] ?? 0) : 0;
        const max = Array.isArray(opts) ? (opts[1] ?? 100) : 100;
        const rangeValue: [number, number] =
          Array.isArray(value) && value.length === 2
            ? [Number(value[0]), Number(value[1])]
            : [min, max];
        return (
          <div key={id} className="mb-3">
            <label className="block mb-2 text-200 font-medium">{name}</label>
            <Slider
              value={rangeValue}
              onChange={(e) => updateFilterValue(id, e.value)}
              range
              min={min}
              max={max}
              className="w-full"
            />
            <div className="flex justify-content-between mt-1">
              <span className="text-sm text-400">{rangeValue[0]}</span>
              <span className="text-sm text-400">{rangeValue[1]}</span>
            </div>
          </div>
        );
      }

      case "slider": {
        const min = Array.isArray(opts) ? (opts[0] ?? 0) : 0;
        const max = Array.isArray(opts) ? (opts[1] ?? 100) : 100;
        const sliderValue = typeof value === "number" ? value : min;
        return (
          <div key={id} className="mb-3">
            <label className="block mb-2 text-200 font-medium">
              {name}: {sliderValue}
            </label>
            <Slider
              value={sliderValue}
              onChange={(e) => updateFilterValue(id, e.value)}
              min={min}
              max={max}
              className="w-full"
            />
          </div>
        );
      }

      case "text":
        return (
          <div key={id} className="mb-3">
            <label className="block mb-2 text-200 font-medium">{name}</label>
            <InputText
              value={value ?? ""}
              onChange={(e) => updateFilterValue(id, e.target.value)}
              className="w-full"
            />
          </div>
        );

      case "number":
        return (
          <div key={id} className="mb-3">
            <label className="block mb-2 text-200 font-medium">{name}</label>
            <InputNumber
              value={value ?? null}
              onChange={(e) => updateFilterValue(id, e.value ?? null)}
              className="w-full"
            />
          </div>
        );

      case "date":
        return (
          <div key={id} className="mb-3">
            <label className="block mb-2 text-200 font-medium">{name}</label>
            <Calendar
              value={value || null}
              onChange={(e) => updateFilterValue(id, e.value ?? null)}
              dateFormat="dd.mm.yy"
              showIcon
              className="w-full"
            />
          </div>
        );

      case "period": {
        const periodValue = Array.isArray(value) ? value : [null, null];
        return (
          <div key={id} className="mb-3">
            <label className="block mb-2 text-200 font-medium">{name}</label>
            <div className="flex gap-2">
              <Calendar
                value={periodValue[0] || null}
                onChange={(e) =>
                  updateFilterValue(id, [e.value ?? null, periodValue[1]])
                }
                dateFormat="dd.mm.yy"
                showIcon
                placeholder="Начало"
                className="w-full"
              />
              <Calendar
                value={periodValue[1] || null}
                onChange={(e) =>
                  updateFilterValue(id, [periodValue[0], e.value ?? null])
                }
                dateFormat="dd.mm.yy"
                showIcon
                placeholder="Конец"
                className="w-full"
              />
            </div>
          </div>
        );
      }

      case "options": {
        const optionsList = Array.isArray(opts) ? opts : [];
        const selectedValues = Array.isArray(value)
          ? value
          : optionsList.map(() => false);
        return (
          <div key={id} className="mb-3">
            <label className="block mb-2 text-200 font-medium">{name}</label>
            <div className="flex flex-column gap-2">
              {optionsList.map((opt: string, i: number) => (
                <div
                  key={`${id}-${i}`}
                  className="field-checkbox flex align-items-center"
                >
                  <Checkbox
                    inputId={`filter-${id}-${i}`}
                    checked={!!selectedValues[i]}
                    onChange={(e) =>
                      updateOptionValue(id, i, e.checked ?? false)
                    }
                  />
                  <label
                    htmlFor={`filter-${id}-${i}`}
                    className="ml-2 cursor-pointer"
                  >
                    {opt}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "radio": {
        const optionsList = Array.isArray(opts) ? opts : [];
        return (
          <div key={id} className="mb-3">
            <label className="block mb-2 text-200 font-medium">{name}</label>
            <div className="flex flex-column gap-2">
              {optionsList.map((opt: string, i: number) => (
                <div
                  key={`${id}-${i}`}
                  className="field-radiobutton flex align-items-center"
                >
                  <RadioButton
                    inputId={`filter-${id}-${i}`}
                    name={`filter-${id}`}
                    value={opt}
                    checked={value === opt}
                    onChange={() => updateFilterValue(id, opt)}
                  />
                  <label
                    htmlFor={`filter-${id}-${i}`}
                    className="ml-2 cursor-pointer"
                  >
                    {opt}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default:
        return (
          <div key={id} className="mb-3">
            <p className="text-400 text-sm">
              [Filter type "{type}" not implemented]
            </p>
          </div>
        );
    }
  };

  // Вычисляем, есть ли выбранные фильтры
  const hasActiveFilters = localFilters.some((f) => {
    if (f.type === "checkbox" || f.type === "switch") return !!f.value;
    if (f.type === "options") {
      return Array.isArray(f.value) && f.value.some(Boolean);
    }
    return f.value !== undefined && f.value !== null && f.value !== "";
  });

  // Sidebar header content (appears at top of drawer)
  const sidebarHeader = (
    <div className="flex align-items-center gap-2">
      <i className="pi pi-filter" style={{ fontSize: "1.2rem" }} />
      <span className="font-medium text-lg">{header}</span>
    </div>
  );

  return (
    <Sidebar
      visible={visible}
      position={position}
      header={sidebarHeader}
      className={className || ""}
      style={style}
      onHide={() => {
        // Просто закрываем без применения — триггер via toggleProperty
        handleEvent("onHide", { value: false });
      }}
    >
      <div className="flex flex-column h-full">
        {/* Скроллируемая область с фильтрами */}
        <div className="flex-1 overflow-y-auto">
          {localFilters.map((filter, index) => (
            <React.Fragment key={filter.id}>
              {renderFilterControl(filter, index)}
              {index < localFilters.length - 1 && <Divider className="my-2" />}
            </React.Fragment>
          ))}
          {localFilters.length === 0 && (
            <p className="text-400 text-center mt-4">Нет доступных фильтров</p>
          )}
        </div>

        {/* Фиксированная нижняя панель с кнопками */}
        <div className="flex-shrink-0 border-top-1 surface-border pt-3 mt-3">
          <div className="flex gap-2">
            <Button
              label="Применить"
              icon="pi pi-check"
              onClick={handleApply}
              className="flex-1"
              severity={hasActiveFilters ? undefined : "secondary"}
              disabled={!hasActiveFilters}
            />
            <Button
              label="Очистить"
              icon="pi pi-filter-slash"
              onClick={handleClear}
              className="flex-1"
              severity="danger"
              outlined
              disabled={!hasActiveFilters}
            />
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
