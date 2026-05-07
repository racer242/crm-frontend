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
  handleEvent,
}: ComponentRendererProps) {
  let dropdownValue = props.value ?? null;
  const options = props.options || [];

  // If value is a primitive (id) and options are objects with id, resolve to object
  if (
    dropdownValue !== null &&
    dropdownValue !== undefined &&
    typeof dropdownValue !== "object" &&
    Array.isArray(options) &&
    options.length > 0 &&
    typeof options[0] === "object" &&
    "id" in options[0]
  ) {
    const found = options.find((opt: any) => opt.id === dropdownValue);
    if (found) {
      dropdownValue = found;
    }
  }

  const dropdownProps = {
    ...props,
    value: dropdownValue,
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
  handleEvent,
}: ComponentRendererProps) {
  const multiSelectProps = {
    ...props,
    value: props.value ?? [],
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
  handleEvent,
}: ComponentRendererProps) {
  const autoCompleteProps = {
    ...props,
    value: props.value ?? "",
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
  handleEvent,
}: ComponentRendererProps) {
  let calendarValue: any = props.value;

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
