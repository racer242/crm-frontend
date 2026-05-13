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
  handleEvent,
}: ComponentRendererProps) {
  const inputProps = {
    ...props,
    value: props.value ?? "",
  };

  return (
    <InputText
      {...inputProps}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.target.value })}
    />
  );
}

export function renderInputNumber({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const inputNumberProps = {
    ...props,
    value: props.value ?? 0,
  };

  return (
    <InputNumber
      {...inputNumberProps}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onValueChange={(e) => handleEvent("onChange", { value: e.value })}
    />
  );
}

export function renderInputTextarea({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const textareaProps = {
    ...props,
    value: props.value ?? "",
  };

  return (
    <InputTextarea
      {...textareaProps}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.target.value })}
    />
  );
}

export function renderPassword({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  const passwordProps = {
    ...props,
    value: props.value ?? "",
  };

  return (
    <Password
      {...passwordProps}
      className={`${props?.inline ? "" : "field"} w-full ${className || ""}`}
      style={style}
      onChange={(e) => handleEvent("onChange", { value: e.target.value })}
    />
  );
}
