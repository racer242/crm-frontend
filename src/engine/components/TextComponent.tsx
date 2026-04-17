"use client";

import React from "react";
import { ComponentRendererProps } from "./types";

export function renderText({
  component,
  props,
  className,
  style,
  resolvedValue,
}: ComponentRendererProps) {
  const level = props.level as number | undefined;
  const value =
    resolvedValue !== undefined ? resolvedValue : (props.value as string);

  if (level === 1)
    return (
      <h1 className={className || ""} style={style}>
        {value}
      </h1>
    );
  if (level === 2)
    return (
      <h2 className={className || ""} style={style}>
        {value}
      </h2>
    );
  if (level === 3)
    return (
      <h3 className={className || ""} style={style}>
        {value}
      </h3>
    );
  return (
    <p className={className || ""} style={style}>
      {value}
    </p>
  );
}
