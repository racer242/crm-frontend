"use client";

import React from "react";
import { Card } from "primereact/card";
import { ComponentRendererProps } from "./types";

export function renderCard({
  component,
  props,
  className,
  style,
}: ComponentRendererProps) {
  return (
    <Card {...props} className={className || ""} style={style}>
      {component.state?.data}
    </Card>
  );
}
