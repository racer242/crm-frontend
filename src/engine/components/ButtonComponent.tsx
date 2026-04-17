"use client";

import React from "react";
import { Button } from "primereact/button";
import { ComponentRendererProps } from "./types";

export function renderButton({
  props,
  className,
  style,
  handleEvent,
}: ComponentRendererProps) {
  return (
    <Button
      {...props}
      className={className || ""}
      style={style}
      onClick={(e) => handleEvent("onClick", e)}
    />
  );
}
