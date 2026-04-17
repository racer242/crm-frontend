"use client";

import React from "react";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { InputTextarea } from "primereact/inputtextarea";
import { Password } from "primereact/password";
import { ComponentRendererProps } from "./types";

export function renderInputText({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  resolvedVisible,
  handleEvent,
}: ComponentRendererProps) {
  const defaultValue =
    resolvedValue !== undefined ? resolvedValue : (props.value ?? "");

  const inputProps = {
    ...props,
    value: defaultValue,
    disabled: resolvedDisabled ?? props.disabled,
    visible: resolvedVisible ?? props.visible,
  };

  return (
    <InputText
      {...inputProps}
      className={`field w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.target.value })}
    />
  );
}

export function renderInputNumber({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  handleEvent,
}: ComponentRendererProps) {
  const inputNumberProps = {
    ...props,
    value: resolvedValue !== undefined ? resolvedValue : (props.value ?? 0),
    disabled: resolvedDisabled ?? props.disabled,
  };

  return (
    <InputNumber
      {...inputNumberProps}
      className={`field w-full ${className || ""}`}
      style={style}
      onValueChange={(e) => handleEvent("onChange", { value: e.value })}
    />
  );
}

export function renderInputTextarea({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  handleEvent,
}: ComponentRendererProps) {
  const textareaProps = {
    ...props,
    value: resolvedValue !== undefined ? resolvedValue : (props.value ?? ""),
    disabled: resolvedDisabled ?? props.disabled,
  };

  return (
    <InputTextarea
      {...textareaProps}
      className={`field w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.target.value })}
    />
  );
}

export function renderPassword({
  props,
  className,
  style,
  resolvedValue,
  resolvedDisabled,
  handleEvent,
}: ComponentRendererProps) {
  const passwordProps = {
    ...props,
    value: resolvedValue !== undefined ? resolvedValue : (props.value ?? ""),
    disabled: resolvedDisabled ?? props.disabled,
  };

  return (
    <Password
      {...passwordProps}
      className={`field w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.target.value })}
    />
  );
}
