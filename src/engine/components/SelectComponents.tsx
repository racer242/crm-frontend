"use client";

import React from "react";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { AutoComplete } from "primereact/autocomplete";
import { Calendar } from "primereact/calendar";
import { isIsoDateLike, parseDateString } from "@/utils/date";
import { ComponentRendererProps } from "./types";

export function renderDropdown({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  handleEvent,
}: ComponentRendererProps) {
  const dropdownProps = {
    ...props,
    value: resolvedValue !== undefined ? resolvedValue : (props.value ?? null),
    disabled: resolvedDisabled ?? props.disabled,
  };

  return (
    <Dropdown
      {...dropdownProps}
      className={`field w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.value })}
    />
  );
}

export function renderMultiSelect({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  handleEvent,
}: ComponentRendererProps) {
  const multiSelectProps = {
    ...props,
    value: resolvedValue !== undefined ? resolvedValue : (props.value ?? []),
    disabled: resolvedDisabled ?? props.disabled,
  };

  return (
    <MultiSelect
      {...multiSelectProps}
      className={`field w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.value })}
    />
  );
}

export function renderAutoComplete({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  handleEvent,
}: ComponentRendererProps) {
  const autoCompleteProps = {
    ...props,
    value: resolvedValue !== undefined ? resolvedValue : (props.value ?? ""),
    disabled: resolvedDisabled ?? props.disabled,
  };

  return (
    <AutoComplete
      {...autoCompleteProps}
      className={`field w-full ${className || ""}`}
      style={style}
      completeMethod={(e) => {
        const suggestions = (props.suggestions || []).filter((s: string) =>
          s.toLowerCase().includes(e.query.toLowerCase()),
        );
      }}
      onChange={(e) => handleEvent("onChange", { value: e.value })}
    />
  );
}

export function renderCalendar({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  handleEvent,
}: ComponentRendererProps) {
  let calendarValue: any =
    resolvedValue !== undefined ? resolvedValue : props.value;

  if (typeof calendarValue === "string" && calendarValue.trim() !== "") {
    const parsedDate = parseDateString(calendarValue);
    if (parsedDate) {
      calendarValue = parsedDate;
    } else if (isIsoDateLike(calendarValue)) {
      const date = new Date(calendarValue);
      if (!isNaN(date.getTime())) {
        calendarValue = date;
      }
    }
  }

  const dateFormat = props.dateFormat || "dd.mm.yy";

  const calendarProps = {
    ...props,
    value: calendarValue,
    disabled: resolvedDisabled ?? props.disabled,
    dateFormat,
  };

  return (
    <Calendar
      {...calendarProps}
      className={`field w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.value })}
    />
  );
}
